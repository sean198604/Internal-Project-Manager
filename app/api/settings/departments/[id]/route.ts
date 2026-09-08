import { handle, handleCreated, parseBody } from '@/server/lib/api';
import { requireActor } from '@/server/lib/auth';
import { requestMeta } from '@/server/lib/audit';
import {
  updateDepartment,
  removeDepartment,
  departmentPatchSchema,
} from '@/server/modules/settings/service';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  return handle(async () => {
    const actor = await requireActor();
    const { id } = await ctx.params;
    const body = await parseBody(request, departmentPatchSchema);
    return updateDepartment(actor, id, body, requestMeta(request));
  });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  return handle(async () => {
    const actor = await requireActor();
    const { id } = await ctx.params;
    return removeDepartment(actor, id, requestMeta(_request));
  });
}
