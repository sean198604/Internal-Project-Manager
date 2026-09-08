import { NextResponse } from 'next/server';
import { clearSessionCookie, getActorOrNull } from '@/server/lib/auth';
import { AuditAction, requestMeta, writeAudit } from '@/server/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const actor = await getActorOrNull();
  if (actor) {
    const meta = requestMeta(request);
    await writeAudit({
      actorId: actor.userId,
      action: AuditAction.LOGOUT,
      entity: 'USER',
      entityId: actor.userId,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  }

  await clearSessionCookie();
  return new NextResponse(null, { status: 204 });
}
