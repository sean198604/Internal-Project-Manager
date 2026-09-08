// Settings 管理 service：部门 / 项目类型 / 用户 —— 仅 ADMIN 可用
import { prisma } from '@/server/db/prisma';
import { hashPassword } from '@/server/lib/auth';
import { assertAdmin, type Actor } from '@/server/lib/authz';
import { ConflictError, NotFoundError, ValidationError } from '@/server/lib/errors';
import { AuditAction, writeAudit } from '@/server/lib/audit';
import { z } from 'zod';

type RequestMeta = { ip?: string | null; userAgent?: string | null };

// ──────────────────────────── Zod ────────────────────────────

export const departmentInputSchema = z.object({
  code: z.string().trim().min(1, '编码必填').max(20).transform((v) => v.toUpperCase()),
  name: z.string().trim().min(1, '名称必填').max(50),
  category: z.enum(['BUSINESS', 'FUNCTION']).optional().default('BUSINESS'),
  description: z.string().trim().max(200).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).max(999).optional(),
});

export const departmentPatchSchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  category: z.enum(['BUSINESS', 'FUNCTION']).optional(),
  description: z.string().trim().max(200).nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).max(999).optional(),
  isActive: z.boolean().optional(),
});

export const projectTypeInputSchema = z.object({
  code: z.string().trim().min(1, '编码必填').max(20).transform((v) => v.toUpperCase()),
  name: z.string().trim().min(1, '名称必填').max(50),
  color: z.string().trim().max(20).nullable().optional(),
  description: z.string().trim().max(200).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).max(999).optional(),
});

export const projectTypePatchSchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  color: z.string().trim().max(20).nullable().optional(),
  description: z.string().trim().max(200).nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).max(999).optional(),
  isActive: z.boolean().optional(),
});

const ROLES = ['ADMIN', 'MASTER', 'USER'] as const;

export const userInputSchema = z.object({
  username: z.string().trim().min(2, '用户名至少 2 位').max(30).transform((v) => v.toLowerCase()),
  displayName: z.string().trim().min(1, '姓名必填').max(50),
  password: z.string().min(6, '密码至少 6 位').max(64),
  role: z.enum(ROLES).optional(),
  departmentId: z.string().uuid().nullable().optional(),
});

export const userPatchSchema = z.object({
  displayName: z.string().trim().min(1).max(50).optional(),
  password: z.string().min(6, '密码至少 6 位').max(64).optional(),
  role: z.enum(ROLES).optional(),
  departmentId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const orderSchema = z.object({
  order: z.array(z.string().uuid()).min(1),
});

// ──────────────────────────── 部门 ────────────────────────────

export async function listDepartmentsAdmin(actor: Actor) {
  assertAdmin(actor);
  const rows = await prisma.department.findMany({
    where: { deletedAt: null },
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  const ids = rows.map((d) => d.id);

  const [userAgg, projectAgg] = await Promise.all([
    prisma.user.groupBy({
      by: ['departmentId'],
      where: { departmentId: { in: ids }, deletedAt: null },
      _count: { _all: true },
    }),
    prisma.project.groupBy({
      by: ['departmentId'],
      where: { departmentId: { in: ids }, deletedAt: null },
      _count: { _all: true },
    }),
  ]);

  const userMap = new Map(userAgg.map((u) => [u.departmentId, u._count._all]));
  const projectMap = new Map(projectAgg.map((p) => [p.departmentId, p._count._all]));

  return rows.map((d) => ({
    id: d.id,
    code: d.code,
    name: d.name,
    category: d.category,
    description: d.description,
    sortOrder: d.sortOrder,
    isActive: d.isActive,
    createdAt: d.createdAt.toISOString(),
    userCount: d.id ? (userMap.get(d.id) ?? 0) : 0,
    projectCount: d.id ? (projectMap.get(d.id) ?? 0) : 0,
  }));
}

export async function createDepartment(
  actor: Actor,
  input: z.infer<typeof departmentInputSchema>,
  meta: RequestMeta = {},
) {
  assertAdmin(actor);
  const code = input.code;
  const exists = await prisma.department.findFirst({
    where: { code, deletedAt: null },
    select: { id: true },
  });
  if (exists) throw new ConflictError('DEPARTMENT_CODE_EXISTS', `部门编码 ${code} 已存在`);

  return prisma.$transaction(async (tx) => {
    const dept = await tx.department.create({
      data: {
        code,
        name: input.name,
        category: input.category ?? 'BUSINESS',
        description: input.description ?? null,
        sortOrder: input.sortOrder ?? 0,
      },
    });
    await writeAudit({
      actorId: actor.userId,
      action: AuditAction.DEPARTMENT_CHANGE,
      entity: 'DEPARTMENT',
      entityId: dept.id,
      after: { code: dept.code, name: dept.name, action: 'CREATE' },
      ip: meta.ip,
      userAgent: meta.userAgent,
      tx,
    });
    return dept;
  });
}

export async function updateDepartment(
  actor: Actor,
  id: string,
  input: z.infer<typeof departmentPatchSchema>,
  meta: RequestMeta = {},
) {
  assertAdmin(actor);
  const dept = await prisma.department.findFirst({ where: { id, deletedAt: null } });
  if (!dept) throw new NotFoundError('DEPARTMENT');

  return prisma.$transaction(async (tx) => {
    const updated = await tx.department.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
    await writeAudit({
      actorId: actor.userId,
      action: AuditAction.DEPARTMENT_CHANGE,
      entity: 'DEPARTMENT',
      entityId: id,
      before: { name: dept.name, sortOrder: dept.sortOrder, isActive: dept.isActive },
      after: {
        name: updated.name,
        sortOrder: updated.sortOrder,
        isActive: updated.isActive,
        action: 'UPDATE',
      },
      ip: meta.ip,
      userAgent: meta.userAgent,
      tx,
    });
    return updated;
  });
}

export async function removeDepartment(actor: Actor, id: string, meta: RequestMeta = {}) {
  assertAdmin(actor);
  const dept = await prisma.department.findFirst({ where: { id, deletedAt: null } });
  if (!dept) throw new NotFoundError('DEPARTMENT');

  const [userCount, projectCount] = await Promise.all([
    prisma.user.count({ where: { departmentId: id, deletedAt: null } }),
    prisma.project.count({ where: { departmentId: id, deletedAt: null } }),
  ]);
  if (userCount > 0 || projectCount > 0) {
    throw new ConflictError(
      'DEPARTMENT_IN_USE',
      `该部门下还有 ${userCount} 名成员、${projectCount} 个项目，无法删除。请先转移或停用。`,
      { userCount, projectCount },
    );
  }

  // 无关联数据 → 软删除（保留审计追溯）
  return prisma.$transaction(async (tx) => {
    const removed = await tx.department.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    await writeAudit({
      actorId: actor.userId,
      action: AuditAction.DEPARTMENT_CHANGE,
      entity: 'DEPARTMENT',
      entityId: id,
      before: { code: dept.code, name: dept.name },
      after: { action: 'DELETE' },
      ip: meta.ip,
      userAgent: meta.userAgent,
      tx,
    });
    return { id };
  });
}

export async function reorderDepartments(actor: Actor, order: string[]) {
  assertAdmin(actor);
  await prisma.$transaction(
    order.map((id, i) =>
      prisma.department.update({ where: { id }, data: { sortOrder: i + 1 } }),
    ),
  );
  return { count: order.length };
}

// ──────────────────────────── 项目类型 ────────────────────────────

export async function listProjectTypesAdmin(actor: Actor) {
  assertAdmin(actor);
  const rows = await prisma.projectType.findMany({
    where: { deletedAt: null },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  const ids = rows.map((t) => t.id);
  const projectAgg = await prisma.project.groupBy({
    by: ['projectTypeId'],
    where: { projectTypeId: { in: ids }, deletedAt: null },
    _count: { _all: true },
  });
  const countMap = new Map(projectAgg.map((p) => [p.projectTypeId, p._count._all]));

  return rows.map((t) => ({
    id: t.id,
    code: t.code,
    name: t.name,
    color: t.color,
    description: t.description,
    sortOrder: t.sortOrder,
    isActive: t.isActive,
    projectCount: t.id ? (countMap.get(t.id) ?? 0) : 0,
  }));
}

export async function createProjectType(
  actor: Actor,
  input: z.infer<typeof projectTypeInputSchema>,
  meta: RequestMeta = {},
) {
  assertAdmin(actor);
  const exists = await prisma.projectType.findFirst({
    where: { code: input.code, deletedAt: null },
    select: { id: true },
  });
  if (exists) throw new ConflictError('PROJECT_TYPE_CODE_EXISTS', `类型编码 ${input.code} 已存在`);

  return prisma.$transaction(async (tx) => {
    const created = await tx.projectType.create({
      data: {
        code: input.code,
        name: input.name,
        color: input.color ?? null,
        description: input.description ?? null,
        sortOrder: input.sortOrder ?? 0,
      },
    });
    await writeAudit({
      actorId: actor.userId,
      action: AuditAction.PROJECT_TYPE_CHANGE,
      entity: 'PROJECT_TYPE',
      entityId: created.id,
      after: { code: created.code, name: created.name, action: 'CREATE' },
      ip: meta.ip,
      userAgent: meta.userAgent,
      tx,
    });
    return created;
  });
}

export async function updateProjectType(
  actor: Actor,
  id: string,
  input: z.infer<typeof projectTypePatchSchema>,
  meta: RequestMeta = {},
) {
  assertAdmin(actor);
  const pt = await prisma.projectType.findFirst({ where: { id, deletedAt: null } });
  if (!pt) throw new NotFoundError('PROJECT_TYPE');

  return prisma.$transaction(async (tx) => {
    const updated = await tx.projectType.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.color !== undefined ? { color: input.color } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
    await writeAudit({
      actorId: actor.userId,
      action: AuditAction.PROJECT_TYPE_CHANGE,
      entity: 'PROJECT_TYPE',
      entityId: id,
      before: { name: pt.name, color: pt.color, isActive: pt.isActive },
      after: { name: updated.name, color: updated.color, isActive: updated.isActive, action: 'UPDATE' },
      ip: meta.ip,
      userAgent: meta.userAgent,
      tx,
    });
    return updated;
  });
}

export async function removeProjectType(actor: Actor, id: string, meta: RequestMeta = {}) {
  assertAdmin(actor);
  const pt = await prisma.projectType.findFirst({ where: { id, deletedAt: null } });
  if (!pt) throw new NotFoundError('PROJECT_TYPE');

  const projectCount = await prisma.project.count({ where: { projectTypeId: id, deletedAt: null } });
  if (projectCount > 0) {
    throw new ConflictError(
      'PROJECT_TYPE_IN_USE',
      `该类型下还有 ${projectCount} 个项目，无法删除。`,
      { projectCount },
    );
  }

  return prisma.$transaction(async (tx) => {
    await tx.projectType.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    await writeAudit({
      actorId: actor.userId,
      action: AuditAction.PROJECT_TYPE_CHANGE,
      entity: 'PROJECT_TYPE',
      entityId: id,
      before: { code: pt.code, name: pt.name },
      after: { action: 'DELETE' },
      ip: meta.ip,
      userAgent: meta.userAgent,
      tx,
    });
    return { id };
  });
}

// ──────────────────────────── 用户 ────────────────────────────

export async function listUsersAdmin(actor: Actor) {
  assertAdmin(actor);
  const rows = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: [{ isActive: 'desc' }, { displayName: 'asc' }],
    include: {
      department: { select: { id: true, name: true, isActive: true } },
      _count: { select: { ownedProjects: { where: { deletedAt: null } } } },
    },
  });
  return rows.map((u) => ({
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    role: u.role,
    isActive: u.isActive,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
    departmentId: u.departmentId,
    departmentName: u.department?.name ?? null,
    departmentActive: u.department?.isActive ?? null,
    projectCount: u._count.ownedProjects,
  }));
}

export async function createUser(
  actor: Actor,
  input: z.infer<typeof userInputSchema>,
  meta: RequestMeta = {},
) {
  assertAdmin(actor);
  const username = input.username;
  const exists = await prisma.user.findFirst({
    where: { username, deletedAt: null },
    select: { id: true },
  });
  if (exists) throw new ConflictError('USERNAME_EXISTS', `用户名 ${username} 已存在`);

  if (input.departmentId) {
    const dept = await prisma.department.findFirst({
      where: { id: input.departmentId, deletedAt: null },
    });
    if (!dept) throw new NotFoundError('DEPARTMENT');
  }

  const passwordHash = await hashPassword(input.password);

  return prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        username,
        displayName: input.displayName,
        passwordHash,
        role: input.role ?? 'USER',
        departmentId: input.departmentId ?? null,
      },
    });
    await writeAudit({
      actorId: actor.userId,
      action: AuditAction.USER_CREATE,
      entity: 'USER',
      entityId: created.id,
      after: { username, displayName: created.displayName, role: created.role, departmentId: created.departmentId },
      ip: meta.ip,
      userAgent: meta.userAgent,
      tx,
    });
    return { id: created.id, username, displayName: created.displayName, role: created.role };
  });
}

export async function updateUser(
  actor: Actor,
  id: string,
  input: z.infer<typeof userPatchSchema>,
  meta: RequestMeta = {},
) {
  assertAdmin(actor);
  const user = await prisma.user.findFirst({ where: { id, deletedAt: null } });
  if (!user) throw new NotFoundError('USER');

  // 防呆：不能停用自己 / 不能把自己降级导致系统无管理员
  if (id === actor.userId && input.isActive === false) {
    throw new ValidationError('不能停用当前登录的账号');
  }
  if (id === actor.userId && input.role && input.role !== 'ADMIN') {
    throw new ValidationError('不能移除自己的管理员角色');
  }

  if (input.departmentId !== undefined && input.departmentId !== null) {
    const dept = await prisma.department.findFirst({
      where: { id: input.departmentId, deletedAt: null },
    });
    if (!dept) throw new NotFoundError('DEPARTMENT');
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id },
      data: {
        ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
        ...(input.role !== undefined ? { role: input.role } : {}),
        ...(input.departmentId !== undefined ? { departmentId: input.departmentId } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.password ? { passwordHash: await hashPassword(input.password) } : {}),
      },
    });
    await writeAudit({
      actorId: actor.userId,
      action: AuditAction.USER_UPDATE,
      entity: 'USER',
      entityId: id,
      before: {
        displayName: user.displayName,
        role: user.role,
        departmentId: user.departmentId,
        isActive: user.isActive,
      },
      after: {
        displayName: updated.displayName,
        role: updated.role,
        departmentId: updated.departmentId,
        isActive: updated.isActive,
        passwordChanged: Boolean(input.password),
      },
      ip: meta.ip,
      userAgent: meta.userAgent,
      tx,
    });
    return { id, username: updated.username, displayName: updated.displayName };
  });
}
