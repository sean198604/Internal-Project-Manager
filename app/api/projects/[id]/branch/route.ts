import { handle, handleCreated, parseBody } from '@/server/lib/api';
import { requireActor } from '@/server/lib/auth';
import { requestMeta } from '@/server/lib/audit';
import { branch } from '@/server/modules/projects/subresources';
import { branchSchema } from '@/server/modules/projects/schema';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  return handleCreated(async () => {
    const actor = await requireActor();
    const { id } = await params;
    const input = await parseBody(request, branchSchema);
    return branch(actor, id, input, requestMeta(request));
  });
}
