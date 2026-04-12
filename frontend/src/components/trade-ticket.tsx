"use client";

import { useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { cryptoAssets, stockAssets } from '@/lib/mock-data';
import { formatCurrency } from '@/lib/portfolio';

type ToastItem = {
  id: number;
  title: string;
  description: string;
  tone: 'success' | 'error';
};

type TradeResponse = {
  detail?: string;
  error?: string;
  message?: string;
  execution_price?: number;
  portfolio_cash_balance?: number;
  alpaca_order_id?: string;
};

export function TradeTicket() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [assetClass, setAssetClass] = useState<'stock' | 'crypto'>('stock');
  const [symbol, setSymbol] = useState(stockAssets[0]?.symbol ?? 'AAPL');
  const [quantity, setQuantity] = useState(5);
  const [pendingSide, setPendingSide] = useState<'buy' | 'sell' | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const tradeAssets = assetClass === 'crypto' ? cryptoAssets : stockAssets;

  const selectedAsset = useMemo(
    () => tradeAssets.find((asset) => asset.symbol === symbol) ?? tradeAssets[0],
    [symbol, tradeAssets]
  );
  const estimatedValue = quantity * (selectedAsset?.price ?? 0);
  const isBusy = pendingSide !== null;
  const userId = (session?.user as { id?: string } | undefined)?.id;

  function pushToast(tone: ToastItem['tone'], title: string, description: string) {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current, { id, tone, title, description }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4500);
  }

  function formatErrorToast(detail: string) {
    const lowerDetail = detail.toLowerCase();

    if (lowerDetail.includes('trading engine unavailable')) {
      return {
        title: 'Error: Trading Engine Offline',
        description: 'FastAPI service is not reachable. Start backend server and retry.'
      };
    }

    if (lowerDetail.includes('alpaca_api_key') || lowerDetail.includes('must be set')) {
      return {
        title: 'Error: Broker Keys Missing',
        description: 'ALPACA_API_KEY and ALPACA_SECRET_KEY are required in environment variables.'
      };
    }

    if (lowerDetail.includes('timed out')) {
      return {
        title: 'Error: Order Timeout',
        description: 'Broker did not confirm execution in time. Please retry in a moment.'
      };
    }

    if (lowerDetail.includes('rejected') || lowerDetail.includes('expired') || lowerDetail.includes('canceled')) {
      return {
        title: 'Error: Broker Rejected Order',
        description: detail
      };
    }

    if (lowerDetail.includes('market closed')) {
      return {
        title: 'Error: Market Closed',
        description: 'Stock market is currently closed. Place order during market hours.'
      };
    }

    if (lowerDetail.includes('insufficient cash')) {
      return {
        title: 'Error: Insufficient Funds',
        description: 'Your portfolio cash balance is too low for this buy order.'
      };
    }

    if (lowerDetail.includes('insufficient quantity')) {
      return {
        title: 'Error: Insufficient Shares',
        description: 'You do not hold enough shares for this sell order.'
      };
    }

    return {
      title: 'Error: Trade Rejected',
      description: detail
    };
  }

  async function submitTrade(side: 'buy' | 'sell') {
    if (!userId) {
      pushToast('error', 'Error: Authentication Required', 'Please sign in before placing a trade.');
      return;
    }

    if (quantity <= 0) {
      pushToast('error', 'Error: Invalid Quantity', 'Please enter a quantity greater than zero.');
      return;
    }

    setPendingSide(side);

    try {
      const response = await fetch('/api/trade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: userId,
          ticker: symbol,
          qty: quantity,
          side
        })
      });

      const data = (await response.json().catch(() => null)) as TradeResponse | null;

      if (!response.ok) {
        const detail = data?.detail || data?.error || data?.message || 'Trade failed';
        const toast = formatErrorToast(detail);
        pushToast('error', toast.title, toast.description);
        return;
      }

      pushToast(
        'success',
        'Trade Successful',
        `${side.toUpperCase()} ${quantity} ${symbol} executed at ${formatCurrency(data?.execution_price ?? selectedAsset?.price ?? 0)}.`
      );
      router.refresh();
    } catch {
      pushToast('error', 'Error: Network Failure', 'The trading service could not be reached.');
    } finally {
      setPendingSide(null);
    }
  }

  return (
    <>
      <div className="rounded-2xl border border-white/20 bg-white/10 p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Trade ticket</h2>
            <p className="mt-1 text-sm text-slate-400">Executes paper trades through FastAPI + Alpaca.</p>
          </div>
          <div className="rounded-full border border-white/20 bg-black/20 px-3 py-1 text-xs text-white backdrop-blur shadow-inner">
            {status === 'loading' ? 'Checking session...' : userId ? 'Ready' : 'Sign in required'}
          </div>
        </div>

        <div className="mt-4 grid gap-4">
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-slate-950/45 p-1">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => {
                setAssetClass('stock');
                setSymbol(stockAssets[0]?.symbol ?? 'AAPL');
                setQuantity(5);
              }}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${assetClass === 'stock'
                  ? 'bg-blue-500/20 text-blue-200'
                  : 'text-slate-300 hover:bg-white/5'
                }`}
            >
              Stocks
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => {
                setAssetClass('crypto');
                setSymbol(cryptoAssets[0]?.symbol ?? 'BTC/USD');
                setQuantity(0.05);
              }}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${assetClass === 'crypto'
                  ? 'bg-violet-500/20 text-violet-200'
                  : 'text-slate-300 hover:bg-white/5'
                }`}
            >
              Crypto
            </button>
          </div>

          <label className="grid gap-2 text-sm text-slate-400">
            Asset
            <select
              className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none transition focus:border-blue-400/60"
              value={symbol}
              onChange={(event) => setSymbol(event.target.value)}
              disabled={isBusy}
            >
              {tradeAssets.map((asset) => (
                <option key={asset.symbol} value={asset.symbol}>
                  {asset.symbol} - {asset.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm text-slate-400">
            Quantity {assetClass === 'crypto' ? '(supports decimals)' : ''}
            <input
              className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none transition focus:border-blue-400/60"
              type="number"
              min={assetClass === 'crypto' ? 0.0001 : 1}
              step={assetClass === 'crypto' ? 0.0001 : 1}
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
              disabled={isBusy}
            />
          </label>

          <div className="rounded-xl border border-white/8 bg-slate-950/40 p-4 text-sm text-slate-400">
            Estimated order value: <span className="font-semibold text-white">{formatCurrency(estimatedValue)}</span>
            <div className="mt-1">
              Current market preview: <span className="text-white">{formatCurrency(selectedAsset?.price ?? 0)}</span>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Market: {assetClass === 'crypto' ? 'Crypto (24/7)' : 'Equity (market hours)'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={isBusy || status !== 'authenticated'}
              onClick={() => submitTrade('buy')}
              className="rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pendingSide === 'buy' ? 'Buying...' : 'Buy'}
            </button>
            <button
              type="button"
              disabled={isBusy || status !== 'authenticated'}
              onClick={() => submitTrade('sell')}
              className="rounded-xl bg-slate-200 px-4 py-3 font-semibold text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pendingSide === 'sell' ? 'Selling...' : 'Sell'}
            </button>
          </div>
        </div>
      </div>

      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-sm ${toast.tone === 'success'
                ? 'border-emerald-500/25 bg-slate-950/90 text-emerald-100'
                : 'border-rose-500/25 bg-slate-950/90 text-rose-100'
              }`}
          >
            <div className="font-semibold">{toast.title}</div>
            <div className="mt-1 text-sm leading-6 opacity-90">{toast.description}</div>
          </div>
        ))}
      </div>
    </>
  );
}
