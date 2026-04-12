const fastapiBaseUrl = process.env.FASTAPI_BASE_URL ?? 'http://127.0.0.1:8000';

function normalizePayload(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const body = payload as Record<string, unknown>;
  const ticker = String(body.ticker ?? '').toUpperCase().trim();
  const budget = Number(body.budget);

  if (!ticker || Number.isNaN(budget) || budget <= 0) {
    return null;
  }

  return {
    ticker,
    budget,
    max_transactions: Number(body.max_transactions ?? 3),
    cooldown: Number(body.cooldown ?? 1),
    fee_per_trade: Number(body.fee_per_trade ?? 1)
  };
}

export async function POST(request: Request) {
  const rawPayload = await request.json().catch(() => null);
  const payload = normalizePayload(rawPayload);

  if (!payload) {
    return Response.json({ detail: 'Invalid payload. Send ticker and budget.' }, { status: 400 });
  }

  try {
    const upstreamResponse = await fetch(`${fastapiBaseUrl}/api/predictions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const bodyText = await upstreamResponse.text();
    const contentType = upstreamResponse.headers.get('content-type') ?? 'application/json';

    return new Response(bodyText, {
      status: upstreamResponse.status,
      headers: {
        'Content-Type': contentType
      }
    });
  } catch {
    return Response.json(
      { detail: 'Prediction engine unavailable. Start FastAPI server and retry.' },
      { status: 503 }
    );
  }
}
