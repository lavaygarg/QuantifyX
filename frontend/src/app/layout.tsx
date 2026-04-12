import type { Metadata } from 'next';
import { SessionProvider } from '@/components/session-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Smart Trading Platform',
  description: 'Simulated trading, portfolio insights, and ML-ready market intelligence.'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
