# QuantifyX – Smart Trading & Portfolio Platform

A high-performance comprehensive Next.js + TypeScript trading simulator built for **Problem Statement 1**. It features simulated trading, real-time portfolio dashboards, Alpaca paper trading integration, and advanced ML-based price trend prediction and sentiment analysis.

---

## 🚀 Key Features

### 🖥️ Next.js Fullstack Dashboard
- **Real-Time Portfolio:** Interactive holdings, watchlist, and transaction panels utilizing Recharts & ApexCharts for premium visualization.
- **Authentication:** Secure credential-based login powered by NextAuth.js.
- **Wallet Integration:** Razorpay integration for simulated wallet top-ups.
- **Robust Database:** Prisma ORM for type-safe database schemas (supporting SQLite for local and PostgreSQL for production).
- **Modern UI:** Tailwind CSS and Lucide React delivering a glassmorphism aesthetic and responsive design.

### ⚙️ FastAPI Trading Engine
- **Trade Execution:** Integration with the Alpaca API for seamless paper trading and real-time market data.
- **Local Ledger:** Synchronizes Alpine order fills into a fast SQLite-backed ledger system.
- **Market Data:** Fetches real-time price boundaries and historical OHLC data natively via `yfinance`.

### 🧠 Applied ML & AI Risk Engine
- **15-Day Price Forecasting:** An **XGBoost Regressor** trained on engineered technical indicators (RSI, MACD, Bollinger Bands via `pandas-ta`) accurately predicts future closing prices.
- **Algorithmic DP Strategy:** A Dynamic Programming trading simulation executes on top of the forecasted prices to optimize optimal entry (BUY/SELL) actions under constraints (budget, max transactions, cooldown periods).
- **Sentiment & Risk Engine:** A modular service (`risk_engine`) calculating holistic `risk_score`, `signal_score`, and `final_strength` based on algorithmic trade profit projection and live News Sentiment endpoints. Yields clear buy/hold/sell recommendations and capital allocation percentages.
  - **Deployed Sentiment Model API:** [https://sentiment-api-6qy2.onrender.com/sentiment-multiple](https://sentiment-api-6qy2.onrender.com/sentiment-multiple)
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
├── frontend/
│   ├── src/                  # Next.js App Router pages and UI components
│   ├── prisma/               # Database schema and seed scripts
│   └── package.json          # Node dependencies
├── backend/
│   ├── main.py               # FastAPI entry point & API routes
│   ├── alpaca_service.py     # Alpaca API broker interaction layer
│   ├── prediction_service.py # XGBoost model & DP algorithmic strategy
│   └── risk_engine/          # Sentiment and Risk scoring modules
└── models/
    ├── risk and reccomendation/ # Research scripts and integration handover guide
    └── Sentiments/              # Jupyter notebooks containing model research (SentimentScore)
```

---

## 🛠️ Getting Started

### 1. Environment Setup

* **Frontend:** Create `frontend/.env` (or `.env.local`) based on the `.env.example` file to insert NextAuth, Database, and Razorpay keys.
* **Backend:** Create `backend/.env` containing your `ALPACA_API_KEY`, `ALPACA_SECRET_KEY`, and `SENTIMENT_API_URL`.

### 2. Launch the Backend

The ML and Trading Engine require standard data science packages:

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
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

---

## 📡 Core API Capabilities

### Standard Trading Endpoints (`backend/main.py`)
- `POST /api/trade`: Validate user balance & submit a live Alpaca market order. On fill, updates SQLite local ledger.
- `GET /api/prices/{ticker}/ohlc`: Fetches cached 6-month historical data formatting for frontend charting.

### ML & Prediction Endpoints (`prediction_service.py`)
- `POST /api/predictions`: Accepts a ticker and user constraints (`budget`, `max_transactions`, `cooldown`), runs features through XGBoost, evaluates DP strategy, and returns optimized future trade logs mapping expected 15-day PnL.

### Risk Engine Endpoints (`risk_engine/engine.py`)
- `GET /risk/company/{symbol}`: Returns synthesized JSON with `risk_score`, final rating (e.g. 🟢 STRONG BUY), and exact strategy description combining ML `net_pnl_percent` with news sentiment.
- `GET /risk/top3`: Extracts the 3 optimal portfolio allocations based on combined algorithmic ranking.

---

## 👥 Team Sudarshan
- **Suvayu**
- **Lavay Garg**
- **Roshan Shinde**
- **Harsh Kumar**

---

> **Note:** The underlying Jupyter Notebooks used for model exploration are preserved under the `/models` directory for data science reference. Only validated production-ready models run inside the FastAPI service.
