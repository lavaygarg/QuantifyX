from __future__ import annotations

import os
import sys

# Forcefully bypass proxy to resolve yfinance NoneType extraction errors natively
for key in ['http_proxy', 'https_proxy', 'HTTP_PROXY', 'HTTPS_PROXY']:
    os.environ.pop(key, None)
from decimal import Decimal
from importlib import import_module
from pathlib import Path
from functools import lru_cache

from dotenv import load_dotenv
from sqlalchemy import select
from sqlalchemy.orm import Session

# Dynamically add the backend directory to sys.path so imports work flawlessly 
# whether launched from Render (inside /backend) or locally (from project root)!
sys.path.insert(0, str(Path(__file__).resolve().parent))

from alpaca_service import AlpacaService, AlpacaServiceError, money
from database import Base, SessionLocal, engine
from models import Holding, Portfolio, Transaction, User
from prediction_service import PredictionRequest as ServicePredictionRequest
from prediction_service import PredictionServiceError, generate_prediction
from schemas import PredictionRequest, TradeRequest, TradeResponse

fastapi_module = import_module('fastapi')
cors_module = import_module('fastapi.middleware.cors')

FastAPI = fastapi_module.FastAPI
HTTPException = fastapi_module.HTTPException
CORSMiddleware = cors_module.CORSMiddleware

PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = Path(__file__).resolve().parent
load_dotenv(BACKEND_ROOT / '.env')

Base.metadata.create_all(bind=engine)

app = FastAPI(title='Smart Trading Alpaca Engine', version='1.0.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        'http://localhost:3000',
        'http://127.0.0.1:3000'
    ],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*']
)


@app.get('/health')
def health() -> dict[str, str]:
    return {'ok': 'true'}


@app.post('/api/predictions')
def predictions(payload: PredictionRequest) -> dict[str, object]:
    try:
        request = ServicePredictionRequest(
            ticker=payload.ticker,
            budget=float(payload.budget),
            max_transactions=payload.max_transactions,
            cooldown=payload.cooldown,
            fee_per_trade=float(payload.fee_per_trade)
        )
        return generate_prediction(request)
    except PredictionServiceError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=f'Prediction engine failed: {error}') from error

@lru_cache(maxsize=128)
def fetch_ohlc_cached(ticker: str):
    import yfinance as yf
    stock = yf.Ticker(ticker)
    df = stock.history(period="6mo", interval="1d")
    if df.empty:
        return []
    
    df = df.reset_index()
    if df['Date'].dt.tz is not None:
        df['Date'] = df['Date'].dt.tz_localize(None)

    bars = []
    for _, row in df.iterrows():
        bars.append({
            "x": row['Date'].strftime('%Y-%m-%d'),
            "y": [
                round(row['Open'], 2),
                round(row['High'], 2),
                round(row['Low'], 2),
                round(row['Close'], 2)
            ]
        })
    return bars

@app.get('/api/prices/{ticker}/ohlc')
def get_ohlc(ticker: str):
    try:
        return fetch_ohlc_cached(ticker)
    except Exception as error:
        raise HTTPException(status_code=500, detail=f'Failed to fetch OHLC data: {error}') from error



@app.post('/api/trade', response_model=TradeResponse)
def trade(payload: TradeRequest) -> TradeResponse:
    service = AlpacaService()

    validation_session: Session = SessionLocal()
    ledger_session: Session = SessionLocal()

    try:
        user = validation_session.execute(select(User).where(User.id == payload.user_id)).scalar_one_or_none()
        if user is None:
            raise HTTPException(status_code=404, detail='User not found')

        portfolio = validation_session.execute(
            select(Portfolio).where(Portfolio.userId == payload.user_id)
        ).scalar_one_or_none()
        if portfolio is None:
            raise HTTPException(status_code=404, detail='Portfolio not found')

        ticker = payload.ticker.upper().strip()
        qty = money(payload.qty)
        side = payload.side.lower()
        estimated_price = service.get_reference_price(ticker)
        estimated_notional = money(estimated_price * qty)

        holding = validation_session.execute(
            select(Holding).where(Holding.portfolioId == portfolio.id, Holding.symbol == ticker)
        ).scalar_one_or_none()

        if side == 'buy':
            if money(portfolio.cashBalance) < estimated_notional:
                raise HTTPException(status_code=400, detail='Insufficient cash balance')
        else:
            if holding is None or money(holding.quantity) < qty:
                raise HTTPException(status_code=400, detail='Insufficient quantity to sell')

        alpaca_order_id, filled_qty, execution_price = service.submit_market_order(
            ticker=ticker,
            side=side,
            qty=qty
        )
        notional = money(execution_price * filled_qty)

        with ledger_session.begin():
            portfolio = ledger_session.execute(
                select(Portfolio).where(Portfolio.id == portfolio.id)
            ).scalar_one_or_none()
            if portfolio is None:
                raise HTTPException(status_code=404, detail='Portfolio not found during ledger update')

            holding = ledger_session.execute(
                select(Holding).where(Holding.portfolioId == portfolio.id, Holding.symbol == ticker)
            ).scalar_one_or_none()

            if side == 'buy':
                if money(portfolio.cashBalance) < notional:
                    raise HTTPException(status_code=400, detail='Insufficient cash balance after execution')

                portfolio.cashBalance = money(Decimal(str(portfolio.cashBalance)) - notional)
                if holding is None:
                    holding = Holding(
                        portfolioId=portfolio.id,
                        symbol=ticker,
                        quantity=filled_qty,
                        averageCost=execution_price,
                        currentPrice=execution_price
                    )
                    ledger_session.add(holding)
                else:
                    existing_qty = money(holding.quantity)
                    existing_avg = money(holding.averageCost)
                    new_qty = money(existing_qty + filled_qty)
                    new_avg = money(((existing_qty * existing_avg) + notional) / new_qty)
                    holding.quantity = new_qty
                    holding.averageCost = new_avg
                    holding.currentPrice = execution_price
            else:
                if holding is None or money(holding.quantity) < filled_qty:
                    raise HTTPException(status_code=400, detail='Insufficient quantity to sell')

                portfolio.cashBalance = money(Decimal(str(portfolio.cashBalance)) + notional)
                remaining_qty = money(money(holding.quantity) - filled_qty)
                if remaining_qty <= 0:
                    ledger_session.delete(holding)
                else:
                    holding.quantity = remaining_qty
                    holding.currentPrice = execution_price

            ledger_session.add(
                Transaction(
                    userId=payload.user_id,
                    symbol=ticker,
                    side=side.upper(),
                    quantity=filled_qty,
                    price=execution_price
                )
            )

        ledger_session.refresh(portfolio)
        updated_holding = None
        if side == 'buy':
            updated_holding = ledger_session.execute(
                select(Holding).where(Holding.portfolioId == portfolio.id, Holding.symbol == ticker)
            ).scalar_one_or_none()
        elif holding is not None:
            updated_holding = ledger_session.execute(
                select(Holding).where(Holding.portfolioId == portfolio.id, Holding.symbol == ticker)
            ).scalar_one_or_none()

        return TradeResponse(
            status='filled',
            user_id=payload.user_id,
            ticker=ticker,
            side=payload.side,
            qty=filled_qty,
            estimated_price=estimated_price,
            execution_price=execution_price,
            notional=notional,
            alpaca_order_id=alpaca_order_id,
            portfolio_cash_balance=money(portfolio.cashBalance),
            holding_quantity=money(updated_holding.quantity) if updated_holding is not None else None,
            message='Trade completed and ledger reconciled'
        )
    except AlpacaServiceError as error:
        message = str(error)
        lower = message.lower()

        if 'timed out' in lower:
            raise HTTPException(status_code=504, detail=message) from error

        if 'rejected' in lower or 'canceled' in lower or 'expired' in lower or 'insufficient' in lower:
            raise HTTPException(status_code=400, detail=message) from error

        if 'must be set' in lower:
            raise HTTPException(status_code=500, detail=message) from error

        raise HTTPException(status_code=502, detail=message) from error
    finally:
        validation_session.close()
        ledger_session.close()
