import { handle } from '@/server/lib/api';
import { requireActor } from '@/server/lib/auth';
import { getTimeline } from '@/server/modules/projects/subresources';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  return handle(async () => {
    const actor = await requireActor();
    const { id } = await params;
    const items = await getTimeline(actor, id);
    return {
      items: items.map((it) => ({
        id: it.id,
        eventType: it.eventType,
        title: it.title,
        description: it.description,
        meta: it.meta,
        occurredAt: it.occurredAt.toISOString(),
        actor: it.actor?.displayName ?? null,
      })),
    };
  });
}
