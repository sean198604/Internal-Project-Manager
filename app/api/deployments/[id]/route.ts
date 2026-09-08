import { handle, parseBody } from '@/server/lib/api';
import { requireActor } from '@/server/lib/auth';
import { requestMeta } from '@/server/lib/audit';
import { updateDeployment, deleteDeployment } from '@/server/modules/projects/subresources';
import { updateDeploymentSchema } from '@/server/modules/projects/schema';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  return handle(async () => {
    const actor = await requireActor();
    const { id } = await params;
    const input = await parseBody(request, updateDeploymentSchema);
    return updateDeployment(actor, id, input, requestMeta(request));
  });
}

export async function DELETE(request: Request, { params }: Context) {
  return handle(async () => {
    const actor = await requireActor();
    const { id } = await params;
    return deleteDeployment(actor, id, requestMeta(request));
  });
}
