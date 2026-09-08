import { NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  let database: 'ok' | 'failed' = 'ok';
  let dbLatencyMs = 0;

  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - started;
  } catch {
    database = 'failed';
  }

  const status = database === 'ok' ? 200 : 503;

  return NextResponse.json(
    {
      data: {
        app: 'ok',
        database,
        dbLatencyMs,
        // AI 属 P2；P0 阶段恒为未启用，不阻塞任何主功能
        ai: { status: 'disabled', message: 'AI 模块尚未启用（P2）' },
        timestamp: new Date().toISOString(),
      },
    },
    { status },
  );
}
