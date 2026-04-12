import type { WatchlistItem } from '@/lib/types';
import { formatCurrency } from '@/lib/portfolio';

export function WatchlistPanel({ watchlist }: { watchlist: WatchlistItem[] }) {
  if (watchlist.length === 0) {
    return (
      <div className="rounded-2xl border border-white/8 bg-white/5 p-5 shadow-sm shadow-black/5">
        <h2 className="text-xl font-semibold text-white">Watchlist</h2>
        <p className="mt-4 text-sm text-slate-400">
          Your watchlist is empty. Add symbols via the API.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-white/5 p-5 shadow-sm shadow-black/5">
      <h2 className="text-xl font-semibold text-white">Watchlist</h2>
      <div className="mt-4 space-y-3">
        {watchlist.map((item) => (
          <div key={item.symbol} className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-950/35 px-4 py-3">
            <div>
              <div className="font-medium text-white">{item.symbol}</div>
              <div className="text-sm text-slate-400">{item.name}</div>
            </div>
            <div className="text-right">
              {item.price > 0 && (
                <div className="font-medium text-white">{formatCurrency(item.price)}</div>
              )}
              <div className={item.trend === 'up' ? 'text-emerald-300 text-sm' : 'text-rose-300 text-sm'}>
                {item.trend === 'up' ? 'Trending up' : 'Trending down'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
