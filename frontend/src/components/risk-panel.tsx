'use client';

import { useState } from 'react';

const TICKERS = ['AAPL', 'TSLA', 'AMZN', 'MSFT', 'GOOGL', 'NVDA', 'META'];

type RiskData = {
  company: string;
  inputs: {
    prediction_score: number;
    sentiment_score: number;
    confidence: number;
    net_pnl_percent: number;
  };
  scores: {
    risk_score: number;
    signal_score: number;
    final_strength: number;
  };
  recommendation: {
    action: string;
    reason: string;
    strategy: string;
  };
};

export function RiskPanel() {
  const [ticker, setTicker] = useState('AAPL');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RiskData | null>(null);

  async function runRiskAnalysis() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/risk/company/${ticker}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || 'Risk analysis failed.');
        setResult(null);
        return;
      }

      setResult(data);
    } catch {
      setError('Risk Engine unavailable.');
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-white/5 p-5 shadow-sm shadow-black/5">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Analysis center</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Sentiment & Risk Engine</h2>
        </div>
        <div className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-xs text-slate-300">
          XGBoost + Sentiments API
        </div>
      </div>

      <div className="mt-5 flex gap-3">
        <label className="grid gap-2 text-sm text-slate-400">
          Select Stock
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

        <button
          className="h-fit self-end rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          onClick={runRiskAnalysis}
          disabled={isLoading}
        >
          {isLoading ? 'Running...' : 'Run Analysis'}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-5 space-y-5">
           <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-5 shadow-[inset_0_0_20px_rgba(139,92,246,0.05)]">
            <div className="flex items-center gap-2">
              <span className="text-lg">📊</span>
              <h3 className="font-semibold text-violet-200">Final Recommendation: {result.recommendation.action}</h3>
            </div>
            <p className="mt-2 text-[15px] leading-relaxed text-violet-100/90 font-medium">
              {result.recommendation.reason}
            </p>
            <p className="mt-2 text-[14px] leading-relaxed text-violet-100/70">
              {result.recommendation.strategy}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
             <div className="rounded-xl border border-white/8 bg-slate-950/45 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-400">Risk Score</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {result.scores.risk_score.toFixed(1)}
              </p>
            </div>
            <div className="rounded-xl border border-white/8 bg-slate-950/45 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-400">Signal Score</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {result.scores.signal_score.toFixed(1)}
              </p>
            </div>
             <div className="rounded-xl border border-white/8 bg-slate-950/45 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-400">Final Strength</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {result.scores.final_strength.toFixed(1)}
              </p>
            </div>
          </div>
         
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-white/8 bg-slate-950/45 p-4">
              <p className="text-sm font-medium text-slate-300">Sentiment Engine Inputs</p>
              <div className="mt-3 flex justify-between">
                <span className="text-sm text-slate-400">Analysis Score</span>
                <span className="text-sm font-semibold text-white">{result.inputs.sentiment_score.toFixed(2)}</span>
              </div>
            </div>
            <div className="rounded-xl border border-white/8 bg-slate-950/45 p-4">
               <p className="text-sm font-medium text-slate-300">XGBoost Algorithmic Inputs</p>
               <div className="mt-3 flex justify-between">
                <span className="text-sm text-slate-400">Expected Net PnL</span>
                <span className="text-sm font-semibold text-white">{result.inputs.net_pnl_percent}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
