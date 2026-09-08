import { handle } from '@/server/lib/api';
import { prisma } from '@/server/db/prisma';
import { requireActor } from '@/server/lib/auth';
import { buildScope } from '@/server/lib/authz';
import { isAdminOrMaster } from '@/server/lib/authz';

export const dynamic = 'force-dynamic';

export async function GET() {
  return handle(async () => {
    const actor = await requireActor();
    const scope = buildScope(actor);

    // 数字卡：与 Scope 一致
    const departmentFilter =
      scope.departmentIds === null ? {} : { departmentId: { in: scope.departmentIds } };

    const [
      total,
      inProgress,
      waiting,
      overdueProjects,
      dueSoonProjects,
      completedRecent,
      archivedRecent,
      activeProjects,
      staleProjects,
    ] = await Promise.all([
      prisma.project.count({ where: { ...departmentFilter, deletedAt: null } }),
      prisma.project.count({
        where: { ...departmentFilter, status: 'IN_PROGRESS', deletedAt: null },
      }),
      prisma.project.count({
        where: { ...departmentFilter, status: 'WAITING_ACCEPTANCE', deletedAt: null },
      }),
      prisma.project.findMany({
        where: {
          ...departmentFilter,
          status: { in: ['DRAFT', 'PLANNED', 'IN_PROGRESS', 'WAITING_ACCEPTANCE', 'ON_HOLD'] },
          dueDate: { lt: new Date() },
          deletedAt: null,
        },
        select: {
          id: true,
          projectCode: true,
          name: true,
          dueDate: true,
          priority: true,
          department: { select: { name: true } },
          owner: { select: { displayName: true } },
        },
        orderBy: { dueDate: 'asc' },
        take: 50,
      }),
      prisma.project.findMany({
        where: {
          ...departmentFilter,
          status: { in: ['DRAFT', 'PLANNED', 'IN_PROGRESS', 'WAITING_ACCEPTANCE', 'ON_HOLD'] },
          dueDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
          deletedAt: null,
        },
        select: {
          id: true,
          projectCode: true,
          name: true,
          dueDate: true,
          priority: true,
          department: { select: { name: true } },
          owner: { select: { displayName: true } },
        },
        orderBy: { dueDate: 'asc' },
        take: 50,
      }),
      prisma.project.count({
        where: {
          ...departmentFilter,
          status: 'COMPLETED',
          actualCompletedDate: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          deletedAt: null,
        },
      }),
      prisma.project.count({
        where: {
          ...departmentFilter,
          status: 'ARCHIVED',
          archivedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          deletedAt: null,
        },
      }),
      prisma.project.findMany({
        where: { ...departmentFilter, deletedAt: null },
        select: { status: true, priority: true, departmentId: true },
      }),
      prisma.project.findMany({
        where: {
          ...departmentFilter,
          status: 'IN_PROGRESS',
          deletedAt: null,
          OR: [
            { lastUpdateAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
            { lastUpdateAt: null, createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
          ],
        },
        select: {
          id: true,
          projectCode: true,
          name: true,
          lastUpdateAt: true,
          priority: true,
          owner: { select: { displayName: true } },
        },
        orderBy: { lastUpdateAt: 'asc' },
        take: 50,
      }),
    ]);

    const deptMap = await prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });
    const statusDist: Record<string, number> = {};
    const priorityDist: Record<string, number> = { P0: 0, P1: 0, P2: 0, P3: 0 };
    const deptDist: Record<string, number> = {};
    for (const p of activeProjects) {
      statusDist[p.status] = (statusDist[p.status] ?? 0) + 1;
      priorityDist[p.priority] = (priorityDist[p.priority] ?? 0) + 1;
      deptDist[p.departmentId] = (deptDist[p.departmentId] ?? 0) + 1;
    }
    const departmentsForDist = deptMap
      .map((d) => ({ name: d.name, count: deptDist[d.id] ?? 0 }))
      .filter((d) => d.count > 0)
      .sort((a, b) => b.count - a.count);

    return {
      totals: {
        total,
        inProgress,
        waiting,
        overdue: overdueProjects.length,
        dueSoon: dueSoonProjects.length,
        stale: staleProjects.length,
        completedRecent,
        archivedRecent,
      },
      distributions: {
        status: statusDist,
        priority: priorityDist,
        department: departmentsForDist,
      },
      focus: {
        overdue: overdueProjects.slice(0, 10).map((p) => ({
          id: p.id,
          projectCode: p.projectCode,
          name: p.name,
          dueDate: p.dueDate ? p.dueDate.toISOString().slice(0, 10) : null,
          priority: p.priority,
          department: p.department?.name ?? null,
          owner: p.owner?.displayName ?? null,
        })),
        dueSoon: dueSoonProjects.slice(0, 10).map((p) => ({
          id: p.id,
          projectCode: p.projectCode,
          name: p.name,
          dueDate: p.dueDate ? p.dueDate.toISOString().slice(0, 10) : null,
          priority: p.priority,
          department: p.department?.name ?? null,
          owner: p.owner?.displayName ?? null,
        })),
        stale: staleProjects.slice(0, 10).map((p) => ({
          id: p.id,
          projectCode: p.projectCode,
          name: p.name,
          lastUpdateAt: p.lastUpdateAt ? p.lastUpdateAt.toISOString() : null,
          priority: p.priority,
          owner: p.owner?.displayName ?? null,
        })),
      },
      role: isAdminOrMaster(actor) ? actor.role : actor.role,
    };
  });
}
