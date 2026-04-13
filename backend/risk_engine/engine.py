"""
risk_engine/engine.py
─────────────────────
Core computation pipeline:
    prediction_score + sentiment_score
        → confidence → risk → signal → strength → recommendation
"""

from __future__ import annotations
from risk_engine.inputs import (
    SYMBOLS,
    fetch_prediction_single, fetch_prediction_all,
    fetch_sentiment_single,  fetch_sentiment_all,
    clear_prediction_cache,
)

# module-level cache (cleared via /risk/reset endpoint)
_engine_cache: dict | None = None


# ═══════════════════════════════════════════════════════════════════════════════
#  COMPUTATION STEPS
# ═══════════════════════════════════════════════════════════════════════════════

def _confidence(pred: float, sent: float) -> float:
    return round((abs(pred) + (1 - abs(pred - sent) / 2)) / 2, 4)

def _risk(pred: float, sent: float, conf: float) -> float:
    return round(min(100.0, (1 - conf) * 40 + abs(pred - sent) * 30 + abs(pred) * (1 - abs(sent)) * 30), 2)

def _signal(pred: float, sent: float) -> float:
    return round(max(-50.0, min(50.0, pred * 30 + sent * 20)), 2)

def _strength(signal: float, risk: float) -> float:
    return round(signal - risk * 0.5, 2)

def _recommendation(signal: float, risk: float) -> tuple[str, str]:
    if signal > 20 and risk < 35:  return "🟢 STRONG BUY",  "High signal + low risk"
    if signal > 10:                return "🟡 BUY",          "Positive opportunity"
    if signal < -20:               return "🔴 STRONG SELL",  "Very negative outlook"
    if signal < -10:               return "🟠 SELL",         "Negative trend"
    return                                "⚪ HOLD",         "Uncertain / balanced"


def _compute_one(pred_data: dict, sent_data: dict) -> dict:
    pred = float(pred_data["prediction_score"])
    sent = float(sent_data["sentiment_score"])

    conf   = _confidence(pred, sent)
    risk   = _risk(pred, sent, conf)
    sig    = _signal(pred, sent)
    stren  = _strength(sig, risk)
    rec, reason = _recommendation(sig, risk)

    return {
        "prediction_score":  pred,
        "sentiment_score":   sent,
        "confidence":        conf,
        "risk_score":        risk,
        "signal_score":      sig,
        "final_strength":    stren,
        "recommendation":    rec,
        "reason":            reason,
        # pass-through extras from prediction model
        "net_pnl_percent":   pred_data.get("net_pnl_percent", 0.0),
        "strategy":          pred_data.get("strategy", ""),
    }


# ═══════════════════════════════════════════════════════════════════════════════
#  INPUT SECTION A — SENTIMENT  (6 buttons)
# ═══════════════════════════════════════════════════════════════════════════════

def get_sentiment_input(symbol: str | None = None) -> dict:
    """
    symbol=None  →  Button 6 (all 5 at once)
    symbol="AAPL"→  Button 1 (single)
    """
    if symbol:
        data = fetch_sentiment_single(symbol.upper())
        return {symbol.upper(): data}
    return fetch_sentiment_all()


# ═══════════════════════════════════════════════════════════════════════════════
#  INPUT SECTION B — PREDICTION  (6 buttons)
# ═══════════════════════════════════════════════════════════════════════════════

def get_prediction_input(symbol: str | None = None) -> dict:
    """
    symbol=None  →  Button 6 (all 5 at once)
    symbol="AAPL"→  Button 1 (single)
    """
    if symbol:
        data = fetch_prediction_single(symbol.upper())
        return {symbol.upper(): data}
    return fetch_prediction_all()


# ═══════════════════════════════════════════════════════════════════════════════
#  FULL ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

def run_engine_all() -> dict:
    """Runs full pipeline for all 5 stocks. Cached after first call."""
    global _engine_cache
    if _engine_cache is not None:
        return _engine_cache

    sent_data = fetch_sentiment_all()
    pred_data = fetch_prediction_all()

    results = {}
    for sym in SYMBOLS:
        if sym in sent_data and sym in pred_data:
            results[sym] = _compute_one(pred_data[sym], sent_data[sym])

    _engine_cache = results
    return results


def run_engine_single(symbol: str) -> dict:
    """Runs full pipeline for ONE stock (fresh fetch, no cache)."""
    symbol    = symbol.upper()
    sent_data = fetch_sentiment_single(symbol)
    pred_data = fetch_prediction_single(symbol)
    return _compute_one(pred_data, sent_data)


def reset_cache():
    """Clear module-level cache + prediction LRU cache."""
    global _engine_cache
    _engine_cache = None
    clear_prediction_cache()


# ═══════════════════════════════════════════════════════════════════════════════
#  OUTPUT FORMATTERS  (called by API routes)
# ═══════════════════════════════════════════════════════════════════════════════

def get_company_output(symbol: str) -> dict:
    """Structured output for one company — used by /risk/company/{symbol}"""
    symbol = symbol.upper()
    s = run_engine_single(symbol)
    return {
        "company": symbol,
        "inputs": {
            "prediction_score": s["prediction_score"],
            "sentiment_score":  s["sentiment_score"],
            "confidence":       s["confidence"],
            "net_pnl_percent":  s["net_pnl_percent"],
        },
        "scores": {
            "risk_score":     s["risk_score"],
            "signal_score":   s["signal_score"],
            "final_strength": s["final_strength"],
        },
        "recommendation": {
            "action": s["recommendation"],
            "reason": s["reason"],
            "strategy": s["strategy"],
        },
    }


def get_top3() -> dict:
    """Top 3 picks by final_strength with % portfolio allocation."""
    data     = run_engine_all()
    positive = [(k, v) for k, v in data.items() if v["final_strength"] > 0]

    if not positive:
        return {
            "message":         "🔴 All stocks negative — SELL / DO NOT BUY",
            "recommendations": []
        }

    positive.sort(key=lambda x: x[1]["final_strength"], reverse=True)
    top3   = positive[:3]
    total  = sum(v["final_strength"] for _, v in top3)

    return {
        "message": "🟢 TOP 3 RECOMMENDATIONS",
        "recommendations": [
            {
                "company":            sym,
                "recommendation":     v["recommendation"],
                "final_strength":     v["final_strength"],
                "risk_score":         v["risk_score"],
                "signal_score":       v["signal_score"],
                "allocation_percent": round(v["final_strength"] / total * 100, 2),
                "strategy":           v["strategy"],
            }
            for sym, v in top3
        ]
    }
