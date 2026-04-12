# Risk Engine Integration — Handover Guide
## What to do (5 steps, ~10 minutes)

---

### Step 1 — Copy the `risk_engine/` folder into `backend/`

```
backend/
├── risk_engine/          ← copy this entire folder here
│   ├── __init__.py
│   ├── inputs.py
│   └── engine.py
├── main.py               ← existing file, we add routes to it
├── prediction_service.py ← existing, untouched
└── ...
```

---

### Step 2 — Add to `backend/requirements.txt`

```
requests==2.31.0
python-dotenv==1.0.1
```

---

### Step 3 — Add `SENTIMENT_API_URL` to your `.env`

```env
SENTIMENT_API_URL=https://sentiment-api-6qy2.onrender.com
```

---

### Step 4 — Edit `backend/main.py`

**4a. Add imports** (at the top, after existing imports):
```python
from risk_engine.engine import (
    get_sentiment_input,
    get_prediction_input,
    get_company_output,
    run_engine_all,
    get_top3,
    reset_cache,
)
```

**4b. Add routes** (paste anywhere in main.py — see `main_additions.py` for full route code):
```
GET /risk/inputs/sentiment/{symbol}   ← Button 1-5 (sentiment)
GET /risk/inputs/sentiment-all        ← Button 6   (sentiment)
GET /risk/inputs/prediction/{symbol}  ← Button 1-5 (prediction)
GET /risk/inputs/prediction-all       ← Button 6   (prediction)
GET /risk/company/{symbol}            ← full analysis, single stock
GET /risk/all                         ← full analysis, all 5 stocks
GET /risk/top3                        ← top 3 picks + allocation %
GET /risk/reset                       ← clear cache
```

---

### Step 5 — Test it

```bash
cd backend
uvicorn main:app --reload --port 8000
```

Open: http://localhost:8000/docs

You should see all `/risk/*` endpoints listed in Swagger UI.

Quick test:
```bash
curl http://localhost:8000/risk/inputs/sentiment/AAPL
curl http://localhost:8000/risk/inputs/prediction/AAPL
curl http://localhost:8000/risk/top3
```

---

## What each endpoint returns

### `/risk/company/AAPL`
```json
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
    "strategy": "Moderate profitability. Execute selective swing-trades..."
  }
}
```

### `/risk/top3`
```json
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
      "strategy":           "Strong uptrend expected..."
    }
  ]
}
```

---

## How prediction_score is derived from prediction_service.py

The prediction model returns `net_pnl_percent` (e.g. +5.0%).
We normalize it to [-1, 1] using:

```
prediction_score = tanh(net_pnl_percent / 15)
```

| net_pnl_percent | prediction_score | label   |
|-----------------|-----------------|---------|
| +20%            | +0.83           | bullish |
| +5%             | +0.32           | bullish |
| 0%              | 0.0             | neutral |
| -10%            | -0.58           | bearish |

**We never touch prediction_service.py — it runs as-is.**

---

## Nothing is broken in the existing codebase

- `prediction_service.py` → untouched
- `alpaca_service.py`     → untouched
- `database.py`           → untouched
- `main.py`               → only NEW routes added, nothing removed
- All existing frontend API calls continue to work
