import { handle, handleCreated, parseBody } from '@/server/lib/api';
import { requireActor } from '@/server/lib/auth';
import { requestMeta } from '@/server/lib/audit';
import { listUpdates, createUpdate } from '@/server/modules/projects/subresources';
import { createUpdateSchema } from '@/server/modules/projects/schema';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  return handle(async () => {
    const actor = await requireActor();
    const { id } = await params;
    const items = await listUpdates(actor, id);
    return { items };
  });
}

export async function POST(request: Request, { params }: Context) {
  return handleCreated(async () => {
    const actor = await requireActor();
    const { id } = await params;
    const input = await parseBody(request, createUpdateSchema);
    return createUpdate(actor, id, input, requestMeta(request));
  });
}
