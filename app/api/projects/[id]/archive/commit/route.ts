import { handle, parseBody } from '@/server/lib/api';
import { requireActor } from '@/server/lib/auth';
import { requestMeta } from '@/server/lib/audit';
import { archive } from '@/server/modules/projects/subresources';
import { archiveSchema } from '@/server/modules/projects/schema';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  return handle(async () => {
    const actor = await requireActor();
    const { id } = await params;
    const input = await parseBody(request, archiveSchema);
    return archive(actor, id, input, requestMeta(request));
  });
}
