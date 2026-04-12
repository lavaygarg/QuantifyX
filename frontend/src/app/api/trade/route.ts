export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);

  if (!payload) {
    return Response.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const fastapiBaseUrl = process.env.FASTAPI_BASE_URL ?? 'http://127.0.0.1:8000';
  try {
    const upstreamResponse = await fetch(`${fastapiBaseUrl}/api/trade`, {
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
      { detail: 'Trading engine unavailable. Start FastAPI server and retry.' },
      { status: 503 }
    );
  }
}
