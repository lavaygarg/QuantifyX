import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const passwordHash = await bcrypt.hash('password123', 12);

  const user = await prisma.user.upsert({
    where: { email: 'demo@trader.com' },
    update: {},
    create: {
      name: 'Demo Trader',
      email: 'demo@trader.com',
      passwordHash,
      portfolios: {
        create: {
          name: 'Main Portfolio',
          cashBalance: 24890,
          holdings: {
            create: [
              { symbol: 'AAPL', quantity: 42, averageCost: 173.10, currentPrice: 195.42 },
              { symbol: 'MSFT', quantity: 18, averageCost: 384.28, currentPrice: 421.77 },
              { symbol: 'NVDA', quantity: 9, averageCost: 801.50, currentPrice: 889.13 }
            ]
          }
        }
      },
      watchlist: {
        create: [
          { symbol: 'AMZN' },
          { symbol: 'META' },
          { symbol: 'GOOGL' },
          { symbol: 'AMD' }
        ]
      },
      transactions: {
        create: [
          { symbol: 'AAPL', side: 'BUY', quantity: 12, price: 171.20 },
          { symbol: 'MSFT', side: 'BUY', quantity: 6, price: 389.80 },
          { symbol: 'NVDA', side: 'SELL', quantity: 2, price: 871.40 }
        ]
      }
    }
  });

  console.log(`✅ Seeded user: ${user.email} (password: password123)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
