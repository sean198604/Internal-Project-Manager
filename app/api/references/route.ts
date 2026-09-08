import { handle } from '@/server/lib/api';
import { requireActor } from '@/server/lib/auth';
import { listDepartments, listProjectTypes, listActiveUsers } from '@/server/modules/projects/subresources';

export const dynamic = 'force-dynamic';

export async function GET() {
  return handle(async () => {
    await requireActor();
    const [departments, projectTypes, users] = await Promise.all([
      listDepartments(),
      listProjectTypes(),
      listActiveUsers(),
    ]);
    return { departments, projectTypes, users };
  });
}
