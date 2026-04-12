import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { StatCard } from '@/components/stat-card';
import { DashboardTabs } from '@/components/dashboard-tabs';
import { SignOutButton } from '@/components/sign-out-button';
import { AddFundsButton } from '@/components/add-funds-button';
import { formatCurrency } from '@/lib/portfolio';
import type { Holding, Transaction, WatchlistItem } from '@/lib/types';
import { BriefcaseBusiness, ChartNoAxesCombined, Wallet, Sparkles } from 'lucide-react';

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  const userId = (session.user as { id: string }).id;

  // Fetch portfolio data server-side
  const portfolio = await prisma.portfolio.findFirst({
    where: { userId },
    include: { holdings: true }
  });

  const holdingsValue =
    portfolio?.holdings.reduce((sum: number, holding: Holding) => sum + holding.quantity * holding.currentPrice, 0) ?? 0;

  const totalCost =
    portfolio?.holdings.reduce((sum: number, holding: Holding) => sum + holding.quantity * holding.averageCost, 0) ?? 0;

  const cashBalance = portfolio?.cashBalance ?? 0;
  const totalValue = cashBalance + holdingsValue;
  const unrealizedPnL = holdingsValue - totalCost;

  const holdings: Holding[] =
    portfolio?.holdings.map((holding: { symbol: string; quantity: number; averageCost: number; currentPrice: number }) => ({
      symbol: holding.symbol,
      quantity: holding.quantity,
      averageCost: holding.averageCost,
      currentPrice: holding.currentPrice
    })) ?? [];

  const transactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  const formattedTransactions: Transaction[] = transactions.map((transaction: {
    id: string;
    symbol: string;
    side: string;
    quantity: number;
    price: number;
    createdAt: Date;
  }) => ({
    id: transaction.id,
    symbol: transaction.symbol,
    side: transaction.side as 'BUY' | 'SELL' | 'DEPOSIT',
    quantity: transaction.quantity,
    price: transaction.price,
    timestamp: transaction.createdAt.toISOString()
  }));

  const watchlistItems = await prisma.watchlistItem.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });

  const formattedWatchlist: WatchlistItem[] = watchlistItems.map((watchlistItem: { symbol: string }) => ({
    symbol: watchlistItem.symbol,
    name: watchlistItem.symbol,
    price: 0,
    trend: 'up'
  }));

  return (
    <main className="dashboard-background mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
      <section className="rounded-[1.75rem] border border-white/20 bg-white/10 px-6 py-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] backdrop-blur-2xl md:px-8 md:py-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">QuantifyX</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-5xl">
              Welcome back, {session.user.name ?? 'Trader'}.
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-400 md:text-lg">
              A clean trading workspace for simulated orders, portfolio tracking, watchlists, and ML insights.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-blue-400/25 bg-blue-500/10 px-3 py-1 text-xs text-blue-200">Paper trading live</span>
              <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">SQLite ledger synced</span>
              <span className="rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1 text-xs text-violet-200">ML tab ready</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
            <span className="text-sm text-slate-300">{session.user.email}</span>
            <AddFundsButton userName={session.user.name} userEmail={session.user.email} />
            <SignOutButton />
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Portfolio value"
          value={formatCurrency(totalValue)}
          detail="Total cash + holdings"
          icon={<ChartNoAxesCombined className="h-4 w-4" />}
        />
        <StatCard
          label="Cash balance"
          value={formatCurrency(cashBalance)}
          detail="Available buying power"
          icon={<Wallet className="h-4 w-4" />}
        />
        <StatCard
          label="Holdings value"
          value={formatCurrency(holdingsValue)}
          detail={`${holdings.length} position${holdings.length !== 1 ? 's' : ''}`}
          icon={<BriefcaseBusiness className="h-4 w-4" />}
        />
        <StatCard
          label="Unrealized P&L"
          value={formatCurrency(unrealizedPnL)}
          detail="Open position performance"
          tone={unrealizedPnL >= 0 ? 'positive' : 'negative'}
          icon={<Sparkles className="h-4 w-4" />}
        />
      </section>

      <section className="mt-8">
        <DashboardTabs holdings={holdings} watchlist={formattedWatchlist} transactions={formattedTransactions} />
      </section>
    </main>
  );
}
