import type { Holding } from './types';

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(value);
}

export function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value);
}

export function calculateHoldingValue(holding: Holding) {
  return holding.quantity * holding.currentPrice;
}

export function calculateHoldingPnL(holding: Holding) {
  return (holding.currentPrice - holding.averageCost) * holding.quantity;
}

export function calculatePortfolioValue(holdings: Holding[]) {
  return holdings.reduce((total, holding) => total + calculateHoldingValue(holding), 0);
}
