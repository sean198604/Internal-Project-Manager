import type { Prisma } from '@prisma/client';
import { prisma } from '@/server/db/prisma';

/**
 * 生成项目编号 PRJ-YYYY-NNNN。
 * 使用序列表 + 原子 upsert（INSERT ... ON CONFLICT DO UPDATE），
 * 并发安全，不使用 MAX()+1。
 */
export async function generateProjectCode(
  tx: Prisma.TransactionClient = prisma,
  date: Date = new Date(),
): Promise<string> {
  const year = date.getUTCFullYear();

  const row = await tx.projectSequence.upsert({
    where: { year },
    update: { lastValue: { increment: 1 } },
    create: { year, lastValue: 1 },
  });

  return `PRJ-${year}-${String(row.lastValue).padStart(4, '0')}`;
}
