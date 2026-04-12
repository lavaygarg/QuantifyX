import { assets } from '@/lib/mock-data';

export async function GET() {
  return Response.json({
    updatedAt: new Date().toISOString(),
    assets
  });
}
