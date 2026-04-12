import { requireSession } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const portfolio = await prisma.portfolio.findFirst({
    where: { userId: session.userId },
    include: {
      holdings: true
    }
  });

  if (!portfolio) {
    return Response.json({
      summary: {
        cashBalance: 0,
        invested: 0,
        totalValue: 0,
        dayChange: 0,
        dayChangePercent: 0,
        holdingsValue: 0
      },
      holdings: []
    });
  }

  const holdingsValue = portfolio.holdings.reduce(
    (sum, h) => sum + h.quantity * h.currentPrice,
    0
  );

  const totalCost = portfolio.holdings.reduce(
    (sum, h) => sum + h.quantity * h.averageCost,
    0
  );

  const unrealizedPnL = holdingsValue - totalCost;
  const totalValue = portfolio.cashBalance + holdingsValue;

  return Response.json({
    summary: {
      cashBalance: portfolio.cashBalance,
      invested: totalCost,
      totalValue,
      holdingsValue,
      unrealizedPnL,
      dayChange: 0,
      dayChangePercent: 0
    },
    holdings: portfolio.holdings.map((h) => ({
      symbol: h.symbol,
      quantity: h.quantity,
      averageCost: h.averageCost,
      currentPrice: h.currentPrice
    }))
  });
}
