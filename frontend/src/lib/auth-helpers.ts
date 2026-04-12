import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

export async function requireSession() {
  const session = await getServerSession(authOptions);

  if (!session?.user || !(session.user as { id?: string }).id) {
    return null;
  }

  return {
    userId: (session.user as { id: string }).id,
    name: session.user.name,
    email: session.user.email
  };
}
