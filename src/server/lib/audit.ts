import { Prisma } from '@prisma/client';
import { prisma } from '@/server/db/prisma';

export const AuditAction = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  PROJECT_CREATE: 'PROJECT_CREATE',
  PROJECT_UPDATE: 'PROJECT_UPDATE',
  PROJECT_DELETE: 'PROJECT_DELETE',
  PROJECT_RESTORE: 'PROJECT_RESTORE',
  PROJECT_ACCEPT: 'PROJECT_ACCEPT',
  PROJECT_ARCHIVE: 'PROJECT_ARCHIVE',
  PROJECT_UNARCHIVE: 'PROJECT_UNARCHIVE',
  PROJECT_BRANCH: 'PROJECT_BRANCH',
  PROJECT_MERGE: 'PROJECT_MERGE',
  PROJECT_MIGRATE: 'PROJECT_MIGRATE',
  UPDATE_ADDED: 'UPDATE_ADDED',
  DEPLOYMENT_CREATE: 'DEPLOYMENT_CREATE',
  DEPLOYMENT_UPDATE: 'DEPLOYMENT_UPDATE',
  DEPLOYMENT_DELETE: 'DEPLOYMENT_DELETE',
  DOC_UPLOAD: 'DOC_UPLOAD',
  DOC_DELETE: 'DOC_DELETE',
  VERSION_CREATE: 'VERSION_CREATE',
  SHARE_CREATE: 'SHARE_CREATE',
  SHARE_REVOKE: 'SHARE_REVOKE',
  USER_CREATE: 'USER_CREATE',
  USER_UPDATE: 'USER_UPDATE',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  DEPARTMENT_CHANGE: 'DEPARTMENT_CHANGE',
  PROJECT_TYPE_CHANGE: 'PROJECT_TYPE_CHANGE',
} as const;

export type AuditActionValue = (typeof AuditAction)[keyof typeof AuditAction];

type AuditInput = {
  actorId?: string | null;
  action: AuditActionValue | string;
  entity: string;
  entityId?: string | null;
  changedFields?: string[];
  before?: unknown;
  after?: unknown;
  reason?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  tx?: Prisma.TransactionClient;
};

export async function writeAudit(input: AuditInput): Promise<void> {
  const client = input.tx ?? prisma;
  try {
    // 把 undefined 显式转换为 null，避免 Prisma Json 字段接收 undefined
    const beforeVal =
      input.before === undefined ? null : (input.before as Prisma.InputJsonValue);
    const afterVal =
      input.after === undefined ? null : (input.after as Prisma.InputJsonValue);
    await client.auditLog.create({
      data: {
        userId: input.actorId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        changedFields: input.changedFields ?? [],
        before: beforeVal === null ? Prisma.JsonNull : beforeVal,
        after: afterVal === null ? Prisma.JsonNull : afterVal,
        reason: input.reason ?? null,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (err) {
    // 审计失败不得阻断业务主流程，但必须留痕
    console.error('[audit] failed to write audit log', err);
  }
}

export function requestMeta(request: Request): { ip: string | null; userAgent: string | null } {
  const headers = request.headers;
  const forwarded = headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0]!.trim() : headers.get('x-real-ip');
  return { ip: ip ?? null, userAgent: headers.get('user-agent') };
}
