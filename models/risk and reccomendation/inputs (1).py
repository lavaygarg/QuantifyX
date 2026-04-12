"""
risk_engine/inputs.py
─────────────────────
Bridges two data sources into normalized [-1, 1] scores:

  SOURCE 1 — Prediction  : prediction_service.py  (runs locally in same backend)
  SOURCE 2 — Sentiment   : https://sentiment-api-6qy2.onrender.com  (external API)

Both sources expose 6 buttons:
    fetch_xxx_single(symbol)  →  Buttons 1-5  (one company)
    fetch_xxx_all()           →  Button  6    (all 5 at once)
"""

from __future__ import annotations

import os
import math
import requests
from functools import lru_cache

# ── prediction_service lives in the same backend package ──────────────────────
from prediction_service import generate_prediction, PredictionRequest, SUPPORTED_TICKERS

SYMBOLS  = ["AAPL", "TSLA", "MSFT", "AMZN", "GOOGL"]
SENT_URL = os.getenv("SENTIMENT_API_URL", "https://sentiment-api-6qy2.onrender.com")

# Default budget used purely for scoring — not a real trade
_SCORE_BUDGET = 10_000.0

_FALLBACK_SENT = {"sentiment_score":  0.0, "sentiment_label": "neutral",  "confidence": 0.0}
_FALLBACK_PRED = {"prediction_score": 0.0, "prediction_label": "neutral",  "confidence": 0.0}


# ─────────────────────────────────────────────────────────────────────────────
#  HELPER — normalize net_pnl_percent → [-1, 1]
# ─────────────────────────────────────────────────────────────────────────────

def _normalize_pnl(net_pnl_percent: float) -> float:
    """
    Maps any profit/loss % to a clean [-1, 1] score using tanh.
    Scaling factor 15 means ±15% profit ≈ ±0.76 (strong signal).

    Examples:
        +20% → +0.83   (very bullish)
        +5%  → +0.32   (mildly bullish)
         0%  →  0.0    (neutral)
        -10% → -0.58   (bearish)
        -20% → -0.83   (very bearish)
    """
    return round(math.tanh(net_pnl_percent / 15.0), 4)


def _label_from_score(score: float, mode: str = "prediction") -> str:
    if mode == "prediction":
        if score > 0.2:  return "bullish"
        if score < -0.2: return "bearish"
        return "neutral"
    else:
        if score > 0.05:  return "positive"
        if score < -0.05: return "negative"
        return "neutral"


# ═══════════════════════════════════════════════════════════════════════════════
#  PREDICTION  —  6 buttons
#  Source: prediction_service.generate_prediction()  (local, same process)
# ═══════════════════════════════════════════════════════════════════════════════

@lru_cache(maxsize=32)
def _raw_prediction(ticker: str) -> dict:
    """
    Calls generate_prediction() once per ticker and caches result.
    Uses _SCORE_BUDGET as a dummy budget — we only care about net_pnl_percent.
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
    Buttons 1–5 : prediction for ONE company.

    Returns:
        {
            "prediction_score":  0.32,       ← normalized [-1, 1]
            "prediction_label":  "bullish",
            "confidence":        0.32,
            "net_pnl_percent":   5.0,        ← raw % from model
            "strategy":          "..."        ← model's strategy text
        }
    """
    symbol = symbol.upper()
    try:
        raw    = _raw_prediction(symbol)
        pnl    = float(raw["summary"]["net_pnl_percent"])
        score  = _normalize_pnl(pnl)
        label  = _label_from_score(score, "prediction")
        return {
            "prediction_score": score,
            "prediction_label": label,
            "confidence":       abs(score),
            "net_pnl_percent":  round(pnl, 2),
            "strategy":         raw["summary"].get("strategy", ""),
        }
    except Exception as e:
        print(f"[PREDICTION] Error fetching {symbol}: {e}")
        return _FALLBACK_PRED.copy()


def fetch_prediction_all() -> dict:
    """
    Button 6 : prediction for ALL 5 companies at once.

    Returns:
        {
            "AAPL":  { "prediction_score": 0.32,  "prediction_label": "bullish",  ... },
            "TSLA":  { "prediction_score": -0.58, "prediction_label": "bearish",  ... },
            ...
        }
    """
    return {sym: fetch_prediction_single(sym) for sym in SYMBOLS}


def clear_prediction_cache():
    """Call this to force fresh predictions on next request."""
    _raw_prediction.cache_clear()


# ═══════════════════════════════════════════════════════════════════════════════
#  SENTIMENT  —  6 buttons
#  Source: https://sentiment-api-6qy2.onrender.com  (external Render API)
# ═══════════════════════════════════════════════════════════════════════════════

def fetch_sentiment_single(symbol: str) -> dict:
    """
    Buttons 1–5 : sentiment for ONE company.
    Calls → GET /sentiment/{symbol}

    Returns:
        {
            "sentiment_score":  0.21,
            "sentiment_label":  "positive",
            "confidence":       0.21
        }
    """
    symbol = symbol.upper()
    try:
        resp = requests.get(f"{SENT_URL}/sentiment/{symbol}", timeout=10)
        resp.raise_for_status()
        d = resp.json()
        return {
            "sentiment_score": float(d.get("sentiment_score", 0.0)),
            "sentiment_label": d.get("sentiment_label", "neutral"),
            "confidence":      float(d.get("confidence", 0.0)),
        }
    except Exception as e:
        print(f"[SENTIMENT] Error fetching {symbol}: {e}")
        return _FALLBACK_SENT.copy()


def fetch_sentiment_all() -> dict:
    """
    Button 6 : sentiment for ALL 5 companies at once.
    Calls → GET /sentiment-multiple

    Returns:
        {
            "AAPL":  { "sentiment_score": 0.21,  "sentiment_label": "positive", "confidence": 0.21 },
            "TSLA":  { "sentiment_score": -0.08, "sentiment_label": "negative", "confidence": 0.08 },
            ...
        }
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
            }
            for sym, info in raw.items()
        }
    except Exception as e:
        print(f"[SENTIMENT] Error fetching all: {e}")
        return {s: _FALLBACK_SENT.copy() for s in SYMBOLS}
