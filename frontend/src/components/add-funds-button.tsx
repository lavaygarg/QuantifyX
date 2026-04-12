"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  userName?: string | null;
  userEmail?: string | null;
};

async function loadRazorpayScript() {
  return new Promise<boolean>((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function AddFundsButton({ userName, userEmail }: Props) {
  const router = useRouter();
  const [amount, setAmount] = useState(2000);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function startTopUp() {
    setMessage(null);
    setLoading(true);

    try {
      const isSdkReady = await loadRazorpayScript();
      if (!isSdkReady) {
        setMessage('Unable to load Razorpay checkout.');
        setLoading(false);
        return;
      }

      const orderRes = await fetch('/api/payments/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        setMessage(orderData.error ?? 'Failed to create payment order.');
        setLoading(false);
        return;
      }

      if (!orderData.keyId) {
        setMessage('Keys missing. Please cleanly restart your terminal/Next.js server so it reads the .env file!');
        setLoading(false);
        return;
      }

      const razorpay = new window.Razorpay({
        key: orderData.keyId,
        amount: orderData.amount * 100,
        currency: orderData.currency,
        name: orderData.name,
        description: orderData.description,
        order_id: orderData.orderId,
        prefill: {
          name: userName ?? undefined,
          email: userEmail ?? undefined
        },
        theme: {
          color: '#3b82f6'
        },
        handler: async (response) => {
          const verifyRes = await fetch('/api/payments/razorpay/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...response
            })
          });

          const verifyData = await verifyRes.json();
          if (!verifyRes.ok) {
            setMessage(verifyData.error ?? 'Payment verification failed.');
            setLoading(false);
            return;
          }

          setMessage('Funds added successfully.');
          setLoading(false);
          setOpen(false);
          router.refresh();
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          }
        }
      });

      razorpay.on('payment.failed', (response) => {
        const description = response.error?.description ?? 'Payment failed. Please try again.';
        setMessage(description);
        setLoading(false);
      });

      razorpay.open();
    } catch {
      setMessage('Payment failed to start.');
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/25"
      >
        Add Funds
      </button>

      {open && (
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2">
          <input
            type="number"
            min={100}
            step={100}
            value={amount}
            onChange={(event) => setAmount(Number(event.target.value))}
            className="w-28 rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-sm text-white outline-none"
          />
          <button
            type="button"
            disabled={loading || amount < 100}
            onClick={startTopUp}
            className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Pay'}
          </button>
        </div>
      )}

      {message && <span className="text-xs text-slate-300">{message}</span>}
    </div>
  );
}
