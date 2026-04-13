'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';

const ApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

type CandlestickProps = {
  ticker: string;
};

export function CandlestickChart({ ticker }: CandlestickProps) {
  const [data, setData] = useState<{ x: string; y: number[] }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        // Add NEXT_PUBLIC_API_URL prefix in case of separated frontend/backend config
        const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
        const encodedTicker = encodeURIComponent(ticker);
        const res = await fetch(`${apiUrl}/api/prices/${encodedTicker}/ohlc`);
        if (!res.ok) return;
        const ohlc = await res.json();
        setData(ohlc);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [ticker]);

  const options = useMemo(() => ({
    chart: {
      type: 'candlestick' as const,
      background: 'transparent',
      toolbar: {
        show: false,
      },
      animations: {
        enabled: false,
      },
    },
    theme: {
      mode: 'dark' as const,
    },
    plotOptions: {
      candlestick: {
        colors: {
          upward: '#10b981', // Emerald
          downward: '#f43f5e', // Rose
        },
        wick: {
          useFillColor: true,
        }
      },
    },
    xaxis: {
      type: 'datetime' as const,
      labels: {
        style: {
          colors: '#94a3b8',
        },
      },
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: {
      tooltip: {
        enabled: true,
      },
      labels: {
        style: {
          colors: '#94a3b8',
        },
        formatter: (value: number) => `$${value.toFixed(2)}`,
      },
    },
    grid: {
      borderColor: 'rgba(148,163,184,0.1)',
      strokeDashArray: 4,
    },
    tooltip: {
      theme: 'dark',
    },
  }), []);

  const series = [
    {
      name: 'OHLC',
      data: data,
    },
  ];

  return (
    <div className="rounded-2xl border border-white/8 bg-white/5 p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-400">Technical Analysis</p>
          <h2 className="text-lg font-semibold text-white">{ticker} Daily Candlesticks</h2>
        </div>
      </div>
      
      <div className="h-80 w-full">
        {isLoading ? (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-sm text-slate-400">Loading chart data...</span>
          </div>
        ) : (
          <ApexChart options={options} series={series} type="candlestick" height="100%" />
        )}
      </div>
    </div>
  );
}
