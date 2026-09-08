// Updates / Documents / Deployments / Archive / Lineage / Share 子资源 service
import { randomBytes, randomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Prisma } from '@prisma/client';
import { prisma } from '@/server/db/prisma';
import {
  assertProjectAccess,
  assertCanSeeDeployment,
  buildScope,
  isAdminOrMaster,
  type Actor,
  type Scope,
} from '@/server/lib/authz';
import { ConflictError, ForbiddenError, NotFoundError } from '@/server/lib/errors';
import { AuditAction, writeAudit } from '@/server/lib/audit';
import { syncArchiveState, ARCHIVE_ITEMS } from './archive';
import { generateProjectCode } from './numbering';
import type { z } from 'zod';
import type {
  deploymentSchema,
  updateDeploymentSchema,
  documentSchema,
  uploadMetaSchema,
  acceptanceSchema,
  archiveSchema,
  checklistToggleSchema,
  branchSchema,
  mergeSchema,
  migrationSchema,
  createShareSchema,
  createUpdateSchema,
} from './schema';

type RequestMeta = { ip?: string | null; userAgent?: string | null };

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function loadProjectForWrite(scope: Scope, id: string) {
  const project = await prisma.project.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      projectCode: true,
      ownerId: true,
      creatorId: true,
      departmentId: true,
      rootProjectId: true,
      allowDepartmentEdit: true,
      status: true,
      deletedAt: true,
    },
  });
  assertProjectAccess(scope, project);
  return project!;
}

function canWriteProject(actor: Actor, project: { ownerId: string; creatorId: string; allowDepartmentEdit: boolean; departmentId: string; status: string }) {
  if (isAdminOrMaster(actor)) return true;
  if (project.status === 'MERGED') return false;
  if (project.ownerId === actor.userId) return true;
  if (project.creatorId === actor.userId) return true;
  if (project.allowDepartmentEdit && project.departmentId === actor.departmentId) return true;
  return false;
}

// ──────────────────────────── Project Updates ────────────────────────────

export async function listUpdates(actor: Actor, projectId: string) {
  const scope = buildScope(actor);
  const project = await loadProjectForWrite(scope, projectId);
  return prisma.projectUpdate.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: 'desc' },
    include: { createdBy: { select: { id: true, displayName: true } } },
  });
}

export async function createUpdate(
  actor: Actor,
  projectId: string,
  input: z.infer<typeof createUpdateSchema>,
  meta: RequestMeta = {},
) {
  const scope = buildScope(actor);
  const project = await loadProjectForWrite(scope, projectId);
  if (!canWriteProject(actor, project)) throw new NotFoundError('PROJECT');

  return prisma.$transaction(async (tx) => {
    const update = await tx.projectUpdate.create({
      data: {
        projectId: project.id,
        createdById: actor.userId,
        content: input.content,
        progress: input.progress ?? null,
        currentIssues: input.currentIssues ?? null,
        nextSteps: input.nextSteps ?? null,
      },
      include: { createdBy: { select: { id: true, displayName: true } } },
    });

    await tx.project.update({
      where: { id: project.id },
      data: { lastUpdateAt: new Date() },
    });

    await tx.projectTimelineEvent.create({
      data: {
        projectId: project.id,
        eventType: 'UPDATE_ADDED',
        title: `进度更新${input.progress != null ? ` ${input.progress}%` : ''}`,
        description: input.content.slice(0, 200),
        actorId: actor.userId,
      },
    });

    await writeAudit({
      actorId: actor.userId,
      action: AuditAction.UPDATE_ADDED,
      entity: 'PROJECT_UPDATE',
      entityId: update.id,
      after: { content: input.content, progress: input.progress ?? null },
      ip: meta.ip,
      userAgent: meta.userAgent,
      tx,
    });

    return update;
  });
}

// ──────────────────────────── Acceptance ────────────────────────────

export async function markAccepted(
  actor: Actor,
  projectId: string,
  input: z.infer<typeof acceptanceSchema>,
  meta: RequestMeta = {},
) {
  if (!isAdminOrMaster(actor)) throw new ForbiddenError();
  const scope = buildScope(actor);
  const project = await loadProjectForWrite(scope, projectId);

  return prisma.$transaction(async (tx) => {
    const acceptedById = input.acceptedById ?? actor.userId;
    const next = await tx.project.update({
      where: { id: project.id },
      data: {
        acceptedById,
        acceptanceDate: parseDate(input.acceptanceDate),
        acceptanceNote: input.acceptanceNote ?? null,
        actualCompletedDate: parseDate(input.actualCompletedDate),
        status: 'WAITING_ACCEPTANCE',
      },
      select: { status: true },
    });

    await tx.projectTimelineEvent.create({
      data: {
        projectId: project.id,
        eventType: 'ACCEPTED',
        title: '项目已验收',
        description: input.acceptanceNote ?? null,
        actorId: actor.userId,
      },
    });

    await writeAudit({
      actorId: actor.userId,
      action: AuditAction.PROJECT_ACCEPT,
      entity: 'PROJECT',
      entityId: project.id,
      after: { status: next.status, acceptanceDate: input.acceptanceDate },
      ip: meta.ip,
      userAgent: meta.userAgent,
      tx,
    });

    return { status: next.status };
  });
}

// ──────────────────────────── Deployments ────────────────────────────

function serializeDeployment(d: {
  id: string;
  environment: string;
  serverName: string | null;
  serverIp: string | null;
  hostname: string | null;
  port: number | null;
  protocol: string | null;
  deploymentPath: string | null;
  serviceName: string | null;
  runtime: string | null;
  database: string | null;
  version: string | null;
  status: string;
  notes: string | null;
  lastVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: d.id,
    environment: d.environment,
    serverName: d.serverName,
    serverIp: d.serverIp,
    hostname: d.hostname,
    port: d.port,
    protocol: d.protocol,
    deploymentPath: d.deploymentPath,
    serviceName: d.serviceName,
    runtime: d.runtime,
    database: d.database,
    version: d.version,
    status: d.status,
    notes: d.notes,
    lastVerifiedAt: d.lastVerifiedAt ? d.lastVerifiedAt.toISOString() : null,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

export async function listDeployments(actor: Actor, projectId: string) {
  const scope = buildScope(actor);
  assertCanSeeDeployment(scope);
  const project = await loadProjectForWrite(scope, projectId);

  const rows = await prisma.projectDeployment.findMany({
    where: { projectId: project.id },
    orderBy: [{ environment: 'asc' }, { updatedAt: 'desc' }],
  });
  return rows.map(serializeDeployment);
}

export async function createDeployment(
  actor: Actor,
  projectId: string,
  input: z.infer<typeof deploymentSchema>,
  meta: RequestMeta = {},
) {
  if (!isAdminOrMaster(actor)) throw new ForbiddenError();
  const scope = buildScope(actor);
  assertCanSeeDeployment(scope);
  const project = await loadProjectForWrite(scope, projectId);

  return prisma.$transaction(async (tx) => {
    const dep = await tx.projectDeployment.create({
      data: {
        projectId: project.id,
        environment: input.environment,
        serverName: input.serverName ?? null,
        serverIp: input.serverIp ?? null,
        hostname: input.hostname ?? null,
        port: input.port ?? null,
        protocol: input.protocol ?? null,
        deploymentPath: input.deploymentPath ?? null,
        serviceName: input.serviceName ?? null,
        runtime: input.runtime ?? null,
        database: input.database ?? null,
        version: input.version ?? null,
        status: input.status,
        notes: input.notes ?? null,
        lastVerifiedAt: parseDate(input.lastVerifiedAt),
      },
    });

    await tx.projectTimelineEvent.create({
      data: {
        projectId: project.id,
        eventType: 'DEPLOYMENT_CHANGED',
        title: `新增 ${input.environment} 部署`,
        description: [input.serverName, input.serverIp, input.port].filter(Boolean).join(' / '),
        actorId: actor.userId,
      },
    });

    await writeAudit({
      actorId: actor.userId,
      action: AuditAction.DEPLOYMENT_CREATE,
      entity: 'DEPLOYMENT',
      entityId: dep.id,
      after: { environment: input.environment, serverIp: input.serverIp, port: input.port },
      ip: meta.ip,
      userAgent: meta.userAgent,
      tx,
    });

    await syncArchiveState(tx, project.id);
    return serializeDeployment(dep);
  });
}

export async function updateDeployment(
  actor: Actor,
  id: string,
  input: z.infer<typeof updateDeploymentSchema>,
  meta: RequestMeta = {},
) {
  if (!isAdminOrMaster(actor)) throw new ForbiddenError();
  const dep = await prisma.projectDeployment.findUnique({ where: { id }, select: { id: true, projectId: true } });
  if (!dep) throw new NotFoundError('DEPLOYMENT');
  const scope = buildScope(actor);
  await loadProjectForWrite(scope, dep.projectId);

  const data: Prisma.ProjectDeploymentUpdateInput = {};
  const fields = [
    'environment',
    'serverName',
    'serverIp',
    'hostname',
    'port',
    'protocol',
    'deploymentPath',
    'serviceName',
    'runtime',
    'database',
    'version',
    'status',
    'notes',
  ] as const;
  for (const k of fields) {
    const v = input[k];
    if (v !== undefined) (data as Record<string, unknown>)[k] = v === null ? null : v;
  }
  if (input.lastVerifiedAt !== undefined) {
    data.lastVerifiedAt = parseDate(input.lastVerifiedAt);
  }
  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.projectDeployment.update({ where: { id }, data });
    await writeAudit({
      actorId: actor.userId,
      action: AuditAction.DEPLOYMENT_UPDATE,
      entity: 'DEPLOYMENT',
      entityId: id,
      after: input,
      ip: meta.ip,
      userAgent: meta.userAgent,
      tx,
    });
    return u;
  });
  return serializeDeployment(updated);
}

export async function deleteDeployment(actor: Actor, id: string, meta: RequestMeta = {}) {
  if (!isAdminOrMaster(actor)) throw new ForbiddenError();
  const dep = await prisma.projectDeployment.findUnique({ where: { id }, select: { id: true, projectId: true } });
  if (!dep) throw new NotFoundError('DEPLOYMENT');
  const scope = buildScope(actor);
  await loadProjectForWrite(scope, dep.projectId);

  await prisma.$transaction(async (tx) => {
    await tx.projectDeployment.delete({ where: { id } });
    await writeAudit({
      actorId: actor.userId,
      action: AuditAction.DEPLOYMENT_DELETE,
      entity: 'DEPLOYMENT',
      entityId: id,
      ip: meta.ip,
      userAgent: meta.userAgent,
      tx,
    });
    await syncArchiveState(tx, dep.projectId);
  });
  return { id };
}

// ──────────────────────────── Documents ────────────────────────────

const STORAGE_ROOT = path.resolve(process.cwd(), 'storage', 'documents');

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export async function listDocuments(actor: Actor, projectId: string, scope: Scope) {
  const project = await loadProjectForWrite(scope, projectId);
  return prisma.projectDocument.findMany({
    where: { projectId: project.id, deletedAt: null },
    orderBy: [{ docType: 'asc' }, { version: 'desc' }, { createdAt: 'desc' }],
    include: {
      uploadedBy: { select: { id: true, displayName: true } },
      attachment: { select: { originalFileName: true, sizeBytes: true, mimeType: true } },
    },
  });
}

/**
 * Step 1: 先创建 attachment（拿到 storageKey），客户端再 PUT 文件到 /api/uploads/[key]。
 */
export async function startUpload(
  actor: Actor,
  projectId: string,
  meta: z.infer<typeof uploadMetaSchema>,
) {
  if (!isAdminOrMaster(actor)) throw new ForbiddenError();
  const scope = buildScope(actor);
  const project = await loadProjectForWrite(scope, projectId);

  const ext = path.extname(meta.fileName).toLowerCase().replace(/[^a-z0-9.]/g, '');
  const storageKey = `${project.id}/${new Date().getUTCFullYear()}/${randomUUID()}${ext}`;

  const attachment = await prisma.projectAttachment.create({
    data: {
      storageKey,
      originalFileName: meta.fileName,
      mimeType: meta.mimeType ?? 'application/octet-stream',
      sizeBytes: meta.size,
      checksum: '',
      uploadedById: actor.userId,
    },
    select: { id: true, storageKey: true },
  });

  return {
    attachmentId: attachment.id,
    storageKey: attachment.storageKey,
    uploadUrl: `/api/uploads/${encodeURIComponent(attachment.storageKey)}`,
    method: 'PUT' as const,
    expiresIn: 600,
  };
}

export async function storeUpload(actor: Actor, storageKey: string, body: Buffer) {
  const projectId = storageKey.split('/')[0];
  const scope = buildScope(actor);
  const project = await loadProjectForWrite(scope, projectId);

  const safeKey = storageKey.replace(/[^a-zA-Z0-9._/-]/g, '_');
  const full = path.join(STORAGE_ROOT, safeKey);
  if (!full.startsWith(STORAGE_ROOT)) throw new ForbiddenError();
  await ensureDir(path.dirname(full));
  await fs.writeFile(full, body);
  const stat = await fs.stat(full);
  const checksum = createHash('sha256').update(body).digest('hex');

  await prisma.projectAttachment.update({
    where: { storageKey: safeKey },
    data: { sizeBytes: stat.size, checksum },
  });
  return { size: stat.size };
}

export async function downloadDocument(actor: Actor, documentId: string) {
  const scope = buildScope(actor);
  const doc = await prisma.projectDocument.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      projectId: true,
      attachmentId: true,
      title: true,
      attachment: { select: { storageKey: true, originalFileName: true, mimeType: true } },
    },
  });
  if (!doc) throw new NotFoundError('DOCUMENT');
  await loadProjectForWrite(scope, doc.projectId);

  const safeKey = doc.attachment.storageKey.replace(/[^a-zA-Z0-9._/-]/g, '_');
  const full = path.join(STORAGE_ROOT, safeKey);
  if (!full.startsWith(STORAGE_ROOT)) throw new ForbiddenError();
  return { filePath: full, fileName: doc.attachment.originalFileName, mimeType: doc.attachment.mimeType, title: doc.title };
}

export async function createDocument(
  actor: Actor,
  projectId: string,
  input: z.infer<typeof documentSchema>,
  meta: RequestMeta = {},
) {
  if (!isAdminOrMaster(actor)) throw new ForbiddenError();
  const scope = buildScope(actor);
  const project = await loadProjectForWrite(scope, projectId);

  // 校验 attachment 属于本项目
  const att = await prisma.projectAttachment.findUnique({
    where: { id: input.attachmentId },
    select: { id: true, storageKey: true, sizeBytes: true, originalFileName: true, mimeType: true, uploadedById: true },
  });
  if (!att) throw new NotFoundError('ATTACHMENT');
  if (att.uploadedById !== actor.userId) throw new ForbiddenError();
  if (!att.storageKey.startsWith(project.id + '/')) throw new ForbiddenError();

  return prisma.$transaction(async (tx) => {
    const groupId = randomUUID();
    if (input.isCurrent) {
      await tx.projectDocument.updateMany({
        where: { projectId: project.id, docType: input.docType, deletedAt: null },
        data: { isCurrent: false },
      });
    }
    const doc = await tx.projectDocument.create({
      data: {
        projectId: project.id,
        attachmentId: att.id,
        title: input.title,
        docType: input.docType,
        version: input.version ?? '1.0',
        documentGroupId: groupId,
        isCurrent: input.isCurrent,
        isInternal: input.docType === 'DEPLOYMENT' ? true : false,
        notes: input.notes ?? null,
        uploadedById: actor.userId,
      },
    });

    await tx.projectTimelineEvent.create({
      data: {
        projectId: project.id,
        eventType: 'DOCUMENT_UPLOADED',
        title: `上传文档：${input.title}`,
        description: `${input.docType}${input.version ? ` · ${input.version}` : ''}`,
        actorId: actor.userId,
      },
    });

    await writeAudit({
      actorId: actor.userId,
      action: AuditAction.DOC_UPLOAD,
      entity: 'DOCUMENT',
      entityId: doc.id,
      after: { docType: input.docType, title: input.title, fileName: att.originalFileName, size: att.sizeBytes },
      ip: meta.ip,
      userAgent: meta.userAgent,
      tx,
    });

    await syncArchiveState(tx, project.id);
    return doc;
  });
}

export async function deleteDocument(actor: Actor, documentId: string, meta: RequestMeta = {}) {
  if (!isAdminOrMaster(actor)) throw new ForbiddenError();
  const doc = await prisma.projectDocument.findUnique({
    where: { id: documentId },
    select: { id: true, projectId: true },
  });
  if (!doc) throw new NotFoundError('DOCUMENT');
  const scope = buildScope(actor);
  await loadProjectForWrite(scope, doc.projectId);

  await prisma.$transaction(async (tx) => {
    await tx.projectDocument.update({ where: { id: documentId }, data: { deletedAt: new Date() } });
    await writeAudit({
      actorId: actor.userId,
      action: AuditAction.DOC_DELETE,
      entity: 'DOCUMENT',
      entityId: documentId,
      ip: meta.ip,
      userAgent: meta.userAgent,
      tx,
    });
    await syncArchiveState(tx, doc.projectId);
  });
  return { id: documentId };
}

// ──────────────────────────── Archive ────────────────────────────

export async function getArchiveState(actor: Actor, projectId: string) {
  const scope = buildScope(actor);
  const project = await loadProjectForWrite(scope, projectId);
  const [items, project2] = await Promise.all([
    prisma.projectArchiveChecklist.findMany({ where: { projectId: project.id } }),
    prisma.project.findUniqueOrThrow({
      where: { id: project.id },
      select: { status: true, archiveCompleteness: true, currentVersion: true, archivedAt: true },
    }),
  ]);
  return {
    status: project2.status,
    currentVersion: project2.currentVersion,
    archiveCompleteness: project2.archiveCompleteness,
    archivedAt: project2.archivedAt ? project2.archivedAt.toISOString() : null,
    items: items.map((it) => ({
      key: it.itemKey,
      isChecked: it.isChecked,
      isAutoChecked: it.isAutoChecked,
    })),
  };
}

export async function toggleChecklistItem(
  actor: Actor,
  projectId: string,
  input: z.infer<typeof checklistToggleSchema>,
) {
  if (!isAdminOrMaster(actor)) throw new ForbiddenError();
  const scope = buildScope(actor);
  const project = await loadProjectForWrite(scope, projectId);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.projectArchiveChecklist.update({
      where: { projectId_itemKey: { projectId: project.id, itemKey: input.itemKey } },
      data: { isChecked: input.isChecked, checkedById: actor.userId, checkedAt: new Date() },
    });
    let score = 0;
    const items = await tx.projectArchiveChecklist.findMany({ where: { projectId: project.id } });
    for (const cfg of ARCHIVE_ITEMS) {
      const it = items.find((x) => x.itemKey === cfg.key);
      if (it?.isChecked) score += cfg.weight;
    }
    await tx.project.update({ where: { id: project.id }, data: { archiveCompleteness: score } });
    return updated;
  });
}

export async function archive(
  actor: Actor,
  projectId: string,
  input: z.infer<typeof archiveSchema>,
  meta: RequestMeta = {},
) {
  if (!isAdminOrMaster(actor)) throw new ForbiddenError();
  const scope = buildScope(actor);
  const project = await loadProjectForWrite(scope, projectId);

  return prisma.$transaction(async (tx) => {
    const state = await syncArchiveState(tx, project.id);
    if (state.score < 60 && !input.confirm) {
      throw new ConflictError('ARCHIVE_INCOMPLETE', '档案完整度不足 60，请确认后归档', { score: state.score });
    }

    const data: Prisma.ProjectUpdateInput = {
      status: 'ARCHIVED',
      archivedAt: new Date(),
      archivedBy: { connect: { id: actor.userId } },
      archiveConfirmedBy: { connect: { id: actor.userId } },
      archiveConfirmedAt: new Date(),
    };
    if (input.currentVersion !== undefined) data.currentVersion = input.currentVersion;
    if (input.systemName !== undefined) data.systemName = input.systemName ?? null;
    if (input.systemStatus !== undefined) data.systemStatus = input.systemStatus;
    if (input.description !== undefined) data.description = input.description ?? null;
    if (input.objective !== undefined) data.objective = input.objective ?? null;
    if (input.businessValue !== undefined) data.businessValue = input.businessValue ?? null;
    if (input.specialNotes !== undefined) data.specialNotes = input.specialNotes ?? null;
    if (input.maintenanceNotes !== undefined) data.maintenanceNotes = input.maintenanceNotes ?? null;
    if (input.handoverInfo !== undefined) data.handoverInfo = input.handoverInfo ?? null;
    if (input.currentMaintainerId) data.maintainer = { connect: { id: input.currentMaintainerId } };

    const updated = await tx.project.update({ where: { id: project.id }, data });

    // 归档字段写入后再重算一次，保证 checklist/完整度反映最新归档内容
    const finalState = await syncArchiveState(tx, project.id);

    await tx.projectTimelineEvent.create({
      data: {
        projectId: project.id,
        eventType: 'ARCHIVED',
        title: '项目已归档',
        meta: { completeness: finalState.score },
        actorId: actor.userId,
      },
    });

    await writeAudit({
      actorId: actor.userId,
      action: AuditAction.PROJECT_ARCHIVE,
      entity: 'PROJECT',
      entityId: project.id,
      after: { status: 'ARCHIVED', completeness: finalState.score },
      ip: meta.ip,
      userAgent: meta.userAgent,
      tx,
    });

    return updated;
  });
}

export async function unarchive(actor: Actor, projectId: string, meta: RequestMeta = {}) {
  if (!isAdminOrMaster(actor)) throw new ForbiddenError();
  const scope = buildScope(actor);
  const project = await loadProjectForWrite(scope, projectId);
  return prisma.$transaction(async (tx) => {
    const updated = await tx.project.update({
      where: { id: project.id },
      data: { status: 'COMPLETED', archivedAt: null, archiveConfirmedById: null, archiveConfirmedAt: null },
    });
    await tx.projectTimelineEvent.create({
      data: {
        projectId: project.id,
        eventType: 'RESTORED',
        title: '项目已取消归档',
        actorId: actor.userId,
      },
    });
    await writeAudit({
      actorId: actor.userId,
      action: AuditAction.PROJECT_UNARCHIVE,
      entity: 'PROJECT',
      entityId: project.id,
      after: { status: 'COMPLETED' },
      ip: meta.ip,
      userAgent: meta.userAgent,
      tx,
    });
    return updated;
  });
}

// ──────────────────────────── Lineage ────────────────────────────

export async function getLineage(actor: Actor, projectId: string) {
  const scope = buildScope(actor);
  const project = await loadProjectForWrite(scope, projectId);
  const rootId = project.rootProjectId ?? project.id;
  const nodes = await prisma.project.findMany({
    where: {
      deletedAt: null,
      OR: [{ id: rootId }, { rootProjectId: rootId }, { parentProjectId: rootId }],
    },
    select: {
      id: true,
      projectCode: true,
      name: true,
      systemName: true,
      status: true,
      parentProjectId: true,
      rootProjectId: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  return {
    rootId,
    currentId: project.id,
    nodes: nodes.map((n) => ({
      id: n.id,
      projectCode: n.projectCode,
      name: n.name,
      systemName: n.systemName,
      status: n.status,
      parentProjectId: n.parentProjectId,
      rootProjectId: n.rootProjectId,
      createdAt: n.createdAt.toISOString(),
    })),
  };
}

export async function branch(
  actor: Actor,
  projectId: string,
  input: z.infer<typeof branchSchema>,
  meta: RequestMeta = {},
) {
  if (!isAdminOrMaster(actor)) throw new ForbiddenError();
  const scope = buildScope(actor);
  const parent = await loadProjectForWrite(scope, projectId);

  return prisma.$transaction(async (tx) => {
    const projectCode = await generateProjectCode(tx);
    const child = await tx.project.create({
      data: {
        projectCode,
        name: input.name,
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
        requirement: input.requirement ?? null,
        objective: input.objective ?? null,
        description: `由 ${parent.projectCode} 派生`,
        parentProjectId: parent.id,
        rootProjectId: parent.rootProjectId ?? parent.id,
      },
      select: { id: true, projectCode: true },
    });

    await tx.projectRelation.create({
      data: {
        fromProjectId: child.id,
        toProjectId: parent.id,
        relationType: 'BRANCH',
        createdById: actor.userId,
      },
    });

    await tx.projectTimelineEvent.create({
      data: {
        projectId: child.id,
        eventType: 'PROJECT_BRANCHED',
        title: `从 ${parent.projectCode} 创建分支`,
        actorId: actor.userId,
      },
    });

    await writeAudit({
      actorId: actor.userId,
      action: AuditAction.PROJECT_BRANCH,
      entity: 'PROJECT',
      entityId: child.id,
      after: { projectCode: child.projectCode, parentProjectCode: parent.projectCode },
      ip: meta.ip,
      userAgent: meta.userAgent,
      tx,
    });

    await syncArchiveState(tx, child.id);
    return child;
  });
}

export async function merge(
  actor: Actor,
  targetProjectId: string,
  input: z.infer<typeof mergeSchema>,
  meta: RequestMeta = {},
) {
  if (!isAdminOrMaster(actor)) throw new ForbiddenError();
  const scope = buildScope(actor);
  const target = await loadProjectForWrite(scope, targetProjectId);

  return prisma.$transaction(async (tx) => {
    const sources = await tx.project.findMany({
      where: { id: { in: input.sourceProjectIds }, deletedAt: null },
      select: { id: true, projectCode: true },
    });
    if (sources.length !== input.sourceProjectIds.length) throw new NotFoundError('PROJECT');

    const mergeBatchId = randomUUID();
    for (const s of sources) {
      await tx.project.update({ where: { id: s.id }, data: { status: 'MERGED' } });
      await tx.projectMerge.create({
        data: {
          mergeBatchId,
          targetProjectId: target.id,
          sourceProjectId: s.id,
          reason: input.reason ?? '',
          mergedById: actor.userId,
        },
      });
      await tx.projectTimelineEvent.create({
        data: {
          projectId: s.id,
          eventType: 'PROJECT_MERGED',
          title: `项目已合并至 ${target.projectCode}`,
          description: input.reason ?? null,
          actorId: actor.userId,
        },
      });
    }

    await writeAudit({
      actorId: actor.userId,
      action: AuditAction.PROJECT_MERGE,
      entity: 'PROJECT',
      entityId: target.id,
      after: { merged: sources.map((s) => s.projectCode) },
      reason: input.reason ?? null,
      ip: meta.ip,
      userAgent: meta.userAgent,
      tx,
    });

    return { mergeBatchId, targetId: target.id, mergedIds: sources.map((s) => s.id) };
  });
}

export async function migrate(
  actor: Actor,
  projectId: string,
  input: z.infer<typeof migrationSchema>,
  meta: RequestMeta = {},
) {
  if (!isAdminOrMaster(actor)) throw new ForbiddenError();
  const scope = buildScope(actor);
  const project = await loadProjectForWrite(scope, projectId);

  return prisma.$transaction(async (tx) => {
    const before = await tx.project.findUniqueOrThrow({
      where: { id: project.id },
      select: { departmentId: true },
    });
    if (before.departmentId === input.targetDepartmentId) return { id: project.id };

    await tx.project.update({
      where: { id: project.id },
      data: { departmentId: input.targetDepartmentId },
    });
    await tx.projectMigration.create({
      data: {
        projectId: project.id,
        fromDepartmentId: before.departmentId,
        toDepartmentId: input.targetDepartmentId,
        reason: input.reason ?? '',
        migratedById: actor.userId,
      },
    });
    await tx.projectTimelineEvent.create({
      data: {
        projectId: project.id,
        eventType: 'DEPARTMENT_MIGRATED',
        title: '部门已迁移',
        meta: { from: before.departmentId, to: input.targetDepartmentId },
        actorId: actor.userId,
      },
    });
    await writeAudit({
      actorId: actor.userId,
      action: AuditAction.PROJECT_MIGRATE,
      entity: 'PROJECT',
      entityId: project.id,
      before: { departmentId: before.departmentId },
      after: { departmentId: input.targetDepartmentId },
      reason: input.reason ?? null,
      ip: meta.ip,
      userAgent: meta.userAgent,
      tx,
    });
    return { id: project.id };
  });
}

// ──────────────────────────── Share（一个链接 = 多个项目）────────────────────────────

/** 分享管理端可见字段（不含部署/维护说明等内部信息） */
const SHARE_PROJECT_PUBLIC_SELECT = {
  id: true,
  projectCode: true,
  name: true,
  systemName: true,
  description: true,
  objective: true,
  requirement: true,
  status: true,
  healthStatus: true,
  progress: true,
  priority: true,
  startDate: true,
  dueDate: true,
  actualCompletedDate: true,
  acceptanceDate: true,
  lastUpdateAt: true,
  createdAt: true,
  department: { select: { id: true, name: true } },
  owner: { select: { id: true, displayName: true } },
} satisfies Prisma.ProjectSelect;

type ShareProjectRow = {
  id: string;
  projectCode: string;
  name: string;
  systemName: string | null;
  description: string | null;
  objective: string | null;
  requirement: string | null;
  status: string;
  healthStatus: string;
  progress: number;
  priority: string;
  startDate: Date | null;
  dueDate: Date | null;
  actualCompletedDate: Date | null;
  acceptanceDate: Date | null;
  lastUpdateAt: Date | null;
  createdAt: Date;
  department: { id: string; name: string } | null;
  owner: { id: string; displayName: string } | null;
};

function toShareProjectSummary(p: ShareProjectRow) {
  return {
    id: p.id,
    projectCode: p.projectCode,
    name: p.name,
    systemName: p.systemName,
    description: p.description,
    objective: p.objective,
    requirement: p.requirement,
    status: p.status,
    healthStatus: p.healthStatus,
    progress: p.progress,
    priority: p.priority,
    startDate: p.startDate ? p.startDate.toISOString().slice(0, 10) : null,
    dueDate: p.dueDate ? p.dueDate.toISOString().slice(0, 10) : null,
    actualCompletedDate: p.actualCompletedDate ? p.actualCompletedDate.toISOString().slice(0, 10) : null,
    department: p.department?.name ?? null,
    owner: p.owner?.displayName ?? null,
  };
}

/** 我创建的分享链接列表（仅显示自己创建的） */
export async function listShares(actor: Actor) {
  const rows = await prisma.projectShareToken.findMany({
    where: { createdById: actor.userId },
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: { select: { displayName: true } },
      _count: { select: { projects: true } },
    },
  });
  return rows.map((t) => ({
    id: t.id,
    name: t.name,
    tokenPrefix: t.token.slice(0, 8) + '…',
    projectCount: t._count.projects,
    expiresAt: t.expiresAt?.toISOString() ?? null,
    revokedAt: t.revokedAt?.toISOString() ?? null,
    accessCount: t.accessCount,
    createdAt: t.createdAt.toISOString(),
    createdBy: t.createdBy?.displayName ?? null,
    shareUrl: `/share/${t.token}`,
  }));
}

/** 分享链接详情（含其中所有项目的安全摘要 + 最近更新） */
export async function getShare(actor: Actor, shareId: string) {
  const tok = await prisma.projectShareToken.findUnique({
    where: { id: shareId },
    include: {
      projects: {
        orderBy: { createdAt: 'asc' },
        include: { project: { select: SHARE_PROJECT_PUBLIC_SELECT } },
      },
    },
  });
  if (!tok || tok.createdById !== actor.userId) throw new NotFoundError('SHARE_TOKEN');
  return { ...serializeShareDetail(tok), shareUrl: `/share/${tok.token}` };
}

/** 创建分享链接：勾选多个项目 → 生成一个 token */
export async function createShare(
  actor: Actor,
  input: z.infer<typeof createShareSchema>,
  meta: RequestMeta = {},
) {
  const scope = buildScope(actor);

  // 全部项目必须在创建者可见范围内，任一不可见 → 404（不泄露存在性）
  const projects = await prisma.project.findMany({
    where: { id: { in: input.projectIds }, deletedAt: null },
    select: {
      id: true,
      projectCode: true,
      departmentId: true,
      ownerId: true,
      creatorId: true,
      allowDepartmentEdit: true,
      status: true,
    },
  });
  if (projects.length !== input.projectIds.length) throw new NotFoundError('PROJECT');
  for (const p of projects) assertProjectAccess(scope, p);

  const token = randomBytes(32).toString('hex');
  const expiresAt = input.expiresInDays
    ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
    : null;
  const name =
    input.name?.trim() || `${actor.displayName} 分享的项目（${projects.length} 个）`;

  return prisma.$transaction(async (tx) => {
    const created = await tx.projectShareToken.create({
      data: {
        name,
        token,
        expiresAt,
        createdById: actor.userId,
        projects: {
          create: projects.map((p) => ({
            projectId: p.id,
            addedById: actor.userId,
          })),
        },
      },
    });
    await writeAudit({
      actorId: actor.userId,
      action: AuditAction.SHARE_CREATE,
      entity: 'SHARE_TOKEN',
      entityId: created.id,
      after: { name, projectIds: input.projectIds, expiresAt },
      ip: meta.ip,
      userAgent: meta.userAgent,
      tx,
    });
    return {
      id: created.id,
      name,
      token,
      shareUrl: `/share/${token}`,
      projectCount: projects.length,
    };
  });
}

/** 撤销（只有创建者可撤销，其他人一律 404） */
export async function revokeShare(actor: Actor, tokenId: string, meta: RequestMeta = {}) {
  const tok = await prisma.projectShareToken.findUnique({
    where: { id: tokenId },
    select: { id: true, createdById: true },
  });
  if (!tok || tok.createdById !== actor.userId) throw new NotFoundError('SHARE_TOKEN');

  await prisma.$transaction(async (tx) => {
    await tx.projectShareToken.update({
      where: { id: tokenId },
      data: { revokedAt: new Date(), revokedById: actor.userId },
    });
    await writeAudit({
      actorId: actor.userId,
      action: AuditAction.SHARE_REVOKE,
      entity: 'SHARE_TOKEN',
      entityId: tokenId,
      ip: meta.ip,
      userAgent: meta.userAgent,
      tx,
    });
  });
  return { id: tokenId };
}

type ShareTokenWithProjects = Prisma.ProjectShareTokenGetPayload<{
  include: {
    projects: {
      orderBy: { createdAt: 'asc' };
      include: { project: { select: typeof SHARE_PROJECT_PUBLIC_SELECT } };
    };
  };
}>;

/** 公开解析（无需登录）：token 有效 → 返回分享名 + 多项目安全摘要（含每项目最近 3 条更新） */
export async function resolveShareToken(token: string) {
  const tok = await prisma.projectShareToken.findUnique({
    where: { token },
    include: {
      projects: {
        orderBy: { createdAt: 'asc' },
        include: { project: { select: SHARE_PROJECT_PUBLIC_SELECT } },
      },
    },
  });
  if (!tok || tok.revokedAt || (tok.expiresAt && tok.expiresAt.getTime() < Date.now())) {
    throw new NotFoundError('SHARE_TOKEN');
  }

  // 记录访问次数（无效/过期不算）
  await prisma.projectShareToken.update({
    where: { id: tok.id },
    data: { accessCount: { increment: 1 }, lastAccessedAt: new Date() },
  });

  const projectIds = tok.projects.map((r) => r.project.id);
  const recent = await prisma.projectUpdate.findMany({
    where: { projectId: { in: projectIds } },
    orderBy: { createdAt: 'desc' },
    take: projectIds.length * 3,
    include: { createdBy: { select: { displayName: true } } },
  });
  const byProject = new Map<string, typeof recent>();
  for (const u of recent) {
    const arr = byProject.get(u.projectId) ?? [];
    if (arr.length < 3) arr.push(u);
    byProject.set(u.projectId, arr);
  }

  return {
    id: tok.id,
    name: tok.name,
    projectCount: tok.projects.length,
    createdAt: tok.createdAt.toISOString(),
    expiresAt: tok.expiresAt?.toISOString() ?? null,
    projects: tok.projects.map((rel) => ({
      ...toShareProjectSummary(rel.project),
      lastUpdateAt: rel.project.lastUpdateAt ? rel.project.lastUpdateAt.toISOString() : null,
      updates: (byProject.get(rel.project.id) ?? []).map((u) => ({
        id: u.id,
        content: u.content,
        progress: u.progress,
        createdAt: u.createdAt.toISOString(),
        author: u.createdBy?.displayName ?? null,
      })),
    })),
  };
}

function serializeShareDetail(tok: ShareTokenWithProjects) {
  return {
    id: tok.id,
    name: tok.name,
    projectCount: tok.projects.length,
    createdAt: tok.createdAt.toISOString(),
    expiresAt: tok.expiresAt?.toISOString() ?? null,
    revokedAt: tok.revokedAt?.toISOString() ?? null,
    accessCount: tok.accessCount,
    projects: tok.projects.map((rel) => ({
      ...toShareProjectSummary(rel.project),
      lastUpdateAt: rel.project.lastUpdateAt ? rel.project.lastUpdateAt.toISOString() : null,
    })),
  };
}

// ──────────────────────────── Timeline / History ────────────────────────────

export async function getTimeline(actor: Actor, projectId: string) {
  const scope = buildScope(actor);
  const project = await loadProjectForWrite(scope, projectId);
  return prisma.projectTimelineEvent.findMany({
    where: { projectId: project.id },
    orderBy: { occurredAt: 'desc' },
    include: { actor: { select: { id: true, displayName: true } } },
  });
}

export async function getHistory(actor: Actor, projectId: string) {
  if (!isAdminOrMaster(actor)) throw new ForbiddenError();
  const scope = buildScope(actor);
  const project = await loadProjectForWrite(scope, projectId);
  return prisma.auditLog.findMany({
    where: { entity: 'PROJECT', entityId: project.id },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { user: { select: { id: true, displayName: true } } },
  });
}

// ──────────────────────────── References ────────────────────────────

export async function listDepartments() {
  return prisma.department.findMany({
    where: { isActive: true },
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    select: { id: true, name: true, code: true, category: true },
  });
}

export async function listProjectTypes() {
  return prisma.projectType.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true },
  });
}

export async function listActiveUsers() {
  return prisma.user.findMany({
    where: { isActive: true, deletedAt: null },
    orderBy: { displayName: 'asc' },
    select: { id: true, displayName: true, role: true, departmentId: true },
  });
}
