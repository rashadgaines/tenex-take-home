import { PrismaClient } from '@prisma/client';
import { neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  // POSTGRES_PRISMA_URL is for connection pooling (Vercel/Neon)
  // DATABASE_URL is for local development
  const databaseUrl = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('Database URL not configured. Set POSTGRES_PRISMA_URL or DATABASE_URL environment variable.');
  }

  // Use Neon serverless adapter for Vercel deployment
  neonConfig.webSocketConstructor = ws;
  const adapter = new PrismaNeon({ connectionString: databaseUrl });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
