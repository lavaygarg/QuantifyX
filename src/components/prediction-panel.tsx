'use client';

import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

type ProfitPoint = {
  date: string;
  profit: number;
};

type PredictionRow = {
  date: string;
  predicted_price: number;
  action: string;
  shares_traded: number;
  trade_value: number;
  cash_balance: number;
  shares_held: number;
  unrealized_pnl: number;
  total_equity: number;
};

type PredictionApiResponse = {
  ticker: string;
  budget: number;
  overall_profit: number;
  expected_profit_15d: number;
  prediction_table_15d: PredictionRow[];
  past_profit_series: ProfitPoint[];
  expected_profit_series: ProfitPoint[];
  summary: {
    starting_budget: number;
    final_equity: number;
    net_pnl_percent: number;
  };
};

const TICKERS = ['AAPL', 'TSLA', 'AMZN', 'MSFT', 'GOOGL', 'NVDA', 'META'];

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(value);
}

export function PredictionPanel() {
  const [ticker, setTicker] = useState('AAPL');
  const [budget, setBudget] = useState(10000);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionApiResponse | null>(null);

  const recentRows = useMemo(() => result?.prediction_table_15d ?? [], [result]);

  async function runPrediction() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, budget })
      });

      const data = (await response.json().catch(() => null)) as PredictionApiResponse & { detail?: string } | null;

      if (!response.ok || !data) {
        setError(data?.detail ?? 'Prediction request failed.');
        setResult(null);
        return;
      }

      setResult(data);
    } catch {
      setError('Prediction engine unavailable. Start FastAPI server and retry.');
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-white/5 p-5 shadow-sm shadow-black/5">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">ML prediction center</p>
          <h2 className="mt-2 text-xl font-semibold text-white">15-day forecast & profit analysis</h2>
        </div>
        <div className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-xs text-slate-300">
          Notebook model integrated
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-[0.9fr_1.1fr_auto]">
        <label className="grid gap-2 text-sm text-slate-400">
          Stock
          <select
            className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none transition focus:border-blue-400/60"
            value={ticker}
            onChange={(event) => setTicker(event.target.value)}
            disabled={isLoading}
          >
            {TICKERS.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm text-slate-400">
          Budget (USD)
          <input
            className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none transition focus:border-blue-400/60"
            type="number"
            min={100}
            step={100}
            value={budget}
            onChange={(event) => setBudget(Number(event.target.value))}
            disabled={isLoading}
          />
        </label>

        <button
          type="button"
          onClick={runPrediction}
          disabled={isLoading || budget < 100}
          className="h-fit rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Running...' : 'Run model'}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-5 space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-white/8 bg-slate-950/45 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-400">Overall profit</p>
              <p className={`mt-2 text-2xl font-semibold ${result.overall_profit >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                {formatMoney(result.overall_profit)}
              </p>
            </div>
            <div className="rounded-xl border border-white/8 bg-slate-950/45 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-400">Expected 15-day profit</p>
              <p className={`mt-2 text-2xl font-semibold ${result.expected_profit_15d >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                {formatMoney(result.expected_profit_15d)}
              </p>
            </div>
            <div className="rounded-xl border border-white/8 bg-slate-950/45 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-400">Net return</p>
              <p className={`mt-2 text-2xl font-semibold ${result.summary.net_pnl_percent >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                {result.summary.net_pnl_percent >= 0 ? '+' : ''}{result.summary.net_pnl_percent}%
              </p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-white/8 bg-slate-950/45 p-4">
              <p className="text-sm text-slate-300">Past profit trend</p>
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={result.past_profit_series}>
                    <CartesianGrid stroke="rgba(148,163,184,0.15)" strokeDasharray="3 3" />
                    <XAxis dataKey="date" stroke="#94a3b8" tickLine={false} axisLine={false} minTickGap={28} />
                    <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#0f172a', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 12 }}
                      formatter={(value: number) => formatMoney(value)}
                    />
                    <Line dataKey="profit" type="monotone" stroke="#60a5fa" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-white/8 bg-slate-950/45 p-4">
              <p className="text-sm text-slate-300">Expected profit (next 15 days)</p>
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={result.expected_profit_series}>
                    <defs>
                      <linearGradient id="expectedProfitFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34d399" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#34d399" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(148,163,184,0.15)" strokeDasharray="3 3" />
                    <XAxis dataKey="date" stroke="#94a3b8" tickLine={false} axisLine={false} minTickGap={28} />
                    <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#0f172a', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 12 }}
                      formatter={(value: number) => formatMoney(value)}
                    />
                    <Area dataKey="profit" type="monotone" stroke="#34d399" fill="url(#expectedProfitFill)" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/8 bg-slate-950/45 p-4">
            <p className="text-sm text-slate-300">15-day prediction table ({result.ticker})</p>
            <div className="mt-3 max-h-80 overflow-auto rounded-lg border border-white/5">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-900 text-slate-300">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Predicted Price</th>
                    <th className="px-3 py-2">Action</th>
                    <th className="px-3 py-2">Shares</th>
                    <th className="px-3 py-2">Equity</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRows.map((row) => (
                    <tr key={row.date} className="border-t border-white/5 text-slate-200">
                      <td className="px-3 py-2">{row.date}</td>
                      <td className="px-3 py-2">{formatMoney(row.predicted_price)}</td>
                      <td className="px-3 py-2">{row.action}</td>
                      <td className="px-3 py-2">{row.shares_traded}</td>
                      <td className="px-3 py-2">{formatMoney(row.total_equity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
