"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PASTE THIS BLOCK INTO backend/main.py
  ─────────────────────────────────────
  Step 1: Add these imports at the TOP of main.py (after existing imports)
  Step 2: Add these routes ANYWHERE in main.py (before the last line)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

# ── STEP 1: Add these imports at the top of main.py ──────────────────────────

from risk_engine.engine import (
    get_sentiment_input,
    get_prediction_input,
    get_company_output,
    run_engine_all,
    get_top3,
    reset_cache,
)

# ── STEP 2: Paste these routes into main.py ───────────────────────────────────


# ─────────────────────────────────────────────────────────────────────────────
#  RISK ENGINE — SENTIMENT INPUTS  (6 buttons)
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/risk/inputs/sentiment/{symbol}")
async def risk_sentiment_single(symbol: str):
    """
    Button 1 → /risk/inputs/sentiment/AAPL
    Button 2 → /risk/inputs/sentiment/TSLA
    Button 3 → /risk/inputs/sentiment/MSFT
    Button 4 → /risk/inputs/sentiment/AMZN
    Button 5 → /risk/inputs/sentiment/GOOGL

    Response:
    {
        "AAPL": {
            "sentiment_score":  0.21,
            "sentiment_label":  "positive",
            "confidence":       0.21
        }
    }
    """
    return get_sentiment_input(symbol.upper())


@app.get("/risk/inputs/sentiment-all")
async def risk_sentiment_all():
    """
    Button 6 → /risk/inputs/sentiment-all  (all 5 at once)

    Response:
    {
        "AAPL":  { "sentiment_score": 0.21,  "sentiment_label": "positive", "confidence": 0.21 },
        "TSLA":  { "sentiment_score": -0.08, "sentiment_label": "negative", "confidence": 0.08 },
        "MSFT":  { "sentiment_score": 0.14,  "sentiment_label": "positive", "confidence": 0.14 },
        "AMZN":  { "sentiment_score": 0.03,  "sentiment_label": "neutral",  "confidence": 0.03 },
        "GOOGL": { "sentiment_score": 0.11,  "sentiment_label": "positive", "confidence": 0.11 }
    }
    """
    return get_sentiment_input()


# ─────────────────────────────────────────────────────────────────────────────
#  RISK ENGINE — PREDICTION INPUTS  (6 buttons)
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/risk/inputs/prediction/{symbol}")
async def risk_prediction_single(symbol: str):
    """
    Button 1 → /risk/inputs/prediction/AAPL
    Button 2 → /risk/inputs/prediction/TSLA
    Button 3 → /risk/inputs/prediction/MSFT
    Button 4 → /risk/inputs/prediction/AMZN
    Button 5 → /risk/inputs/prediction/GOOGL

    Response:
    {
        "AAPL": {
            "prediction_score": 0.32,      ← normalized from net_pnl_percent
            "prediction_label": "bullish",
            "confidence":       0.32,
            "net_pnl_percent":  5.0,       ← raw % from XGBoost model
            "strategy":         "Strong uptrend expected..."
        }
    }
    """
    return get_prediction_input(symbol.upper())


@app.get("/risk/inputs/prediction-all")
async def risk_prediction_all():
    """
    Button 6 → /risk/inputs/prediction-all  (all 5 at once)
    """
    return get_prediction_input()


# ─────────────────────────────────────────────────────────────────────────────
#  RISK ENGINE — COMPUTED OUTPUTS
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/risk/company/{symbol}")
async def risk_company(symbol: str):
    """
    Full risk analysis for ONE company (fresh fetch).

    Response:
    {
        "company": "AAPL",
        "inputs": {
            "prediction_score": 0.32,
            "sentiment_score":  0.21,
            "confidence":       0.71,
            "net_pnl_percent":  5.0
        },
        "scores": {
            "risk_score":     22.4,
            "signal_score":   13.8,
            "final_strength": 2.6
        },
        "recommendation": {
            "action":   "🟡 BUY",
            "reason":   "Positive opportunity",
            "strategy": "Strong uptrend expected..."
        }
    }
    """
    return get_company_output(symbol.upper())


@app.get("/risk/all")
async def risk_all():
    """Full risk analysis for all 5 companies (cached)."""
    return run_engine_all()


@app.get("/risk/top3")
async def risk_top3():
    """
    Top 3 stocks by final_strength + portfolio % allocation.

    Response:
    {
        "message": "🟢 TOP 3 RECOMMENDATIONS",
        "recommendations": [
            {
                "company":            "AAPL",
                "recommendation":     "🟢 STRONG BUY",
                "final_strength":     16.6,
                "risk_score":         18.4,
                "signal_score":       25.8,
                "allocation_percent": 45.2,
                "strategy":           "Strong uptrend..."
            },
            ...
        ]
    }
    """
    return get_top3()


@app.get("/risk/reset")
async def risk_reset():
    """Clears engine cache + prediction LRU cache. Forces fresh data on next call."""
    reset_cache()
    return {"message": "Risk engine cache cleared ✅"}
