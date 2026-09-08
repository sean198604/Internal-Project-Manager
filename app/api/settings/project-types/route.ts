import { handle, handleCreated, parseBody } from '@/server/lib/api';
import { requireActor } from '@/server/lib/auth';
import { requestMeta } from '@/server/lib/audit';
import {
  listProjectTypesAdmin,
  createProjectType,
  projectTypeInputSchema,
} from '@/server/modules/settings/service';

export const dynamic = 'force-dynamic';

export async function GET() {
  return handle(async () => {
    const actor = await requireActor();
    return listProjectTypesAdmin(actor);
  });
}

export async function POST(request: Request) {
  return handleCreated(async () => {
    const actor = await requireActor();
    const body = await parseBody(request, projectTypeInputSchema);
    return createProjectType(actor, body, requestMeta(request));
  });
}
