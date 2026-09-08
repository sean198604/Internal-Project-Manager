import { handle } from '@/server/lib/api';
import { requireActor } from '@/server/lib/auth';
import { getHistory } from '@/server/modules/projects/subresources';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  return handle(async () => {
    const actor = await requireActor();
    const { id } = await params;
    const items = await getHistory(actor, id);
    return {
      items: items.map((h) => ({
        id: h.id,
        action: h.action,
        entity: h.entity,
        changedFields: h.changedFields,
        before: h.before,
        after: h.after,
        reason: h.reason,
        ip: h.ip,
        createdAt: h.createdAt.toISOString(),
        actor: h.user?.displayName ?? null,
      })),
    };
  });
}
