from __future__ import annotations

import os
import time
from decimal import Decimal, ROUND_HALF_UP

from alpaca.data.historical.crypto import CryptoHistoricalDataClient
from alpaca.data.historical.stock import StockHistoricalDataClient
from alpaca.data.requests import CryptoLatestTradeRequest, StockLatestTradeRequest
from alpaca.trading.client import TradingClient
from alpaca.trading.enums import OrderSide, TimeInForce
from alpaca.trading.requests import MarketOrderRequest

MONEY_QUANTIZER = Decimal('0.000001')


def money(value: Decimal | float | str) -> Decimal:
    return Decimal(str(value)).quantize(MONEY_QUANTIZER, rounding=ROUND_HALF_UP)


class AlpacaServiceError(RuntimeError):
    pass


class AlpacaService:
    def __init__(self) -> None:
        api_key = os.getenv('ALPACA_API_KEY')
        secret_key = os.getenv('ALPACA_SECRET_KEY')

        if not api_key or not secret_key:
            raise AlpacaServiceError('ALPACA_API_KEY and ALPACA_SECRET_KEY must be set')

        self.trading_client = TradingClient(api_key, secret_key, paper=True)
        self.stock_data_client = StockHistoricalDataClient(api_key, secret_key)
        self.crypto_data_client = CryptoHistoricalDataClient(api_key, secret_key)

    def _is_crypto_symbol(self, ticker: str) -> bool:
        return '/' in ticker

    def get_reference_price(self, ticker: str) -> Decimal:
        if self._is_crypto_symbol(ticker):
            request = CryptoLatestTradeRequest(symbol_or_symbols=ticker)
            response = self.crypto_data_client.get_crypto_latest_trade(request)
        else:
            request = StockLatestTradeRequest(symbol_or_symbols=ticker)
            response = self.stock_data_client.get_stock_latest_trade(request)

        trade = response[ticker] if isinstance(response, dict) and ticker in response else response
        price = getattr(trade, 'price', None)

        if price is None:
            raise AlpacaServiceError(f'Unable to fetch latest market price for {ticker}')
        return money(price)

    def submit_market_order(self, ticker: str, side: str, qty: Decimal) -> tuple[str, Decimal, Decimal]:
        order_side = OrderSide.BUY if side.lower() == 'buy' else OrderSide.SELL
        time_in_force = TimeInForce.GTC if self._is_crypto_symbol(ticker) else TimeInForce.DAY
        request = MarketOrderRequest(
            symbol=ticker,
            qty=float(qty),
            side=order_side,
            time_in_force=time_in_force
        )
        order = self.trading_client.submit_order(order_data=request)
        order_id = str(getattr(order, 'id', ''))
        if not order_id:
            raise AlpacaServiceError('Alpaca did not return an order ID')

        filled_order = self._wait_for_fill(order_id)
        execution_price = self._extract_execution_price(filled_order, fallback=self.get_reference_price(ticker))
        filled_qty = money(getattr(filled_order, 'filled_qty', qty) or qty)
        return order_id, filled_qty, execution_price

    def _wait_for_fill(self, order_id: str, timeout_seconds: float = 20.0):
        deadline = time.monotonic() + timeout_seconds
        last_order = None

        while time.monotonic() < deadline:
            last_order = self.trading_client.get_order_by_id(order_id)
            status = str(getattr(last_order, 'status', '')).lower()
            if status in {'filled', 'partially_filled'}:
                return last_order

            if status in {'canceled', 'rejected', 'expired'}:
                reason = (
                    getattr(last_order, 'failed_reason', None)
                    or getattr(last_order, 'cancel_requested_at', None)
                    or 'No reason provided by broker'
                )
                raise AlpacaServiceError(f'Alpaca order {status}: {reason}')

            time.sleep(0.5)

        raise AlpacaServiceError('Timed out waiting for Alpaca order execution')

    def _extract_execution_price(self, order, fallback: Decimal) -> Decimal:
        raw_price = getattr(order, 'filled_avg_price', None)
        if raw_price in (None, ''):
            return fallback
        return money(raw_price)
