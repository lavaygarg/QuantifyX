"use client";

import { useState } from 'react';
import type { WatchlistItem } from '@/lib/types';
import { formatCurrency } from '@/lib/portfolio';
import { useRouter } from 'next/navigation';

export function WatchlistPanel({ watchlist }: { watchlist: WatchlistItem[] }) {
  const [newSymbol, setNewSymbol] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: newSymbol.toUpperCase() }),
      });
      if (res.ok) {
        setNewSymbol('');
        router.refresh();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async (symbol: string) => {
    try {
      const res = await fetch(`/api/watchlist?symbol=${symbol}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="rounded-2xl border border-white/8 bg-white/5 p-5 shadow-sm shadow-black/5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Watchlist</h2>
      </div>

      <form onSubmit={handleAdd} className="mt-4 flex gap-2">
        <input
          type="text"
          value={newSymbol}
          onChange={(e) => setNewSymbol(e.target.value)}
          placeholder="Enter symbol (e.g. BTC)"
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={isLoading || !newSymbol}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Add
        </button>
      </form>

      {watchlist.length === 0 ? (
        <p className="mt-6 text-sm text-slate-400">
          Your watchlist is empty. Add a symbol to get started.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {watchlist.map((item) => (
            <div key={item.symbol} className="group flex items-center justify-between rounded-xl border border-white/5 bg-slate-950/35 px-4 py-3">
              <div>
                <div className="font-medium text-white">{item.symbol}</div>
                <div className="text-sm text-slate-400">{item.name}</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  {item.price > 0 && (
                    <div className="font-medium text-white">{formatCurrency(item.price)}</div>
                  )}
                  <div className={item.trend === 'up' ? 'text-emerald-300 text-sm' : 'text-rose-300 text-sm'}>
                    {item.trend === 'up' ? 'Trending up' : 'Trending down'}
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(item.symbol)}
                  className="hidden rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white group-hover:block"
                  title="Remove from watchlist"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
