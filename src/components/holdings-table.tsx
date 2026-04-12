import type { Holding } from '@/lib/types';
import { calculateHoldingPnL, calculateHoldingValue, formatCurrency } from '@/lib/portfolio';

export function HoldingsTable({ holdings }: { holdings: Holding[] }) {
  if (holdings.length === 0) {
    return (
      <div className="rounded-2xl border border-white/8 bg-white/5 p-5 shadow-sm shadow-black/5">
        <h2 className="text-xl font-semibold text-white">Holdings</h2>
        <p className="mt-4 text-sm text-slate-400">
          No holdings yet. Execute a BUY trade to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-white/5 p-5 shadow-sm shadow-black/5">
      <h2 className="text-xl font-semibold text-white">Holdings</h2>
      <div className="mt-4 overflow-hidden rounded-xl border border-white/5 bg-slate-950/40">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-white/5 text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Symbol</th>
              <th className="px-4 py-3 font-medium">Qty</th>
              <th className="px-4 py-3 font-medium">Avg cost</th>
              <th className="px-4 py-3 font-medium">Value</th>
              <th className="px-4 py-3 font-medium">P&amp;L</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((holding) => {
              const pnl = calculateHoldingPnL(holding);
              return (
                <tr key={holding.symbol} className="border-t border-white/5">
                  <td className="px-4 py-3 font-medium">{holding.symbol}</td>
                  <td className="px-4 py-3">{holding.quantity}</td>
                  <td className="px-4 py-3">{formatCurrency(holding.averageCost)}</td>
                  <td className="px-4 py-3">{formatCurrency(calculateHoldingValue(holding))}</td>
                  <td className={`px-4 py-3 ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(pnl)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
