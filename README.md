# QuantifyX — Smart Trading Platform

QuantifyX is a full-stack trading and portfolio platform that combines a modern Next.js dashboard, a FastAPI trading engine, ML-based forecasting, and risk/sentiment intelligence into one production-ready workflow.

## 🌐 Live Deployment

- Frontend: https://quantifyx.onrender.com
- Backend: https://quantifyx-backend.onrender.com

---

## 🚀 Key Features

### 🖥️ Next.js Fullstack Dashboard
- **Interactive Workspace Tabs:** Trading, Holdings, Watchlist, Transactions, ML Prediction, and Risk & Sentiment.
- **Candlestick + Portfolio Charts:** ApexCharts and Recharts powered visual analytics.
- **Authentication:** Credential login with NextAuth + Prisma adapter.
- **Wallet Flow:** Razorpay order + signature verification API routes.
- **Modern UI:** Tailwind CSS + Lucide icons with responsive dashboard patterns.
- **User Portfolio Operations:** Add/remove watchlist symbols, review holdings, and inspect transaction history in a single unified dashboard.
- **Server API Proxy Layer:** Next.js API routes proxy backend operations (`/api/trade`, `/api/predictions`, `/api/risk/*`) for cleaner frontend integration.
- **Production-grade UX:** Loading states, error states, and modular panels for trading and model outputs.

### ⚙️ FastAPI Trading Engine
- **Trade Execution:** Alpaca paper-trade order flow with validation and ledger updates.
- **Market Data:** Historical OHLC candles from `yfinance` for charting.
- **Resilience Upgrades:** Retry handling for transient OHLC provider failures.
- **Cross-Origin Ready:** Production CORS allowlisting for deployed frontend.

### 🧠 Applied ML & AI Risk Engine
- **15-Day Forecasting:** XGBoost model trained on engineered features (RSI, MACD, Bollinger Bands, lag/rolling signals).
- **Strategy Simulation:** Rule-based trading strategy to generate actionable 15-day decisions.
- **Risk + Sentiment Fusion:** Produces `risk_score`, `signal_score`, `final_strength`, recommendation label, and strategy text.
  - **Deployed Sentiment Model API:** [https://sentiment-api-6qy2.onrender.com/sentiment-multiple](https://sentiment-api-6qy2.onrender.com/sentiment-multiple)

### 🧪 ML Models: Detailed Breakdown

- **Forecasting Model (`backend/prediction_service.py`):**
  - Model: `XGBRegressor`
  - Forecast horizon: **15 business days**
  - Universe support (current): `AAPL`, `TSLA`, `AMZN`, `MSFT`, `GOOGL`, `NVDA`, `META`
  - Data source: `yfinance` historical daily candles
- **Feature Engineering Pipeline:**
  - Momentum/lag features: return lags and momentum ratios
  - Technical indicators: RSI, MACD, Bollinger Bands (`pandas-ta`)
  - Rolling statistics: moving mean ratios + return volatility windows
- **Trade Simulation Logic:**
  - Simulates BUY/SELL/HOLD actions over predicted price series
  - Constraints: budget, max transactions, cooldown, fee per trade
  - Returns table-level outputs: `predicted_price`, `action`, `shares_held`, `cash_balance`, `total_equity`
- **Risk & Recommendation Engine:**
  - Combines forecast-derived profitability with sentiment score
  - Produces machine-readable recommendation payloads for single company and top-3 allocation outputs

### 🌍 Website Feature Walkthrough

- **Trading Tab:** Candlestick chart + trade ticket for quick market action.
- **Holdings Tab:** Portfolio positions with quantity, average cost, and current value tracking.
- **Watchlist Tab:** Symbol management and trend visualization.
- **Transactions Tab:** Chronological order history for auditability.
- **ML Prediction Tab:** Runs forecasting model and shows profit curves + 15-day action table.
- **Risk & Sentiment Tab:** Returns recommendation strength, strategy explanation, and risk insights.
---

## 🏗️ Technology Stack

| Category            | Technology                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Frontend**        | Next.js 15 (App Router), React 19, Tailwind CSS, NextAuth, Razorpay, Recharts, ApexCharts                     |
| **Backend**         | FastAPI, Uvicorn, SQLAlchemy, Alpaca-py, yfinance                                                             |
| **AI / ML Models**  | XGBoost, Scikit-learn, Pandas, Numpy, Pandas-TA, custom Sentiment Analysis algorithms                         |
| **Database & ORM**  | Prisma, SQLite (dev), PostgreSQL (production-ready)                                                           |

---

## 📁 Project Structure

```text
smart-trading-platform/
├── README.md
├── run_local.sh
├── frontend/
│   ├── src/                    # Next.js App Router pages, API routes, UI components
│   ├── prisma/                 # Schema, migrations, seed
│   └── package.json
├── backend/
│   ├── main.py                 # FastAPI routes: trade, prices, prediction, risk
│   ├── alpaca_service.py       # Alpaca order + price service
│   ├── prediction_service.py   # XGBoost forecast + strategy simulator
│   ├── database.py             # SQLAlchemy DB initialization
│   └── requirements.txt
└── models/
  ├── SentimentScore2.ipynb
  ├── Untitled5 (3).ipynb
  ├── Sentiments/               # Sentiment experimentation scripts
  └── risk and reccomendation/  # Risk engine research + integration handover
```

### ✅ Attached Models Reviewed

- `models/SentimentScore2.ipynb`
- `models/Untitled5 (3).ipynb`
- `models/Sentiments/main.py`
- `models/risk and reccomendation/engine.py`
- `models/risk and reccomendation/HANDOVER.md`

These assets capture model experimentation and handover notes. Production runtime integration is handled through backend services and routes.

---

## 🛠️ Getting Started

### 1. Environment Setup

#### Frontend (`frontend/.env.local`)

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` (recommended in production)
- `FASTAPI_BASE_URL` (used by Next API proxy routes)
- `NEXT_PUBLIC_API_URL` (used by client-side candlestick fetch)
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`

Recommended production values:

- `FASTAPI_BASE_URL=https://quantifyx-backend.onrender.com`
- `NEXT_PUBLIC_API_URL=https://quantifyx-backend.onrender.com`

#### Backend (`backend/.env`)

- `ALPACA_API_KEY`
- `ALPACA_SECRET_KEY`
- `SENTIMENT_API_URL`
- `DATABASE_URL` and/or `BACKEND_DATABASE_URL`
- `CORS_ALLOW_ORIGINS` (optional, comma-separated)

### 2. Launch the Backend

The ML and Trading Engine require standard data science packages:

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
*(Optionally test the Swagger docs running at http://localhost:8000/docs)*

### 3. Launch the Frontend

```bash
cd frontend
npm install

# Initialize Prisma Database
npx prisma generate
npx prisma migrate dev

# Start the dashboard
npm run dev
```

You can also start both services from project root:

```bash
bash run_local.sh
```

---

## 📡 Core API Capabilities

### Standard Trading Endpoints (`backend/main.py`)
- `POST /api/trade`: Validate user balance & submit a live Alpaca market order. On fill, updates SQLite local ledger.
- `GET /api/prices/{ticker:path}/ohlc`: Fetches cached 6-month historical data formatting for frontend charting.
- `GET /health`: Backend health probe.

### ML & Prediction Endpoints (`prediction_service.py`)
- `POST /api/predictions`: Accepts a ticker and user constraints (`budget`, `max_transactions`, `cooldown`), runs features through XGBoost, evaluates DP strategy, and returns optimized future trade logs mapping expected 15-day PnL.

### Risk Engine Endpoints (`risk_engine/engine.py`)
- `GET /risk/inputs/sentiment/{symbol}`
- `GET /risk/inputs/sentiment-all`
- `GET /risk/inputs/prediction/{symbol}`
- `GET /risk/inputs/prediction-all`
- `GET /risk/company/{symbol}`: Returns synthesized JSON with `risk_score`, final rating (e.g. 🟢 STRONG BUY), and exact strategy description combining ML `net_pnl_percent` with news sentiment.
- `GET /risk/all`
- `GET /risk/top3`: Extracts the 3 optimal portfolio allocations based on combined algorithmic ranking.
- `GET /risk/reset`

---

## 👥 Team Sudarshan
- **Suvayu**
- **Lavay Garg**
- **Roshan Shinde**
- **Harsh Kumar**

---

> **Note:** The underlying Jupyter Notebooks used for model exploration are preserved under the `/models` directory for data science reference. Only validated production-ready models run inside the FastAPI service.
