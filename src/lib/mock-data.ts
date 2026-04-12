import type { Asset, Holding, Transaction, WatchlistItem } from './types';

export const portfolioSummary = {
  cashBalance: 24890,
  invested: 75110,
  totalValue: 100000,
  dayChange: 1840,
  dayChangePercent: 1.87,
  realizedPnL: 9240,
  unrealizedPnL: 11870
};

export const assets: Asset[] = [
  { symbol: 'AAPL', name: 'Apple', price: 195.42, change: 2.18, changePercent: 1.13, market: 'NASDAQ' },
  { symbol: 'MSFT', name: 'Microsoft', price: 421.77, change: 4.28, changePercent: 1.02, market: 'NASDAQ' },
  { symbol: 'NVDA', name: 'NVIDIA', price: 889.13, change: -8.55, changePercent: -0.95, market: 'NASDAQ' },
  { symbol: 'TSLA', name: 'Tesla', price: 173.54, change: 3.12, changePercent: 1.83, market: 'NASDAQ' }
];

export const stockAssets: Asset[] = assets;

export const cryptoAssets: Asset[] = [
  { symbol: 'BTC/USD', name: 'Bitcoin', price: 68240.33, change: 942.8, changePercent: 1.4, market: 'CRYPTO' },
  { symbol: 'ETH/USD', name: 'Ethereum', price: 3455.71, change: 88.5, changePercent: 2.63, market: 'CRYPTO' },
  { symbol: 'SOL/USD', name: 'Solana', price: 162.43, change: -3.87, changePercent: -2.33, market: 'CRYPTO' },
  { symbol: 'AVAX/USD', name: 'Avalanche', price: 41.26, change: 1.14, changePercent: 2.84, market: 'CRYPTO' }
];

export const holdings: Holding[] = [
  { symbol: 'AAPL', quantity: 42, averageCost: 173.1, currentPrice: 195.42 },
  { symbol: 'MSFT', quantity: 18, averageCost: 384.28, currentPrice: 421.77 },
  { symbol: 'NVDA', quantity: 9, averageCost: 801.5, currentPrice: 889.13 }
];

export const watchlist: WatchlistItem[] = [
  { symbol: 'AMZN', name: 'Amazon', price: 184.21, trend: 'up' },
  { symbol: 'META', name: 'Meta', price: 492.64, trend: 'up' },
  { symbol: 'GOOGL', name: 'Alphabet', price: 159.33, trend: 'down' },
  { symbol: 'AMD', name: 'AMD', price: 168.92, trend: 'up' }
];

export const transactions: Transaction[] = [
  { id: 'tx-001', symbol: 'AAPL', side: 'BUY', quantity: 12, price: 171.2, timestamp: '2026-04-11T10:14:00Z' },
  { id: 'tx-002', symbol: 'MSFT', side: 'BUY', quantity: 6, price: 389.8, timestamp: '2026-04-10T13:28:00Z' },
  { id: 'tx-003', symbol: 'NVDA', side: 'SELL', quantity: 2, price: 871.4, timestamp: '2026-04-09T15:41:00Z' }
];

export const chartPoints = [
  { name: 'Mon', value: 98000 },
  { name: 'Tue', value: 99450 },
  { name: 'Wed', value: 98920 },
  { name: 'Thu', value: 100240 },
  { name: 'Fri', value: 100000 }
];
