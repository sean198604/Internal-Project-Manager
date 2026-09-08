import { handle, noContent, parseBody } from '@/server/lib/api';
import { requireActor } from '@/server/lib/auth';
import { requestMeta } from '@/server/lib/audit';
import * as projectService from '@/server/modules/projects/service';
import { updateProjectSchema } from '@/server/modules/projects/schema';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  return handle(async () => {
    const actor = await requireActor();
    const { id } = await params;
    return projectService.detail(actor, id);
  });
}

export async function PATCH(request: Request, { params }: Context) {
  return handle(async () => {
    const actor = await requireActor();
    const { id } = await params;
    const input = await parseBody(request, updateProjectSchema);
    return projectService.update(actor, id, input, requestMeta(request));
  });
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const actor = await requireActor();
    const { id } = await params;
    await projectService.softDelete(actor, id, requestMeta(request));
    return noContent();
  } catch (err) {
    const { fail } = await import('@/server/lib/api');
    return fail(err);
  }
}
