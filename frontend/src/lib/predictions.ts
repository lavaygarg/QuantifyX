export type PredictionSignal = {
  symbol: string;
  direction: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  horizon: string;
  predictedMovePercent: number;
  rationale: string;
};

export const predictionSignals: PredictionSignal[] = [
  {
    symbol: 'AAPL',
    direction: 'bullish',
    confidence: 82,
    horizon: 'Next 5 trading days',
    predictedMovePercent: 2.8,
    rationale: 'Momentum remains strong with positive earnings revision bias and steady volume.'
  },
  {
    symbol: 'MSFT',
    direction: 'bullish',
    confidence: 78,
    horizon: 'Next 3 trading days',
    predictedMovePercent: 1.9,
    rationale: 'Lower volatility profile supports a continuation trend with favorable technical structure.'
  },
  {
    symbol: 'NVDA',
    direction: 'neutral',
    confidence: 64,
    horizon: 'Next 7 trading days',
    predictedMovePercent: 0.6,
    rationale: 'Price is extended after a sharp run-up; model sees a consolidation range.'
  }
];

export const portfolioRiskScore = {
  score: 38,
  label: 'Moderate risk',
  summary: 'Portfolio concentration is manageable, but tech-heavy exposure keeps downside sensitivity above average.'
};
