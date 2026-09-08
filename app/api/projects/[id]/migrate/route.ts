import { handle, parseBody } from '@/server/lib/api';
import { requireActor } from '@/server/lib/auth';
import { requestMeta } from '@/server/lib/audit';
import { migrate } from '@/server/modules/projects/subresources';
import { migrationSchema } from '@/server/modules/projects/schema';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  return handle(async () => {
    const actor = await requireActor();
    const { id } = await params;
    const input = await parseBody(request, migrationSchema);
    return migrate(actor, id, input, requestMeta(request));
  });
}
