import os
import time
from dotenv import load_dotenv

load_dotenv('frontend/.env.local')
load_dotenv('frontend/.env')

from alpaca.trading.client import TradingClient
from alpaca.trading.requests import MarketOrderRequest
from alpaca.trading.enums import OrderSide, TimeInForce

for k in ['http_proxy', 'https_proxy', 'HTTP_PROXY', 'HTTPS_PROXY']:
    os.environ.pop(k, None)

client = TradingClient(
    os.environ['ALPACA_API_KEY'],
    os.environ['ALPACA_SECRET_KEY'],
    paper=True
)

req = MarketOrderRequest(
    symbol="BTC/USD",
    qty=0.01,
    side=OrderSide.BUY,
    time_in_force=TimeInForce.GTC
)
print("Submitting order...")
try:
    order = client.submit_order(req)
    print("Order ID:", order.id)
    print("Initial Status:", order.status)
    for _ in range(5):
        time.sleep(1)
        o = client.get_order_by_id(order.id)
        print("Updated Status:", o.status.value if hasattr(o.status, 'value') else o.status)
except Exception as e:
    print("Exception:", e)
