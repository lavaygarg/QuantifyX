import { requireSession } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const transactions = await prisma.transaction.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  return Response.json({
    transactions: transactions.map((t) => ({
      id: t.id,
      symbol: t.symbol,
      side: t.side,
      quantity: t.quantity,
      price: t.price,
      timestamp: t.createdAt.toISOString()
    }))
  });
}
