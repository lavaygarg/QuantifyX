"""
risk_engine/inputs.py
─────────────────────
FIXES vs previous version:
  BUG 3 — Fallback dict missing 'net_pnl_percent' and 'strategy' keys → added
  BUG 4 — @lru_cache on function that takes unhashable PredictionRequest → fixed
           Cache now keyed on ticker string only (hashable)
"""

from __future__ import annotations

import os
import math
import requests
from functools import lru_cache

from prediction_service import generate_prediction, PredictionRequest

SYMBOLS   = ["AAPL", "TSLA", "MSFT", "AMZN", "GOOGL"]
SENT_URL  = os.getenv("SENTIMENT_API_URL", "https://sentiment-api-6qy2.onrender.com")
SENTINEL_MISSING = True    # exported so engine.py can import it if needed

_SCORE_BUDGET = 10_000.0

# FIX BUG 3: fallbacks now include ALL keys that engine.py expects
_FALLBACK_SENT = {
    "sentiment_score":  0.0,
    "sentiment_label":  "neutral",
    "confidence":       0.0,
    "is_missing":       True,    # ← sentinel flag so engine knows this is fallback
}
_FALLBACK_PRED = {
    "prediction_score": 0.0,
    "prediction_label": "neutral",
    "confidence":       0.0,
    "net_pnl_percent":  0.0,     # ← was missing before
    "strategy":         "",      # ← was missing before
    "is_missing":       True,    # ← sentinel flag
}


# ─────────────────────────────────────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _normalize_pnl(net_pnl_percent: float) -> float:
    """
    net_pnl_percent → [-1, 1] via tanh.
    Scaling factor 15 → ±15% profit ≈ ±0.76 (strong signal).

    +20% → +0.83  |  +5% → +0.32  |  0% → 0.0  |  -10% → -0.58
    """
    return round(math.tanh(net_pnl_percent / 15.0), 4)


def _pred_label(score: float) -> str:
    if score > 0.2:  return "bullish"
    if score < -0.2: return "bearish"
    return "neutral"


def _sent_label(score: float) -> str:
    if score > 0.05:  return "positive"
    if score < -0.05: return "negative"
    return "neutral"


# ═══════════════════════════════════════════════════════════════════════════════
#  PREDICTION  —  6 buttons
# ═══════════════════════════════════════════════════════════════════════════════

@lru_cache(maxsize=32)
def _raw_prediction(ticker: str) -> dict:
    """
    FIX BUG 4:
      OLD: @lru_cache on a function taking PredictionRequest (unhashable dataclass)
           → TypeError: unhashable type at runtime

      NEW: Cache is keyed on ticker STRING (hashable ✅).
           PredictionRequest is constructed INSIDE this function.
    """
    request = PredictionRequest(
        ticker=ticker,
        budget=_SCORE_BUDGET,
        max_transactions=3,
        cooldown=1,
        fee_per_trade=1.0,
    )
    return generate_prediction(request)


def fetch_prediction_single(symbol: str) -> dict:
    """
    Buttons 1–5: prediction for ONE company.

    Returns:
        {
            "prediction_score": 0.32,
            "prediction_label": "bullish",
            "confidence":       0.32,
            "net_pnl_percent":  5.0,
            "strategy":         "...",
            "is_missing":       False
        }
    """
    symbol = symbol.upper()
    try:
        raw   = _raw_prediction(symbol)
        pnl   = float(raw["summary"]["net_pnl_percent"])
        score = _normalize_pnl(pnl)
        return {
            "prediction_score": score,
            "prediction_label": _pred_label(score),
            "confidence":       abs(score),
            "net_pnl_percent":  round(pnl, 2),
            "strategy":         raw["summary"].get("strategy", ""),
            "is_missing":       False,
        }
    except Exception as e:
        print(f"[PREDICTION] Error fetching {symbol}: {e}")
        return _FALLBACK_PRED.copy()


def fetch_prediction_all() -> dict:
    """Button 6: prediction for ALL 5 companies at once."""
    return {sym: fetch_prediction_single(sym) for sym in SYMBOLS}


def clear_prediction_cache():
    _raw_prediction.cache_clear()


# ═══════════════════════════════════════════════════════════════════════════════
#  SENTIMENT  —  6 buttons
# ═══════════════════════════════════════════════════════════════════════════════

def fetch_sentiment_single(symbol: str) -> dict:
    """
    Buttons 1–5: sentiment for ONE company.
    Calls → GET /sentiment/{symbol}

    Returns:
        {
            "sentiment_score":  0.21,
            "sentiment_label":  "positive",
            "confidence":       0.21,
            "is_missing":       False
        }
    """
    symbol = symbol.upper()
    try:
        resp = requests.get(f"{SENT_URL}/sentiment/{symbol}", timeout=10)
        resp.raise_for_status()
        d = resp.json()
        score = float(d.get("sentiment_score", 0.0))
        return {
            "sentiment_score": score,
            "sentiment_label": d.get("sentiment_label", _sent_label(score)),
            "confidence":      float(d.get("confidence", 0.0)),
            "is_missing":      False,
        }
    except Exception as e:
        print(f"[SENTIMENT] Error fetching {symbol}: {e}")
        return _FALLBACK_SENT.copy()


def fetch_sentiment_all() -> dict:
    """
    Button 6: sentiment for ALL 5 companies at once.
    Calls → GET /sentiment-multiple
    """
    try:
        resp = requests.get(f"{SENT_URL}/sentiment-multiple", timeout=15)
        resp.raise_for_status()
        raw = resp.json()
        return {
            sym.upper(): {
                "sentiment_score": float(info.get("sentiment_score", 0.0)),
                "sentiment_label": info.get("sentiment_label", "neutral"),
                "confidence":      float(info.get("confidence", 0.0)),
                "is_missing":      False,
            }
            for sym, info in raw.items()
        }
    except Exception as e:
        print(f"[SENTIMENT] Error fetching all: {e}")
        return {s: _FALLBACK_SENT.copy() for s in SYMBOLS}
