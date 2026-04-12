import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export function StatCard({
  label,
  value,
  detail,
  icon,
  tone = 'default'
}: {
  label: string;
  value: string;
  detail: string;
  icon?: ReactNode;
  tone?: 'default' | 'positive' | 'negative';
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.06] p-5 shadow-md shadow-black/10',
        tone === 'positive' && 'border-emerald-500/25 bg-emerald-500/[0.07]',
        tone === 'negative' && 'border-rose-500/25 bg-rose-500/[0.07]'
      )}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-400">{label}</p>
        {icon ? <div className="text-slate-300/90">{icon}</div> : null}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</div>
      <p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p>
    </div>
  );
}
