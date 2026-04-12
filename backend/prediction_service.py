from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from importlib import import_module
from typing import Any

import numpy as np
import pandas as pd

LAGS = [1, 2, 5, 15, 60]
WINDOWS = [5, 15, 60]
SUPPORTED_TICKERS = ["AAPL", "TSLA", "AMZN", "MSFT", "GOOGL", "NVDA", "META"]


class PredictionServiceError(RuntimeError):
    pass


def _load_ml_dependencies() -> tuple[Any, Any, Any]:
    try:
        pandas_ta = import_module('pandas_ta')
        yfinance = import_module('yfinance')
        xgboost = import_module('xgboost')
        return pandas_ta, yfinance, xgboost
    except ModuleNotFoundError as error:
        raise PredictionServiceError(
            f"Missing ML dependency: {error.name}. Install pandas-ta, yfinance, and xgboost in backend environment."
        ) from error


@dataclass
class PredictionRequest:
    ticker: str
    budget: float
    max_transactions: int = 3
    cooldown: int = 1
    fee_per_trade: float = 1.0


def _prepare_features(df: pd.DataFrame, _pandas_ta: Any) -> pd.DataFrame:
    data = df.copy()
    if isinstance(data.index, pd.DatetimeIndex):
        data.index = data.index.tz_localize(None)

    if "Dividends" in data.columns:
        drop_cols = [col for col in ["Dividends", "Stock Splits"] if col in data.columns]
        data.drop(columns=drop_cols, inplace=True)

    data.ta.rsi(length=14, append=True)
    data.ta.macd(append=True)
    data.ta.bbands(length=20, append=True)

    data["Daily_Return"] = data["Close"].pct_change()

    for lag in LAGS:
        data[f"Return_Lag_{lag}"] = data["Daily_Return"].shift(lag)
        data[f"Momentum_Ratio_{lag}"] = data["Close"] / data["Close"].shift(lag)

    for window in WINDOWS:
        past_rolling_mean = data["Close"].shift(1).rolling(window=window).mean()
        data[f"Close_to_Roll_Mean_{window}"] = data["Close"] / past_rolling_mean
        data[f"Roll_Std_Returns_{window}"] = data["Daily_Return"].shift(1).rolling(window=window).std()

    data["Target_15d_out"] = data["Close"].shift(-15)
    data.dropna(inplace=True)
    return data


def _predict_next_15_prices(df: pd.DataFrame, xgb: Any) -> tuple[pd.DataFrame, pd.DataFrame]:
    if len(df) < 90:
        raise PredictionServiceError("Not enough historical rows to generate stable 15-day forecast")

    drop_cols = ["Open", "High", "Low", "Close", "Volume", "Target_15d_out", "Ticker", "Target"]

    train_data = df.dropna(subset=["Target_15d_out"]).copy()
    future_data = df.tail(15).copy()

    train_feature_cols = [col for col in train_data.columns if col not in drop_cols]
    future_feature_cols = [col for col in future_data.columns if col not in drop_cols]

    X_train = train_data[train_feature_cols]
    y_train = train_data["Target_15d_out"]

    model = xgb.XGBRegressor(
        n_estimators=200,
        learning_rate=0.05,
        max_depth=5,
        random_state=42
    )
    model.fit(X_train, y_train)

    X_future = future_data[future_feature_cols]
    future_predictions = model.predict(X_future)

    last_date = df.index[-1]
    future_dates = pd.bdate_range(start=last_date + pd.Timedelta(days=1), periods=15)

    prediction_df = pd.DataFrame(
        {
            "date": future_dates,
            "predicted_price": future_predictions
        }
    )

    context_df = df.tail(45).reset_index()[["Date", "Close"]].rename(columns={"Date": "date", "Close": "close"})
    return prediction_df, context_df


def _dp_trading_strategy(
    prices: np.ndarray,
    dates: list[pd.Timestamp],
    budget: float,
    max_transactions: int,
    cooldown: int,
    fee_per_trade: float
) -> pd.DataFrame:
    trades_used = 0
    in_cooldown = 0
    shares_held = 0
    cash_balance = float(budget)
    cost_basis = 0.0
    trade_log: list[dict[str, Any]] = []

    for i, price in enumerate(prices):
        action = "HOLD"
        shares_traded = 0
        trade_value = 0.0

        if in_cooldown > 0:
            in_cooldown -= 1
            action = "COOLDOWN"

        elif shares_held == 0 and trades_used < max_transactions:
            future_prices = prices[i + 1:] if i + 1 < len(prices) else np.array([])
            if future_prices.size > 0 and float(future_prices.max()) > price + (2 * fee_per_trade):
                spend = min(cash_balance * 0.4, cash_balance)
                shares_traded = int((spend - fee_per_trade) // price)
                if shares_traded > 0:
                    trade_value = shares_traded * float(price) + fee_per_trade
                    cash_balance -= trade_value
                    shares_held = shares_traded
                    cost_basis = shares_traded * float(price)
                    trades_used += 1
                    action = "BUY"

        elif shares_held > 0:
            future_prices = prices[i + 1:] if i + 1 < len(prices) else np.array([])
            is_peak = future_prices.size == 0 or float(price) >= float(future_prices.max())
            if is_peak:
                trade_value = shares_held * float(price) - fee_per_trade
                cash_balance += trade_value
                shares_traded = shares_held
                shares_held = 0
                cost_basis = 0.0
                in_cooldown = cooldown
                action = "SELL"

        portfolio_val = shares_held * float(price)
        unrealized_pnl = portfolio_val - cost_basis
        total_equity = cash_balance + portfolio_val

        trade_log.append(
            {
                "date": dates[i],
                "predicted_price": round(float(price), 2),
                "action": action,
                "shares_traded": int(shares_traded),
                "trade_value": round(float(trade_value), 2),
                "cash_balance": round(float(cash_balance), 2),
                "shares_held": int(shares_held),
                "unrealized_pnl": round(float(unrealized_pnl), 2),
                "total_equity": round(float(total_equity), 2)
            }
        )

    return pd.DataFrame(trade_log)


def generate_prediction(payload: PredictionRequest) -> dict[str, Any]:
    pandas_ta, yfinance, xgboost = _load_ml_dependencies()

    ticker = payload.ticker.upper().strip()
    if ticker not in SUPPORTED_TICKERS:
        raise PredictionServiceError(f"Unsupported ticker: {ticker}")

    if payload.budget < 100:
        raise PredictionServiceError("Budget must be at least 100")

    stock = yfinance.Ticker(ticker)
    historical = stock.history(period="3y", interval="1d")

    if historical.empty:
        raise PredictionServiceError("No historical data returned for ticker")

    engineered = _prepare_features(historical, pandas_ta)
    prediction_df, context_df = _predict_next_15_prices(engineered, xgboost)

    trade_df = _dp_trading_strategy(
        prices=prediction_df["predicted_price"].to_numpy(dtype=float),
        dates=list(prediction_df["date"]),
        budget=float(payload.budget),
        max_transactions=int(payload.max_transactions),
        cooldown=int(payload.cooldown),
        fee_per_trade=float(payload.fee_per_trade)
    )

    start_equity = float(payload.budget)
    final_equity = float(trade_df.iloc[-1]["total_equity"])
    overall_profit = final_equity - start_equity

    prediction_records = trade_df.to_dict(orient='records')
    prediction_table = [
        {
            "date": pd.Timestamp(record["date"]).strftime("%Y-%m-%d"),
            "predicted_price": round(float(record["predicted_price"]), 2),
            "action": str(record["action"]),
            "shares_traded": int(record["shares_traded"]),
            "trade_value": round(float(record["trade_value"]), 2),
            "cash_balance": round(float(record["cash_balance"]), 2),
            "shares_held": int(record["shares_held"]),
            "unrealized_pnl": round(float(record["unrealized_pnl"]), 2),
            "total_equity": round(float(record["total_equity"]), 2)
        }
        for record in prediction_records
    ]

    context_records = context_df.to_dict(orient='records')
    base_close = float(context_records[0]["close"])
    past_profit_series = [
        {
            "date": pd.Timestamp(record["date"]).strftime("%Y-%m-%d"),
            "profit": round(float(record["close"]) - base_close, 2)
        }
        for record in context_records
    ]

    expected_profit_series = [
        {
            "date": row["date"],
            "profit": round(float(row["total_equity"]) - start_equity, 2)
        }
        for row in prediction_table
    ]

    expected_profit_15d = round(float(expected_profit_series[-1]["profit"]), 2)

    return {
        "ticker": ticker,
        "budget": round(float(payload.budget), 2),
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "overall_profit": round(float(overall_profit), 2),
        "expected_profit_15d": expected_profit_15d,
        "prediction_table_15d": prediction_table,
        "past_profit_series": past_profit_series,
        "expected_profit_series": expected_profit_series,
        "summary": {
            "starting_budget": round(start_equity, 2),
            "final_equity": round(final_equity, 2),
            "net_pnl_percent": round((overall_profit / start_equity) * 100, 2)
        }
    }
