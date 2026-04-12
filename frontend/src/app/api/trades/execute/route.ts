import { z } from 'zod';
import { requireSession } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

const tradeSchema = z.object({
  symbol: z.string().min(1),
  side: z.enum(['BUY', 'SELL']),
  quantity: z.number().positive(),
  price: z.number().nonnegative()
});

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const result = tradeSchema.safeParse(body);

  if (!result.success) {
    return Response.json(
      { error: 'Invalid trade payload', issues: result.error.flatten() },
      { status: 400 }
    );
  }

  const { symbol, side, quantity, price } = result.data;
  const totalCost = quantity * price;

  // Find user's portfolio
  const portfolio = await prisma.portfolio.findFirst({
    where: { userId: session.userId }
  });

  if (!portfolio) {
    return Response.json({ error: 'No portfolio found' }, { status: 404 });
  }

  if (side === 'BUY') {
    if (portfolio.cashBalance < totalCost) {
      return Response.json({ error: 'Insufficient cash balance' }, { status: 400 });
    }

    // Execute BUY in a transaction
    const [transaction] = await prisma.$transaction([
      prisma.transaction.create({
        data: {
          userId: session.userId,
          symbol,
          side,
          quantity,
          price
        }
      }),
      prisma.portfolio.update({
        where: { id: portfolio.id },
        data: { cashBalance: { decrement: totalCost } }
      }),
      prisma.holding.upsert({
        where: {
          portfolioId_symbol: {
            portfolioId: portfolio.id,
            symbol
          }
        },
        create: {
          portfolioId: portfolio.id,
          symbol,
          quantity,
          averageCost: price,
          currentPrice: price
        },
        update: {
          quantity: { increment: quantity },
          currentPrice: price
          // Note: averageCost recalculation would need a raw query or
          // application-level logic. We update currentPrice for now.
        }
      })
    ]);

    return Response.json(
      {
        status: 'executed',
        executedAt: transaction.createdAt.toISOString(),
        trade: { symbol, side, quantity, price }
      },
      { status: 201 }
    );
  } else {
    // SELL
    const holding = await prisma.holding.findUnique({
      where: {
        portfolioId_symbol: {
          portfolioId: portfolio.id,
          symbol
        }
      }
    });

    if (!holding || holding.quantity < quantity) {
      return Response.json({ error: 'Insufficient shares to sell' }, { status: 400 });
    }

    const newQty = holding.quantity - quantity;

    const txOps = [
      prisma.transaction.create({
        data: {
          userId: session.userId,
          symbol,
          side,
          quantity,
          price
        }
      }),
      prisma.portfolio.update({
        where: { id: portfolio.id },
        data: { cashBalance: { increment: totalCost } }
      })
    ];

    if (newQty <= 0) {
      txOps.push(
        prisma.holding.delete({
          where: { id: holding.id }
        })
      );
    } else {
      txOps.push(
        prisma.holding.update({
          where: { id: holding.id },
          data: {
            quantity: newQty,
            currentPrice: price
          }
        })
      );
    }

    const [transaction] = await prisma.$transaction(txOps);

    return Response.json(
      {
        status: 'executed',
        executedAt: (transaction as { createdAt: Date }).createdAt.toISOString(),
        trade: { symbol, side, quantity, price }
      },
      { status: 201 }
    );
  }
}
