import { handle, handleCreated, parseBody } from '@/server/lib/api';
import { requireActor } from '@/server/lib/auth';
import { requestMeta } from '@/server/lib/audit';
import {
  listDepartmentsAdmin,
  createDepartment,
  departmentInputSchema,
} from '@/server/modules/settings/service';

export const dynamic = 'force-dynamic';

export async function GET() {
  return handle(async () => {
    const actor = await requireActor();
    return listDepartmentsAdmin(actor);
  });
}

export async function POST(request: Request) {
  return handleCreated(async () => {
    const actor = await requireActor();
    const body = await parseBody(request, departmentInputSchema);
    return createDepartment(actor, body, requestMeta(request));
  });
}
