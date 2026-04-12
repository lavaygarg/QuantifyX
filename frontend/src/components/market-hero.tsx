import { formatCurrency } from '@/lib/portfolio';
import { assets } from '@/lib/mock-data';

export function MarketHero() {
  const movers = assets.slice(0, 3);

  return (
    <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-8 shadow-2xl shadow-black/20 backdrop-blur">
      <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
        <div className="max-w-3xl">
          <p className="text-sm uppercase tracking-[0.3em] text-blue-300">QuantifyX</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">
            Simulated trading with live-style analytics and ML predictions.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Execute mock trades, review portfolio performance, and surface prediction signals that can later connect to your Python model endpoint.
          </p>
        </div>

        <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
            <div className="text-white">Market snapshot</div>
            <div className="mt-2 space-y-2">
              {movers.map((asset) => (
                <div key={asset.symbol} className="flex items-center justify-between">
                  <span>{asset.symbol}</span>
                  <span className={asset.change >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                    {formatCurrency(asset.price)}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
            <div className="text-white">ML-ready stack</div>
            <div className="mt-1">Forecasts, dynamic candlesticks, and risk scoring are wired into the UI surface.</div>
          </div>
        </div>
      </div>
    </section>
  );
}
