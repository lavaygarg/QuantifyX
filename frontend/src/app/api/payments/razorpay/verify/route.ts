import crypto from 'crypto';
import Razorpay from 'razorpay';
import { z } from 'zod';
import { requireSession } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

const bodySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1)
});

function getRazorpayServerClient() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('Razorpay server credentials are not configured');
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret
  });
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: 'Invalid payment verification payload' }, { status: 400 });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return Response.json({ error: 'Razorpay server credentials are not configured' }, { status: 500 });
  }

  const payload = `${parsed.data.razorpay_order_id}|${parsed.data.razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(payload)
    .digest('hex');

  if (expectedSignature !== parsed.data.razorpay_signature) {
    return Response.json({ error: 'Payment signature verification failed' }, { status: 400 });
  }

  try {
    const client = getRazorpayServerClient();
    const payment = await client.payments.fetch(parsed.data.razorpay_payment_id);

    if (String(payment.order_id) !== parsed.data.razorpay_order_id) {
      return Response.json({ error: 'Order and payment mismatch' }, { status: 400 });
    }

    if (payment.status !== 'captured') {
      return Response.json({ error: 'Payment not captured' }, { status: 400 });
    }

    const portfolio = await prisma.portfolio.findFirst({
      where: { userId: session.userId }
    });

    if (!portfolio) {
      return Response.json({ error: 'No portfolio found for user' }, { status: 404 });
    }

    const amount = Number(payment.amount) / 100;
    const paymentMarker = `RAZORPAY:${parsed.data.razorpay_payment_id}`;

    const existingDeposit = await prisma.transaction.findFirst({
      where: {
        userId: session.userId,
        side: 'DEPOSIT',
        symbol: paymentMarker
      }
    });

    if (existingDeposit) {
      return Response.json({
        success: true,
        cashBalance: portfolio.cashBalance,
        message: 'Payment already processed'
      });
    }

    const [, updatedPortfolio] = await prisma.$transaction([
      prisma.transaction.create({
        data: {
          userId: session.userId,
          symbol: paymentMarker,
          side: 'DEPOSIT',
          quantity: amount,
          price: 1
        }
      }),
      prisma.portfolio.update({
        where: { id: portfolio.id },
        data: {
          cashBalance: {
            increment: amount
          }
        }
      })
    ]);

    return Response.json({
      success: true,
      cashBalance: updatedPortfolio.cashBalance,
      message: 'Wallet top-up completed'
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Payment verification failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
