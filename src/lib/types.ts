export type Asset = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  market: string;
};

export type Holding = {
  symbol: string;
  quantity: number;
  averageCost: number;
  currentPrice: number;
};

export type Transaction = {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL' | 'DEPOSIT';
  quantity: number;
  price: number;
  timestamp: string;
};

export type WatchlistItem = {
  symbol: string;
  name: string;
  price: number;
  trend: 'up' | 'down';
};
