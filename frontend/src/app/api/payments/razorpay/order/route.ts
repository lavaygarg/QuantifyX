import Razorpay from 'razorpay';
import { z } from 'zod';
import { requireSession } from '@/lib/auth-helpers';

const bodySchema = z.object({
  amount: z.number().int().positive().max(500000)
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
    return Response.json({ error: 'Invalid payment amount' }, { status: 400 });
  }

  try {
    const client = getRazorpayServerClient();
    const order = await client.orders.create({
      amount: parsed.data.amount * 100,
      currency: 'INR',
      receipt: `rcpt_${session.userId.substring(0, 8)}_${Date.now()}`,
      notes: {
        userId: session.userId,
        email: session.email ?? ''
      }
    });

    return Response.json({
      orderId: order.id,
      amount: parsed.data.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      name: 'Tradify',
      description: 'Wallet top-up for simulated trading'
    });
  } catch (error: any) {
    const sdkError = error?.error?.description || error?.message || String(error);
    const message = `Payment API Error: ${sdkError}`;
    return Response.json({ error: message }, { status: 500 });
  }
}
