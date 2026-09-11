import { Prisma, type ProjectStatus, type Priority, type HealthStatus } from '@prisma/client';
import { prisma } from '@/server/db/prisma';
import { buildProjectWhere, type Scope } from '@/server/lib/authz';
import { preferredDeploymentPorts } from '@/lib/deployment-ports';
import type { z } from 'zod';
import type { listProjectsSchema } from './schema';

export const PROJECT_LIST_SELECT = {
  id: true,
  projectCode: true,
  name: true,
  shortName: true,
  systemName: true,
  status: true,
  healthStatus: true,
  progress: true,
  priority: true,
  rating: true,
  startDate: true,
  dueDate: true,
  actualCompletedDate: true,
  acceptanceDate: true,
  lastUpdateAt: true,
  createdAt: true,
  updatedAt: true,
  archiveCompleteness: true,
  department: { select: { id: true, name: true } },
  projectType: { select: { id: true, name: true } },
  owner: { select: { id: true, displayName: true } },
  // 端口展示/排序遵循「本地服务器优先」规则，需取得全部部署后在内存中处理。
  deployments: {
    select: { port: true, serverIp: true, serverName: true, hostname: true },
    orderBy: { lastVerifiedAt: 'desc' as const },
  },
} satisfies Prisma.ProjectSelect;

export type ProjectListItem = Prisma.ProjectGetPayload<{ select: typeof PROJECT_LIST_SELECT }>;

export type ListProjectsParams = z.infer<typeof listProjectsSchema>;

// 默认「项目」视图只展示仍在推进的项目；完成与归档各自进入独立页签。
const ACTIVE_STATUSES: ProjectStatus[] = [
  'DRAFT',
  'PLANNED',
  'IN_PROGRESS',
  'WAITING_ACCEPTANCE',
  'ON_HOLD',
];

const COMPLETED_STATUSES: ProjectStatus[] = ['COMPLETED'];

// 归档列表 = 纯软件资产；CANCELLED/MERGED 仅出现在「全部」视图。
const ARCHIVE_STATUSES: ProjectStatus[] = ['ARCHIVED'];

export function buildListWhere(
  scope: Scope,
  params: ListProjectsParams,
): Prisma.ProjectWhereInput {
  const extra: Prisma.ProjectWhereInput = {};

  const viewStatuses =
    params.view === 'active'
      ? ACTIVE_STATUSES
      : params.view === 'completed'
        ? COMPLETED_STATUSES
        : params.view === 'archive'
          ? ARCHIVE_STATUSES
          : null;

  if (viewStatuses) extra.status = { in: viewStatuses };
  if (params.status?.length) {
    const requestedStatuses = params.status as ProjectStatus[];
    extra.status = {
      in: viewStatuses
        ? requestedStatuses.filter((status) => viewStatuses.includes(status))
        : requestedStatuses,
    };
  }

  // 部门过滤：ADMIN/MASTER 可指定；USER 会被 Scope 强制覆盖
  if (params.departmentId) extra.departmentId = params.departmentId;
  if (params.projectTypeId) extra.projectTypeId = params.projectTypeId;
  if (params.ownerId) extra.ownerId = params.ownerId;
  if (params.healthStatus) extra.healthStatus = params.healthStatus as HealthStatus;
  if (params.priority) extra.priority = params.priority as Priority;

  if (params.dueFrom || params.dueTo) {
    extra.dueDate = {
      ...(params.dueFrom ? { gte: new Date(params.dueFrom) } : {}),
      ...(params.dueTo ? { lte: new Date(params.dueTo) } : {}),
    };
  }

  if (params.q) {
    extra.OR = [
      { projectCode: { contains: params.q, mode: 'insensitive' } },
      { name: { contains: params.q, mode: 'insensitive' } },
      { shortName: { contains: params.q, mode: 'insensitive' } },
      { systemName: { contains: params.q, mode: 'insensitive' } },
      { description: { contains: params.q, mode: 'insensitive' } },
    ];
  }

  return buildProjectWhere(scope, extra);
}

const SORT_FIELD_MAP: Record<ListProjectsParams['sort'], string> = {
  updatedAt: 'updatedAt',
  dueDate: 'dueDate',
  createdAt: 'createdAt',
  priority: 'priority',
  projectCode: 'projectCode',
  lastUpdateAt: 'lastUpdateAt',
  // port 不进 SQL orderBy（map 到 updatedAt 当兜底），listProjects 内二次排序
  port: 'updatedAt',
};

export async function listProjects(scope: Scope, params: ListProjectsParams) {
  const where = buildListWhere(scope, params);
  // port 不走 SQL orderBy（Prisma 不支持 relation 字段排序），退而求其次：
  // 先按 updatedAt 拉一窗，再按本地服务器优先的端口规则在内存中排序。
  const sortField = params.sort === 'port' ? 'updatedAt' : SORT_FIELD_MAP[params.sort];
  const orderBy: Prisma.ProjectOrderByWithRelationInput = { [sortField]: params.order };

  // port 排序需要把 take 拉大保证分页后仍有完整排序集合；用前 1000 条足够一般使用
  const effectiveTake =
    params.sort === 'port' ? Math.max(params.pageSize * Math.max(params.page, 5), 500) : params.pageSize;

  const [rows, total] = await Promise.all([
    prisma.project.findMany({
      where,
      select: PROJECT_LIST_SELECT,
      orderBy,
      skip: (params.page - 1) * params.pageSize,
      take: effectiveTake,
    }),
    prisma.project.count({ where }),
  ]);

  if (params.sort === 'port') {
    rows.sort((a, b) => {
      const ap = preferredDeploymentPorts(a.deployments)[0] ?? Infinity;
      const bp = preferredDeploymentPorts(b.deployments)[0] ?? Infinity;
      return params.order === 'asc' ? ap - bp : bp - ap;
    });
  }

  return { rows, total };
}

export async function findProjectForList(scope: Scope, id: string) {
  return prisma.project.findFirst({
    where: buildProjectWhere(scope, { id }),
    select: PROJECT_LIST_SELECT,
  });
}

export async function findProjectDetail(scope: Scope, id: string) {
  return prisma.project.findFirst({
    where: buildProjectWhere(scope, { id }),
    include: {
      department: { select: { id: true, name: true, code: true } },
      projectType: { select: { id: true, name: true } },
      owner: { select: { id: true, displayName: true } },
      creator: { select: { id: true, displayName: true } },
      developer: { select: { id: true, displayName: true } },
      maintainer: { select: { id: true, displayName: true } },
      acceptedBy: { select: { id: true, displayName: true } },
    },
  });
}

export async function findProjectForEdit(id: string) {
  return prisma.project.findUnique({
    where: { id },
    select: {
      id: true,
      ownerId: true,
      creatorId: true,
      departmentId: true,
      allowDepartmentEdit: true,
      status: true,
      deletedAt: true,
    },
  });
}
