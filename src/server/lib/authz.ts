import type { Prisma, Role } from '@prisma/client';
import { ForbiddenError, NotFoundError } from './errors';

export type Actor = {
  userId: string;
  username: string;
  displayName: string;
  role: Role;
  departmentId: string | null;
};

/**
 * 数据可见范围。
 * ADMIN / MASTER 对全部项目可见；USER 仅本部门。
 */
export type Scope = {
  /** null = 不受部门限制 */
  departmentIds: string[] | null;
  canSeeDeployment: boolean;
  canSeeMaintenance: boolean;
  canSeeInternalDocs: boolean;
  canSeeHistory: boolean;
};

export function isAdmin(actor: Actor): boolean {
  return actor.role === 'ADMIN';
}

export function isAdminOrMaster(actor: Actor): boolean {
  return actor.role === 'ADMIN' || actor.role === 'MASTER';
}

export function buildScope(actor: Actor): Scope {
  if (isAdminOrMaster(actor)) {
    return {
      departmentIds: null,
      canSeeDeployment: true,
      canSeeMaintenance: true,
      canSeeInternalDocs: true,
      canSeeHistory: true,
    };
  }

  return {
    departmentIds: actor.departmentId ? [actor.departmentId] : [],
    // USER 即使项目属于本部门，也看不到部署 / 维护 / 内部文档 / 历史
    canSeeDeployment: false,
    canSeeMaintenance: false,
    canSeeInternalDocs: false,
    canSeeHistory: false,
  };
}

/**
 * 把 Scope 注入查询条件 —— 先过滤后查询。
 * extra 中的 departmentId 只会在 ADMIN / MASTER 下生效；
 * USER 的部门范围永远被强制覆盖，无法扩大。
 */
export function buildProjectWhere(
  scope: Scope,
  extra: Prisma.ProjectWhereInput = {},
): Prisma.ProjectWhereInput {
  if (scope.departmentIds !== null && scope.departmentIds.length === 0) {
    return { id: { in: [] } };
  }

  const where: Prisma.ProjectWhereInput = { deletedAt: null, ...extra };

  if (scope.departmentIds !== null) {
    where.departmentId = { in: scope.departmentIds };
  }

  return where;
}

type ProjectLike = { id: string; departmentId: string };

/**
 * 越权统一 404（非 403）—— 不泄露资源是否存在。
 */
export function assertProjectAccess(scope: Scope, project: ProjectLike | null): void {
  if (!project) throw new NotFoundError('PROJECT');
  if (scope.departmentIds === null) return;
  if (!scope.departmentIds.includes(project.departmentId)) {
    throw new NotFoundError('PROJECT');
  }
}

type EditableProject = {
  ownerId: string;
  creatorId: string;
  departmentId: string;
  allowDepartmentEdit: boolean;
  status: string;
};

/** 项目写权限：ADMIN/MASTER 全通过；USER 需是负责人、创建人，或项目开放了部门协作编辑 */
export function canEditProject(actor: Actor, project: EditableProject): boolean {
  if (isAdminOrMaster(actor)) return true;
  if (project.status === 'MERGED') return false;
  if (project.ownerId === actor.userId) return true;
  if (project.creatorId === actor.userId) return true;
  if (project.allowDepartmentEdit && project.departmentId === actor.departmentId) return true;
  return false;
}

export function assertCanEditProject(actor: Actor, project: EditableProject): void {
  if (!canEditProject(actor, project)) {
    throw new NotFoundError('PROJECT');
  }
}

export function assertAdmin(actor: Actor): void {
  if (!isAdmin(actor)) throw new ForbiddenError();
}

export function assertAdminOrMaster(actor: Actor): void {
  if (!isAdminOrMaster(actor)) throw new ForbiddenError();
}

export function assertCanSeeDeployment(scope: Scope): void {
  if (!scope.canSeeDeployment) throw new NotFoundError('DEPLOYMENT');
}

export function assertCanSeeHistory(scope: Scope): void {
  if (!scope.canSeeHistory) throw new ForbiddenError();
}
