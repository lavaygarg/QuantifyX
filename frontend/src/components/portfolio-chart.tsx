'use client';

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { chartPoints } from '@/lib/mock-data';
import { formatCompactCurrency } from '@/lib/portfolio';
import { useMemo } from 'react';

export function PortfolioChart() {
  const isUp = useMemo(() => {
    if (chartPoints.length < 2) return true;
    return chartPoints[chartPoints.length - 1].value >= chartPoints[0].value;
  }, []);
  
  const strokeColor = isUp ? "#34d399" : "#fb7185";
  const startColor = isUp ? "#10b981" : "#e11d48";
  
  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Portfolio value</p>
          <h2 className="text-xl font-semibold">Equity curve</h2>
        </div>
        <p className="text-sm text-emerald-400">+1.87% today</p>
      </div>
      <div className="mt-6 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartPoints}>
            <defs>
              <linearGradient id="portfolioFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={startColor} stopOpacity={0.65} />
                <stop offset="95%" stopColor={startColor} stopOpacity={0.01} />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} axisLine={false} />
            <YAxis
              stroke="#94a3b8"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => formatCompactCurrency(value)}
            />
            <Tooltip
              contentStyle={{
                background: '#0f172a',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: 16,
                color: '#e2e8f0'
              }}
              formatter={(value: number) => formatCompactCurrency(value)}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={strokeColor} 
              fill="url(#portfolioFill)" 
              strokeWidth={3} 
              filter="url(#glow)"
              activeDot={{ r: 6, fill: strokeColor, stroke: '#0f172a', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
