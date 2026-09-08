import { fail, ok } from '@/server/lib/api';
import { requireActor } from '@/server/lib/auth';
import { buildScope } from '@/server/lib/authz';
import { prisma } from '@/server/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const actor = await requireActor();
    const scope = buildScope(actor);

    const department = actor.departmentId
      ? await prisma.department.findUnique({
          where: { id: actor.departmentId },
          select: { id: true, name: true, code: true },
        })
      : null;

    return ok({
      id: actor.userId,
      username: actor.username,
      displayName: actor.displayName,
      role: actor.role,
      department,
      scope: {
        allProjects: scope.departmentIds === null,
        canSeeDeployment: scope.canSeeDeployment,
        canSeeHistory: scope.canSeeHistory,
      },
    });
  } catch (err) {
    return fail(err);
  }
}
