import { handle, parseBody } from '@/server/lib/api';
import { requireActor } from '@/server/lib/auth';
import { requestMeta } from '@/server/lib/audit';
import { updateUser, userPatchSchema } from '@/server/modules/settings/service';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  return handle(async () => {
    const actor = await requireActor();
    const { id } = await ctx.params;
    const body = await parseBody(request, userPatchSchema);
    return updateUser(actor, id, body, requestMeta(request));
  });
}
