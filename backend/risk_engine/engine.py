"""
risk_engine/engine.py
─────────────────────
FIXES vs previous version:
  BUG 1 — _strength() additive  → multiplicative  (sign never flips)
  BUG 2 — _recommendation() used raw signal → now uses final_strength
  BUG 5 — sentiment 0.0 silently treated as neutral → flagged + reasoning overridden
  BUG 6 — _confidence() returned 0.5 on double-fallback → now returns 0.0
"""

from __future__ import annotations
from risk_engine.inputs import (
    SYMBOLS,
    fetch_prediction_single, fetch_prediction_all,
    fetch_sentiment_single,  fetch_sentiment_all,
    clear_prediction_cache,
)

_engine_cache: dict | None = None


# ═══════════════════════════════════════════════════════════════════════════════
#  COMPUTATION STEPS
# ═══════════════════════════════════════════════════════════════════════════════

def _confidence(pred: float, sent: float,
                pred_missing: bool = False, sent_missing: bool = False) -> float:
    """
    FIX BUG 6:
      Both missing  → 0.0   (we know nothing)
      One missing   → cap at 0.4  (half-blind)
      Both present  → normal formula
    """
    if pred_missing and sent_missing:
        return 0.0
    raw = round((abs(pred) + (1 - abs(pred - sent) / 2)) / 2, 4)
    if pred_missing or sent_missing:
        return round(min(raw, 0.4), 4)
    return raw


def _risk(pred: float, sent: float, conf: float) -> float:
    return round(min(100.0,
        (1 - conf) * 40
        + abs(pred - sent) * 30
        + abs(pred) * (1 - abs(sent)) * 30
    ), 2)


def _signal(pred: float, sent: float) -> float:
    return round(max(-50.0, min(50.0, pred * 30 + sent * 20)), 2)


def _strength(signal: float, risk: float) -> float:
    """
    FIX BUG 1:
      OLD: signal - (risk × 0.5)    → risk can flip sign of signal ❌
      NEW: signal × (1 - risk/100)  → risk only dampens, never flips ✅

    Example (AMZN from screenshot):
      signal=11.5, risk=39.2
      OLD: 11.5 - 19.6 = -8.1   (negative! but signal was positive)
      NEW: 11.5 × 0.608 = +6.99  (positive, just cautious)
    """
    return round(signal * (1 - risk / 100), 2)


def _recommendation(strength: float, risk: float) -> tuple[str, str]:
    """
    FIX BUG 2:
      OLD: used raw signal → gave BUY even when strength < 0
      NEW: uses final_strength → single source of truth
    """
    if strength > 15 and risk < 35:  return "🟢 STRONG BUY",  "High signal + low risk"
    if strength > 5:                 return "🟡 BUY",          "Positive opportunity"
    if strength < -15:               return "🔴 STRONG SELL",  "Very negative outlook"
    if strength < -5:                return "🟠 SELL",         "Negative trend"
    return                                  "⚪ HOLD",         "Uncertain / balanced"


def _smart_reasoning(signal: float, risk: float, strength: float,
                     sent_missing: bool, pred_missing: bool,
                     base_strategy: str) -> str:
    """
    FIX BUG 5:
      OLD: just passed through prediction_service strategy text blindly
      NEW: overrides text based on actual risk + missing data context
    """
    warnings = []
    if sent_missing:
        warnings.append("⚠️ Sentiment data unavailable — risk is elevated")
    if pred_missing:
        warnings.append("⚠️ Prediction data unavailable — signal unreliable")
    warn_str = " | ".join(warnings)

    # Both sources missing
    if pred_missing and sent_missing:
        return "❌ No data available. Cannot make a recommendation."

    # Risk too high regardless of signal
    if risk > 60:
        msg = f"🔴 Risk ({risk}) is critically high. Do not allocate capital. Wait for risk < 40."
        return msg + (f" | {warn_str}" if warn_str else "")

    # Signal positive but strength still ≤ 0 (risk eating the signal)
    if signal > 0 and strength <= 0:
        msg = f"⚠️ Signal is positive but risk ({risk}) is too high to act. Hold and monitor."
        return msg + (f" | {warn_str}" if warn_str else "")

    # Risk moderate — soften "aggressive" language
    if risk > 35 and "aggressively" in base_strategy:
        base_strategy = base_strategy.replace(
            "Allocate capital aggressively",
            "Allocate capital cautiously — risk is moderate"
        )

    return base_strategy + (f" | {warn_str}" if warn_str else "")


# ═══════════════════════════════════════════════════════════════════════════════
#  CORE PIPELINE
# ═══════════════════════════════════════════════════════════════════════════════

def _compute_one(pred_data: dict, sent_data: dict) -> dict:
    pred = float(pred_data["prediction_score"])
    sent = float(sent_data["sentiment_score"])

    pred_missing = pred_data.get("is_missing", False)
    sent_missing = sent_data.get("is_missing", False)

    conf  = _confidence(pred, sent, pred_missing, sent_missing)
    risk  = _risk(pred, sent, conf)
    sig   = _signal(pred, sent)
    stren = _strength(sig, risk)
    rec, reason = _recommendation(stren, risk)

    strategy = _smart_reasoning(
        sig, risk, stren,
        sent_missing, pred_missing,
        pred_data.get("strategy", "")
    )

    return {
        "prediction_score": pred,
        "sentiment_score":  sent,
        "confidence":       conf,
        "risk_score":       risk,
        "signal_score":     sig,
        "final_strength":   stren,
        "recommendation":   rec,
        "reason":           reason,
        "strategy":         strategy,
        "net_pnl_percent":  pred_data.get("net_pnl_percent", 0.0),
        "warnings": {
            "sentiment_missing":  sent_missing,
            "prediction_missing": pred_missing,
        },
    }


# ═══════════════════════════════════════════════════════════════════════════════
#  INPUT GETTERS  (6 buttons each)
# ═══════════════════════════════════════════════════════════════════════════════

def get_sentiment_input(symbol: str | None = None) -> dict:
    if symbol:
        return {symbol.upper(): fetch_sentiment_single(symbol.upper())}
    return fetch_sentiment_all()


def get_prediction_input(symbol: str | None = None) -> dict:
    if symbol:
        return {symbol.upper(): fetch_prediction_single(symbol.upper())}
    return fetch_prediction_all()


# ═══════════════════════════════════════════════════════════════════════════════
#  ENGINE RUNNERS
# ═══════════════════════════════════════════════════════════════════════════════

def run_engine_all() -> dict:
    global _engine_cache
    if _engine_cache is not None:
        return _engine_cache
    sent_data = fetch_sentiment_all()
    pred_data = fetch_prediction_all()
    results   = {
        sym: _compute_one(pred_data[sym], sent_data[sym])
        for sym in SYMBOLS
        if sym in sent_data and sym in pred_data
    }
    _engine_cache = results
    return results


def run_engine_single(symbol: str) -> dict:
    symbol = symbol.upper()
    return _compute_one(
        fetch_prediction_single(symbol),
        fetch_sentiment_single(symbol)
    )


def reset_cache():
    global _engine_cache
    _engine_cache = None
    clear_prediction_cache()


# ═══════════════════════════════════════════════════════════════════════════════
#  OUTPUT FORMATTERS
# ═══════════════════════════════════════════════════════════════════════════════

def get_company_output(symbol: str) -> dict:
    s = run_engine_single(symbol.upper())
    return {
        "company": symbol.upper(),
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
            "action":   s["recommendation"],
            "reason":   s["reason"],
            "strategy": s["strategy"],
        },
        "warnings": s["warnings"],
    }


def get_top3() -> dict:
    data     = run_engine_all()
    positive = [(k, v) for k, v in data.items() if v["final_strength"] > 0]

    if not positive:
        return {"message": "🔴 All stocks negative — SELL / DO NOT BUY", "recommendations": []}

    positive.sort(key=lambda x: x[1]["final_strength"], reverse=True)
    top3  = positive[:3]
    total = sum(v["final_strength"] for _, v in top3)

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
                "warnings":           v["warnings"],
            }
            for sym, v in top3
        ],
    }
