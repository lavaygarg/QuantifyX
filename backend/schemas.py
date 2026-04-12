from __future__ import annotations

from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field


class TradeRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    ticker: str = Field(..., min_length=1)
    qty: Decimal = Field(..., gt=0)
    side: Literal['buy', 'sell']


class TradeResponse(BaseModel):
    status: str
    user_id: str
    ticker: str
    side: Literal['buy', 'sell']
    qty: Decimal
    estimated_price: Decimal
    execution_price: Decimal
    notional: Decimal
    alpaca_order_id: str
    portfolio_cash_balance: Decimal
    holding_quantity: Decimal | None = None
    message: str


class PredictionRequest(BaseModel):
    ticker: str = Field(..., min_length=1)
    budget: Decimal = Field(..., gt=0)
    max_transactions: int = Field(default=3, ge=1, le=20)
    cooldown: int = Field(default=1, ge=0, le=10)
    fee_per_trade: Decimal = Field(default=Decimal('1.0'), ge=0)
