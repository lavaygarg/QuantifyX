"use client";

import { useState } from 'react';
import { BarChart3, BrainCircuit, CandlestickChart, History, ListChecks } from 'lucide-react';
import { HoldingsTable } from '@/components/holdings-table';
import { PortfolioChart } from '@/components/portfolio-chart';
import { PredictionPanel } from '@/components/prediction-panel';
import { TradeTicket } from '@/components/trade-ticket';
import { TransactionsPanel } from '@/components/transactions-panel';
import { WatchlistPanel } from '@/components/watchlist-panel';
import type { Holding, Transaction, WatchlistItem } from '@/lib/types';

type DashboardTab = 'trading' | 'holdings' | 'watchlist' | 'transactions' | 'ml';

const tabs: Array<{ key: DashboardTab; label: string; description: string; icon: React.ReactNode }> = [
  { key: 'trading', label: 'Trading', description: 'Chart + trade ticket', icon: <CandlestickChart className="h-4 w-4" /> },
  { key: 'holdings', label: 'Holdings', description: 'Positions and P&L', icon: <BarChart3 className="h-4 w-4" /> },
  { key: 'watchlist', label: 'Watchlist', description: 'Tracked symbols', icon: <ListChecks className="h-4 w-4" /> },
  { key: 'transactions', label: 'Recent Transactions', description: 'Trade history', icon: <History className="h-4 w-4" /> },
  { key: 'ml', label: 'ML Prediction', description: 'Forecasts and risk', icon: <BrainCircuit className="h-4 w-4" /> }
];

export function DashboardTabs({
  holdings,
  watchlist,
  transactions
}: {
  holdings: Holding[];
  watchlist: WatchlistItem[];
  transactions: Transaction[];
}) {
  const [activeTab, setActiveTab] = useState<DashboardTab>('trading');

  return (
    <div className="rounded-[1.75rem] border border-slate-700/70 bg-slate-950/60 shadow-xl shadow-black/10 backdrop-blur-sm">
      <div className="border-b border-white/5 px-4 pt-4 md:px-6 md:pt-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Workspace</p>
            <h2 className="mt-2 text-lg font-semibold text-white">Trading dashboard</h2>
          </div>
          <p className="hidden text-sm text-slate-400 md:block">Clean tabs for trading, holdings, watchlist, transactions, and ML.</p>
        </div>

        <div className="mt-5 grid gap-2 pb-4 sm:grid-cols-2 xl:grid-cols-5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  isActive
                    ? 'border-blue-400/40 bg-gradient-to-br from-blue-500/20 to-violet-500/12 text-white'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/8 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={isActive ? 'text-blue-200' : 'text-slate-400'}>{tab.icon}</span>
                  <div className="text-sm font-medium">{tab.label}</div>
                </div>
                <div className="mt-1 text-xs leading-5 text-current/70">{tab.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 md:p-6">
        {activeTab === 'trading' && (
          <div className="grid gap-5 xl:grid-cols-[1.4fr_0.9fr]">
            <PortfolioChart />
            <TradeTicket />
          </div>
        )}

        {activeTab === 'holdings' && <HoldingsTable holdings={holdings} />}

        {activeTab === 'watchlist' && <WatchlistPanel watchlist={watchlist} />}

        {activeTab === 'transactions' && <TransactionsPanel transactions={transactions} />}

        {activeTab === 'ml' && <PredictionPanel />}
      </div>
    </div>
  );
}