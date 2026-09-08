import { handle, handleCreated, parseBody } from '@/server/lib/api';
import { requireActor } from '@/server/lib/auth';
import { requestMeta } from '@/server/lib/audit';
import { listDeployments, createDeployment } from '@/server/modules/projects/subresources';
import { deploymentSchema } from '@/server/modules/projects/schema';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  return handle(async () => {
    const actor = await requireActor();
    const { id } = await params;
    return { items: await listDeployments(actor, id) };
  });
}

export async function POST(request: Request, { params }: Context) {
  return handleCreated(async () => {
    const actor = await requireActor();
    const { id } = await params;
    const input = await parseBody(request, deploymentSchema);
    return createDeployment(actor, id, input, requestMeta(request));
  });
}
