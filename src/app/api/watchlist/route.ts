import { z } from 'zod';
import { requireSession } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const items = await prisma.watchlistItem.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'desc' }
  });

  return Response.json({
    watchlist: items.map((item) => ({
      id: item.id,
      symbol: item.symbol,
      createdAt: item.createdAt.toISOString()
    }))
  });
}

const addSchema = z.object({
  symbol: z.string().min(1).max(10)
});

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const result = addSchema.safeParse(body);

  if (!result.success) {
    return Response.json(
      { error: 'Invalid payload', issues: result.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const item = await prisma.watchlistItem.create({
      data: {
        userId: session.userId,
        symbol: result.data.symbol.toUpperCase()
      }
    });

    return Response.json(
      { message: 'Added to watchlist', item: { id: item.id, symbol: item.symbol } },
      { status: 201 }
    );
  } catch {
    return Response.json({ error: 'Symbol already in watchlist' }, { status: 409 });
  }
}

export async function DELETE(request: Request) {
  const session = await requireSession();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return Response.json({ error: 'Symbol query param required' }, { status: 400 });
  }

  try {
    await prisma.watchlistItem.delete({
      where: {
        userId_symbol: {
          userId: session.userId,
          symbol: symbol.toUpperCase()
        }
      }
    });

    return Response.json({ message: 'Removed from watchlist' });
  } catch {
    return Response.json({ error: 'Symbol not found in watchlist' }, { status: 404 });
  }
}
