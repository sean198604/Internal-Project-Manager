import { handle } from '@/server/lib/api';
import { requireActor } from '@/server/lib/auth';
import { requestMeta } from '@/server/lib/audit';
import { unarchive } from '@/server/modules/projects/subresources';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Context) {
  return handle(async () => {
    const actor = await requireActor();
    const { id } = await params;
    return unarchive(actor, id, requestMeta(_request));
  });
}
