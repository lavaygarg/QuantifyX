import type { Transaction } from '@/lib/types';
import { formatCurrency } from '@/lib/portfolio';

export function TransactionsPanel({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) {
    return (
      <div className="rounded-2xl border border-white/8 bg-white/5 p-5 shadow-sm shadow-black/5">
        <h2 className="text-xl font-semibold text-white">Recent transactions</h2>
        <p className="mt-4 text-sm text-slate-400">
          No transactions yet. Execute your first trade to see history here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-white/5 p-5 shadow-sm shadow-black/5">
      <h2 className="text-xl font-semibold text-white">Recent transactions</h2>
      <div className="mt-4 space-y-3">
        {transactions.map((transaction) => {
          const isDeposit = transaction.side === 'DEPOSIT';
          const isRazorpayDeposit = isDeposit && transaction.symbol.startsWith('RAZORPAY:');
          const displayAmount = isDeposit
            ? formatCurrency(transaction.quantity)
            : formatCurrency(transaction.price);

          return (
            <div key={transaction.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-950/35 px-4 py-3">
              <div>
                <div className="font-medium text-white">
                  {isDeposit ? 'WALLET TOP-UP' : `${transaction.side} ${transaction.symbol}`}
                </div>
                <div className="text-sm text-slate-400">{new Date(transaction.timestamp).toLocaleString()}</div>
              </div>
              <div className="text-right text-sm text-slate-400">
                <div>{isDeposit ? `${isRazorpayDeposit ? 'INR' : transaction.symbol} deposit` : `${transaction.quantity} shares`}</div>
                <div className="font-medium text-white">{displayAmount}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
