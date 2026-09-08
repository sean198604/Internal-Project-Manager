import { PrismaClient } from '@prisma/client';
import { IS_PRODUCTION } from '@/lib/env';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: IS_PRODUCTION ? ['error'] : ['warn', 'error'],
  });

if (!IS_PRODUCTION) {
  globalForPrisma.prisma = prisma;
}
