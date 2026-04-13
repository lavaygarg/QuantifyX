const fastapiBaseUrl = process.env.FASTAPI_BASE_URL ?? 'http://127.0.0.1:8000';

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await params;
    const resolvedPath = path.join('/');
    
    // Pass query params as well just in case
    const url = new URL(request.url);
    const queryStr = url.search;

    const upstreamResponse = await fetch(`${fastapiBaseUrl}/risk/${resolvedPath}${queryStr}`, {
      method: 'GET',
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
      { detail: 'Risk engine unavailable. Start FastAPI server and retry.' },
      { status: 503 }
    );
  }
}
