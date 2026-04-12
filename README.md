# Smart Trading Platform

A Next.js + TypeScript trading simulator for Problem Statement 1.

## Stack
- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma + SQLite ledger
- NextAuth credentials auth
- FastAPI trade engine with Alpaca paper trading
- Razorpay wallet top-ups
- Recharts for portfolio visualization
- Mock and live API routes for prices, portfolio, trades, and predictions

## Getting started
1. Copy `.env.example` to `.env` / `.env.local` and fill in your SQLite, NextAuth, Alpaca, and Razorpay credentials.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the Next.js app:
   ```bash
   npm run dev
   ```
4. Start the FastAPI Alpaca engine:
   ```bash
   python -m uvicorn backend.main:app --reload --port 8000
   ```
5. Create the database schema later with Prisma:
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

## What is already scaffolded
- Dashboard home page with summary cards
- Trade ticket UI
- Holdings, watchlist, and transaction panels
- Mock price, portfolio, trade proxy, and prediction endpoints
- Prisma schema for users, portfolios, holdings, watchlist, and transactions
- FastAPI backend for Alpaca paper-trading execution and SQLite ledger updates

## Next steps
- Add real auth with NextAuth providers
- Connect live market data
- Persist trades and holdings in PostgreSQL
- Add charting and ML endpoints
# III5.0
