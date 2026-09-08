import { handle, handleCreated, parseBody } from '@/server/lib/api';
import { requireActor } from '@/server/lib/auth';
import { requestMeta } from '@/server/lib/audit';
import {
  updateProjectType,
  removeProjectType,
  projectTypePatchSchema,
} from '@/server/modules/settings/service';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  return handle(async () => {
    const actor = await requireActor();
    const { id } = await ctx.params;
    const body = await parseBody(request, projectTypePatchSchema);
    return updateProjectType(actor, id, body, requestMeta(request));
  });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  return handle(async () => {
    const actor = await requireActor();
    const { id } = await ctx.params;
    return removeProjectType(actor, id, requestMeta(_request));
  });
}
