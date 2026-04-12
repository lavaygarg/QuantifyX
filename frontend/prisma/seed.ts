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

  const alice = await prisma.user.upsert({
    where: { email: 'alice@trader.com' },
    update: {},
    create: {
      name: 'Alice Quant',
      email: 'alice@trader.com',
      passwordHash,
      portfolios: {
        create: {
          name: 'Growth Portfolio',
          cashBalance: 50000,
          holdings: {
            create: [
              { symbol: 'TSLA', quantity: 50, averageCost: 180.00, currentPrice: 175.00 },
              { symbol: 'GOOGL', quantity: 100, averageCost: 130.50, currentPrice: 155.00 }
            ]
          }
        }
      },
      watchlist: {
        create: [{ symbol: 'AAPL' }, { symbol: 'META' }]
      },
      transactions: {
        create: [
          { symbol: 'TSLA', side: 'BUY', quantity: 50, price: 180.00 },
          { symbol: 'GOOGL', side: 'BUY', quantity: 100, price: 130.50 }
        ]
      }
    }
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@trader.com' },
    update: {},
    create: {
      name: 'Bob The Builder',
      email: 'bob@trader.com',
      passwordHash,
      portfolios: {
        create: {
          name: 'Dividend Portfolio',
          cashBalance: 12000,
          holdings: {
            create: [
              { symbol: 'JNJ', quantity: 150, averageCost: 145.00, currentPrice: 150.00 },
              { symbol: 'KO', quantity: 200, averageCost: 55.00, currentPrice: 60.00 }
            ]
          }
        }
      },
      transactions: {
        create: [
          { symbol: 'JNJ', side: 'BUY', quantity: 150, price: 145.00 },
          { symbol: 'KO', side: 'BUY', quantity: 200, price: 55.00 }
        ]
      }
    }
  });

  console.log(`✅ Seeded user: ${user.email} (password: password123)`);
  console.log(`✅ Seeded user: ${alice.email} (password: password123)`);
  console.log(`✅ Seeded user: ${bob.email} (password: password123)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
