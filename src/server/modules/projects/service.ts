import { Prisma, type ProjectStatus } from '@prisma/client';
import { prisma } from '@/server/db/prisma';
import {
  assertProjectAccess,
  buildScope,
  canEditProject,
  isAdminOrMaster,
  type Actor,
  type Scope,
} from '@/server/lib/authz';
import { ConflictError, NotFoundError } from '@/server/lib/errors';
import { AuditAction, writeAudit } from '@/server/lib/audit';
import { generateProjectCode } from './numbering';
import { assertTransition, isTerminal } from './state-machine';
import { syncArchiveState } from './archive';
import { findProjectDetail, findProjectForEdit, listProjects, PROJECT_LIST_SELECT } from './repository';
import { toDetail, toListItem } from './serializer';
import type { createProjectSchema, listProjectsSchema, updateProjectSchema } from './schema';
import type { z } from 'zod';

/** 需要记录「修改前 / 修改后」的关键字段 */
export const CRITICAL_FIELDS = [
  'status',
  'healthStatus',
  'ownerId',
  'priority',
  'dueDate',
  'departmentId',
  'progress',
  'actualCompletedDate',
  'acceptanceDate',
] as const;

type RequestMeta = { ip?: string | null; userAgent?: string | null };

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ─────────────── 查询 ───────────────

export async function list(actor: Actor, params: z.infer<typeof listProjectsSchema>) {
  const scope = buildScope(actor);
  const { rows, total } = await listProjects(scope, params);

  return {
    items: rows.map(toListItem),
    meta: {
      total,
      page: params.page,
      pageSize: params.pageSize,
      totalPages: Math.max(1, Math.ceil(total / params.pageSize)),
    },
  };
}

export async function detail(actor: Actor, id: string) {
  const scope = buildScope(actor);
  const project = await findProjectDetail(scope, id);
  assertProjectAccess(scope, project);
  if (!project) throw new NotFoundError('PROJECT');

  const canEdit = canEditProject(actor, {
    ownerId: project.ownerId,
    creatorId: project.creatorId,
    departmentId: project.departmentId,
    allowDepartmentEdit: project.allowDepartmentEdit,
    status: project.status,
  });

  return toDetail(project, scope, actor.role, canEdit);
}

// ─────────────── 创建 ───────────────

export async function create(
  actor: Actor,
  input: z.infer<typeof createProjectSchema>,
  meta: RequestMeta = {},
) {
  return prisma.$transaction(async (tx) => {
    const projectCode = await generateProjectCode(tx);

    const project = await tx.project.create({
      data: {
        projectCode,
        name: input.name,
        shortName: input.shortName ?? null,
        systemName: input.systemName ?? null,
        description: input.description ?? null,
        objective: input.objective ?? null,
        requirement: input.requirement ?? null,
        acceptanceCriteria: input.acceptanceCriteria === undefined
          ? undefined
          : input.acceptanceCriteria === null
          ? Prisma.JsonNull
          : input.acceptanceCriteria,
        departmentId: input.departmentId,
        projectTypeId: input.projectTypeId,
        ownerId: input.ownerId,
        creatorId: actor.userId,
        originalDeveloperId: actor.userId,
        currentMaintainerId: input.ownerId,
        priority: input.priority,
        status: 'DRAFT',
        healthStatus: 'NORMAL',
        progress: 0,
        startDate: parseDate(input.startDate),
        dueDate: parseDate(input.dueDate),
      },
      select: PROJECT_LIST_SELECT,
    });

    // 无父项目时，谱系根指向自身
    await tx.project.update({
      where: { id: project.id },
      data: { rootProjectId: project.id },
    });

    await tx.projectTimelineEvent.create({
      data: {
        projectId: project.id,
        eventType: 'PROJECT_CREATED',
        title: '项目创建',
        description: `${actor.displayName} 创建了项目 ${projectCode}`,
        actorId: actor.userId,
      },
    });

    await writeAudit({
      actorId: actor.userId,
      action: AuditAction.PROJECT_CREATE,
      entity: 'PROJECT',
      entityId: project.id,
      after: { projectCode, name: input.name, departmentId: input.departmentId },
      ip: meta.ip,
      userAgent: meta.userAgent,
      tx,
    });

    await syncArchiveState(tx, project.id);

    return toListItem(project);
  });
}

// ─────────────── 更新 ───────────────

export async function update(
  actor: Actor,
  id: string,
  input: z.infer<typeof updateProjectSchema>,
  meta: RequestMeta = {},
) {
  const target = await findProjectForEdit(id);
  if (!target || target.deletedAt) throw new NotFoundError('PROJECT');

  const scope = buildScope(actor);
  assertProjectAccess(scope, target);

  if (!canEditProject(actor, target)) throw new NotFoundError('PROJECT');

  if (isTerminal(target.status)) {
    throw new ConflictError('PROJECT_TERMINAL', '已终结的项目不可再修改');
  }

  return prisma.$transaction(async (tx) => {
    const current = await tx.project.findUniqueOrThrow({
      where: { id },
      select: { status: true, ownerId: true, updatedAt: true },
    });

    // 乐观锁
    if (input.expectedUpdatedAt) {
      if (current.updatedAt.toISOString() !== input.expectedUpdatedAt) {
        throw new ConflictError('STALE_WRITE', '该项目已被他人修改，请刷新后重试');
      }
    }

    // 状态机校验（USER 无权改状态，此处仅防 ADMIN/MASTER 非法迁移）
    let statusChanged = false;
    if (input.status && input.status !== current.status) {
      if (!isAdminOrMaster(actor)) throw new NotFoundError('PROJECT');
      assertTransition(current.status, input.status as ProjectStatus);
      statusChanged = true;
    }

    // 关键字段仅 ADMIN / MASTER 可改
    const touchesCritical =
      input.status !== undefined ||
      input.healthStatus !== undefined ||
      input.ownerId !== undefined ||
      input.priority !== undefined ||
      input.dueDate !== undefined ||
      input.departmentId !== undefined ||
      input.progress !== undefined ||
      input.actualCompletedDate !== undefined ||
      input.acceptanceDate !== undefined;

    if (touchesCritical && !isAdminOrMaster(actor)) {
      throw new NotFoundError('PROJECT');
    }

    const data: Prisma.ProjectUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.shortName !== undefined) data.shortName = input.shortName;
    if (input.systemName !== undefined) data.systemName = input.systemName;
    if (input.description !== undefined) data.description = input.description;
    if (input.objective !== undefined) data.objective = input.objective;
    if (input.requirement !== undefined) data.requirement = input.requirement;
    if (input.acceptanceCriteria !== undefined) {
      data.acceptanceCriteria =
        input.acceptanceCriteria === null ? Prisma.JsonNull : input.acceptanceCriteria;
    }    if (input.departmentId !== undefined) data.department = { connect: { id: input.departmentId } };
    if (input.projectTypeId !== undefined) {
      data.projectType = { connect: { id: input.projectTypeId } };
    }
    if (input.ownerId !== undefined) data.owner = { connect: { id: input.ownerId } };
    if (input.priority !== undefined) data.priority = input.priority;
    if (input.startDate !== undefined) data.startDate = parseDate(input.startDate);
    if (input.dueDate !== undefined) data.dueDate = parseDate(input.dueDate);
    if (input.progress !== undefined) data.progress = input.progress;
    if (input.status !== undefined) data.status = input.status;
    if (input.healthStatus !== undefined) data.healthStatus = input.healthStatus;
    if (input.actualCompletedDate !== undefined) {
      data.actualCompletedDate = parseDate(input.actualCompletedDate);
    }
    if (input.acceptanceDate !== undefined) {
      data.acceptanceDate = parseDate(input.acceptanceDate);
    }

    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    const changedFields: string[] = [];

    const prev = await tx.project.findUniqueOrThrow({
      where: { id },
      select: {
        status: true,
        healthStatus: true,
        ownerId: true,
        priority: true,
        dueDate: true,
        departmentId: true,
        progress: true,
        actualCompletedDate: true,
        acceptanceDate: true,
      },
    });

    for (const field of CRITICAL_FIELDS) {
      const next = (data as Record<string, unknown>)[
        field === 'departmentId' ? 'department' : field
      ];
      if (next === undefined) continue;

      const nextValue = field === 'departmentId' ? input.departmentId : next;
      const prevValue = prev[field];

      if (JSON.stringify(prevValue) !== JSON.stringify(nextValue ?? prevValue)) {
        before[field] = prevValue;
        after[field] = nextValue;
        changedFields.push(field);
      }
    }

    const updated = await tx.project.update({
      where: { id },
      data,
      select: PROJECT_LIST_SELECT,
    });

    if (statusChanged) {
      await tx.projectTimelineEvent.create({
        data: {
          projectId: id,
          eventType: 'STATUS_CHANGED',
          title: `状态变更为 ${input.status}`,
          description: input.changeReason ?? null,
          meta: { from: current.status, to: input.status },
          actorId: actor.userId,
        },
      });
    }

    if (input.ownerId !== undefined && input.ownerId !== current.ownerId) {
      await tx.projectTimelineEvent.create({
        data: {
          projectId: id,
          eventType: 'OWNER_CHANGED',
          title: '负责人变更',
          meta: { from: current.ownerId, to: input.ownerId },
          actorId: actor.userId,
        },
      });
    }

    await writeAudit({
      actorId: actor.userId,
      action: changedFields.length ? 'PROJECT_UPDATE' : 'PROJECT_UPDATE',
      entity: 'PROJECT',
      entityId: id,
      changedFields,
      before,
      after,
      reason: input.changeReason ?? null,
      ip: meta.ip,
      userAgent: meta.userAgent,
      tx,
    });

    await syncArchiveState(tx, id);

    return toListItem(updated);
  });
}

// ─────────────── 星级评分（仅 ADMIN/MASTER；不受终态限制） ───────────────

export async function rateProject(actor: Actor, id: string, rating: number, meta: RequestMeta = {}) {
  if (!isAdminOrMaster(actor)) throw new NotFoundError('PROJECT');
  const scope = buildScope(actor);
  const target = await findProjectForEdit(id);
  if (!target || target.deletedAt) throw new NotFoundError('PROJECT');
  assertProjectAccess(scope, target);

  const updated = await prisma.$transaction(async (tx) => {
    const before = await tx.project.findUniqueOrThrow({
      where: { id },
      select: { rating: true },
    });

    const row = await tx.project.update({
      where: { id },
      data: { rating },
      select: PROJECT_LIST_SELECT,
    });

    await tx.projectTimelineEvent.create({
      data: {
        projectId: id,
        eventType: 'RATING_CHANGED',
        title: rating === 0 ? '取消项目星级' : `项目星级设为 ${rating} 星`,
        meta: { from: before.rating, to: rating },
        actorId: actor.userId,
      },
    });

    await writeAudit({
      actorId: actor.userId,
      action: 'PROJECT_UPDATE',
      entity: 'PROJECT',
      entityId: id,
      changedFields: ['rating'],
      before: { rating: before.rating },
      after: { rating },
      ip: meta.ip,
      userAgent: meta.userAgent,
      tx,
    });

    return row;
  });

  return toListItem(updated);
}

// ─────────────── 软删除 ───────────────

export async function softDelete(actor: Actor, id: string, meta: RequestMeta = {}) {
  const target = await findProjectForEdit(id);
  if (!target || target.deletedAt) throw new NotFoundError('PROJECT');

  const scope = buildScope(actor);
  assertProjectAccess(scope, target);

  return prisma.$transaction(async (tx) => {
    await tx.project.update({ where: { id }, data: { deletedAt: new Date() } });

    await tx.projectTimelineEvent.create({
      data: {
        projectId: id,
        eventType: 'STATUS_CHANGED',
        title: '项目已移入回收站',
        actorId: actor.userId,
      },
    });

    await writeAudit({
      actorId: actor.userId,
      action: AuditAction.PROJECT_DELETE,
      entity: 'PROJECT',
      entityId: id,
      ip: meta.ip,
      userAgent: meta.userAgent,
      tx,
    });

    return { id };
  });
}

export { buildScope };
export type { Scope };
