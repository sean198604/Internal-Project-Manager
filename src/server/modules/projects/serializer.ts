import type { Role } from '@prisma/client';
import { formatDate, formatDateTime } from '@/lib/time';
import { computeDerived } from './derivation';
import type { Scope } from '@/server/lib/authz';
import type { ProjectStatus, Priority, HealthStatus } from '@prisma/client';

export type SerializedProjectListItem = ReturnType<typeof toListItem>;

// 入参用结构化子集：listProjects 取的 ProjectListItem 满足；create/update 的产物
// 无 deployments 字段但不报错；前端只用得到 ListItem 落库的固定 13 个字段。
type ListRowForSerializer = {
  id: string;
  projectCode: string;
  name: string;
  shortName: string | null;
  systemName: string | null;
  status: ProjectStatus;
  healthStatus: HealthStatus | null;
  progress: number;
  priority: Priority;
  rating: number;
  startDate: Date | null;
  dueDate: Date | null;
  actualCompletedDate: Date | null;
  acceptanceDate: Date | null;
  lastUpdateAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  archiveCompleteness: number;
  department: { id: string; name: string } | null;
  projectType: { id: string; name: string } | null;
  owner: { id: string; displayName: string } | null;
  // 仅 listProjects 取得到；create/update 路径缺失 → 选填
  deployments?: Array<{ port: number | null }>;
};

/**
 * 列表项序列化：附加派生状态。
 * 派生状态在此统一计算，前端不得自行判断。
 */
export function toListItem(row: ListRowForSerializer) {
  const derived = computeDerived({
    status: row.status,
    dueDate: row.dueDate,
    lastUpdateAt: row.lastUpdateAt,
    createdAt: row.createdAt,
  });

  // 端口排序（仅在 listProjects 携带了 deployments 时才有意义）
  const firstPort = row.deployments?.[0]?.port ?? null;

  return {
    id: row.id,
    projectCode: row.projectCode,
    name: row.name,
    shortName: row.shortName,
    systemName: row.systemName,
    status: row.status,
    healthStatus: row.healthStatus,
    progress: row.progress,
    priority: row.priority,
    rating: row.rating,
    startDate: formatDate(row.startDate),
    dueDate: formatDate(row.dueDate),
    actualCompletedDate: formatDate(row.actualCompletedDate),
    acceptanceDate: formatDate(row.acceptanceDate),
    lastUpdateAt: row.lastUpdateAt ? row.lastUpdateAt.toISOString() : null,
    lastUpdateAtText: formatDateTime(row.lastUpdateAt),
    updatedAt: row.updatedAt.toISOString(),
    archiveCompleteness: row.archiveCompleteness,
    department: row.department,
    projectType: row.projectType,
    owner: row.owner,
    deploymentPort: firstPort,
    derived,
  };
}

type DetailProject = {
  id: string;
  projectCode: string;
  name: string;
  shortName: string | null;
  systemName: string | null;
  description: string | null;
  objective: string | null;
  requirement: string | null;
  acceptanceCriteria: unknown;
  status: string;
  healthStatus: string;
  progress: number;
  priority: string;
  rating: number;
  startDate: Date | null;
  dueDate: Date | null;
  actualCompletedDate: Date | null;
  acceptanceDate: Date | null;
  acceptanceNote: string | null;
  cancelledReason: string | null;
  allowDepartmentEdit: boolean;
  systemStatus: string;
  currentVersion: string | null;
  specialNotes: string | null;
  maintenanceNotes: string | null;
  handoverInfo: string | null;
  archiveCompleteness: number;
  archivedAt: Date | null;
  lastUpdateAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  parentProjectId: string | null;
  rootProjectId: string | null;
  department?: { id: string; name: string; code?: string } | null;
  projectType?: { id: string; name: string } | null;
  owner?: { id: string; displayName: string } | null;
  creator?: { id: string; displayName: string } | null;
  developer?: { id: string; displayName: string } | null;
  maintainer?: { id: string; displayName: string } | null;
  acceptedBy?: { id: string; displayName: string } | null;
};

/**
 * 详情序列化 + 字段级裁剪。
 * USER 的响应中根本不包含部署 / 维护 / 注意事项 / 交接信息，
 * 不是「下发后前端隐藏」。
 */
export function toDetail(project: DetailProject, scope: Scope, role: Role, canEdit: boolean) {
  const derived = computeDerived({
    status: project.status as never,
    dueDate: project.dueDate,
    lastUpdateAt: project.lastUpdateAt,
    createdAt: project.createdAt,
  });

  const base = {
    id: project.id,
    projectCode: project.projectCode,
    name: project.name,
    shortName: project.shortName,
    systemName: project.systemName,
    description: project.description,
    objective: project.objective,
    requirement: project.requirement,
    acceptanceCriteria: project.acceptanceCriteria,
    status: project.status,
    healthStatus: project.healthStatus,
    progress: project.progress,
    priority: project.priority,
    rating: project.rating,
    startDate: formatDate(project.startDate),
    dueDate: formatDate(project.dueDate),
    actualCompletedDate: formatDate(project.actualCompletedDate),
    acceptanceDate: formatDate(project.acceptanceDate),
    acceptanceNote: project.acceptanceNote,
    cancelledReason: project.cancelledReason,
    allowDepartmentEdit: project.allowDepartmentEdit,
    systemStatus: project.systemStatus,
    currentVersion: project.currentVersion,
    archiveCompleteness: project.archiveCompleteness,
    archivedAt: project.archivedAt ? project.archivedAt.toISOString() : null,
    lastUpdateAt: project.lastUpdateAt ? project.lastUpdateAt.toISOString() : null,
    lastUpdateAtText: formatDateTime(project.lastUpdateAt),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    parentProjectId: project.parentProjectId,
    rootProjectId: project.rootProjectId,
    department: project.department,
    projectType: project.projectType,
    owner: project.owner,
    creator: project.creator,
    developer: project.developer,
    maintainer: project.maintainer,
    acceptedBy: project.acceptedBy,
    derived,
    permissions: {
      canEdit,
      canViewDeployment: scope.canSeeDeployment,
      canViewMaintenance: scope.canSeeMaintenance,
      canViewHistory: scope.canSeeHistory,
      canArchive: role === 'ADMIN' || role === 'MASTER',
    },
  };

  // 敏感字段：仅 ADMIN / MASTER 可见
  if (!scope.canSeeMaintenance) return base;

  return {
    ...base,
    specialNotes: project.specialNotes,
    maintenanceNotes: project.maintenanceNotes,
    handoverInfo: project.handoverInfo,
  };
}
