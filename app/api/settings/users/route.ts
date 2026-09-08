import { handle, handleCreated, parseBody } from '@/server/lib/api';
import { requireActor } from '@/server/lib/auth';
import { requestMeta } from '@/server/lib/audit';
import { listUsersAdmin, createUser, userInputSchema } from '@/server/modules/settings/service';

export const dynamic = 'force-dynamic';

export async function GET() {
  return handle(async () => {
    const actor = await requireActor();
    return listUsersAdmin(actor);
  });
}

export async function POST(request: Request) {
  return handleCreated(async () => {
    const actor = await requireActor();
    const body = await parseBody(request, userInputSchema);
    return createUser(actor, body, requestMeta(request));
  });
}
