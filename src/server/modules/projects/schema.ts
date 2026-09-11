import { z } from 'zod';

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD')
  .nullable()
  .optional();

const nullableText = (max: number) => z.string().max(max).nullable().optional();

export const createProjectSchema = z.object({
  name: z.string().min(1, '项目名称必填').max(200),
  shortName: z.string().max(100).nullable().optional(),
  systemName: z.string().max(200).nullable().optional(),
  description: nullableText(4000),
  objective: nullableText(4000),
  requirement: nullableText(40000),
  acceptanceCriteria: z
    .array(
      z.object({
        text: z.string().min(1).max(500),
        done: z.boolean().default(false),
      }),
    )
    .max(50)
    .nullable()
    .optional(),
  departmentId: z.string().uuid('请选择需求部门'),
  projectTypeId: z.string().uuid('请选择项目类型'),
  ownerId: z.string().uuid('请选择项目负责人'),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).default('P2'),
  startDate: dateString,
  dueDate: dateString,
});

export const updateProjectSchema = createProjectSchema
  .partial()
  .extend({
    expectedUpdatedAt: z.string().datetime().optional(),
    actualCompletedDate: dateString,
    acceptanceDate: dateString,
    status: z
      .enum([
        'DRAFT',
        'PLANNED',
        'IN_PROGRESS',
        'WAITING_ACCEPTANCE',
        'COMPLETED',
        'ARCHIVED',
        'ON_HOLD',
        'CANCELLED',
        'MERGED',
      ])
      .optional(),
    healthStatus: z.enum(['NORMAL', 'AT_RISK', 'DELAYED', 'ON_HOLD']).optional(),
    progress: z.number().int().min(0).max(100).optional(),
    changeReason: z.string().max(1000).nullable().optional(),
  });

export const listProjectsSchema = z.object({
  q: z.string().max(200).optional(),
  departmentId: z.string().uuid().optional(),
  projectTypeId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
  status: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (v ? (Array.isArray(v) ? v : v.split(',')) : undefined)),
  healthStatus: z.string().optional(),
  priority: z.string().optional(),
  dueFrom: dateString,
  dueTo: dateString,
  view: z.enum(['active', 'completed', 'archive', 'all']).default('active'),
  sort: z
    .enum(['updatedAt', 'dueDate', 'createdAt', 'priority', 'projectCode', 'lastUpdateAt', 'port'])
    .default('updatedAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const createUpdateSchema = z.object({
  content: z.string().min(1, '更新内容必填').max(20000),
  progress: z.number().int().min(0).max(100).nullable().optional(),
  currentIssues: nullableText(4000),
  nextSteps: nullableText(4000),
});

// ───────── Updates / Documents / Deployments / Archive / Lineage / Share ─────────

export const deploymentSchema = z.object({
  environment: z.enum(['DEVELOPMENT', 'TESTING', 'STAGING', 'PRODUCTION']),
  serverName: z.string().max(200).nullable().optional(),
  serverIp: z.string().max(64).nullable().optional(),
  hostname: z.string().max(200).nullable().optional(),
  port: z.coerce.number().int().min(0).max(65535).nullable().optional(),
  protocol: z.string().max(20).nullable().optional(),
  deploymentPath: z.string().max(500).nullable().optional(),
  serviceName: z.string().max(200).nullable().optional(),
  runtime: z.string().max(200).nullable().optional(),
  database: z.string().max(200).nullable().optional(),
  version: z.string().max(80).nullable().optional(),
  status: z.enum(['ACTIVE', 'MAINTENANCE', 'DEPRECATED', 'OFFLINE', 'UNKNOWN']).default('ACTIVE'),
  notes: z.string().max(2000).nullable().optional(),
  lastVerifiedAt: dateString,
});

export const updateDeploymentSchema = deploymentSchema.partial();

export const documentSchema = z.object({
  docType: z.enum(['REQUIREMENT', 'DOCUMENT', 'SCREENSHOT', 'DEPLOYMENT', 'TESTING', 'ACCEPTANCE', 'OTHER']),
  title: z.string().min(1, '文档标题必填').max(200),
  version: z.string().max(40).nullable().optional(),
  isCurrent: z.boolean().default(true),
  notes: z.string().max(2000).nullable().optional(),
  // file metadata 由上传 attachment 提供；保持 schema 兼容
  fileName: z.string().max(255).optional(),
  storageKey: z.string().max(500).optional(),
  size: z.coerce.number().int().min(0).optional(),
  mimeType: z.string().max(120).nullable().optional(),
  attachmentId: z.string().uuid().optional(),
});

export const uploadMetaSchema = z.object({
  fileName: z.string().min(1).max(255),
  size: z.coerce.number().int().min(0).max(50 * 1024 * 1024, '文件不能超过 50MB'),
  mimeType: z.string().max(120).optional(),
});

export const acceptanceSchema = z.object({
  acceptanceDate: dateString,
  acceptedById: z.string().uuid().optional(),
  acceptanceNote: z.string().max(2000).nullable().optional(),
  actualCompletedDate: dateString,
});

export const archiveSchema = z.object({
  confirm: z.boolean().optional(),
  currentVersion: z.string().max(80).nullable().optional(),
  systemStatus: z.enum(['ACTIVE', 'MAINTENANCE', 'DEPRECATED', 'OFFLINE', 'UNKNOWN']).default('ACTIVE'),
  systemName: z.string().max(200).nullable().optional(),
  description: z.string().max(4000).nullable().optional(),
  objective: z.string().max(4000).nullable().optional(),
  businessValue: z.string().max(4000).nullable().optional(),
  specialNotes: z.string().max(20000).nullable().optional(),
  maintenanceNotes: z.string().max(20000).nullable().optional(),
  handoverInfo: z.string().max(20000).nullable().optional(),
  currentMaintainerId: z.string().uuid().nullable().optional(),
});

export const checklistToggleSchema = z.object({
  itemKey: z.string().min(1).max(40),
  isChecked: z.boolean(),
});

export const branchSchema = z.object({
  name: z.string().min(1).max(200),
  departmentId: z.string().uuid(),
  projectTypeId: z.string().uuid(),
  ownerId: z.string().uuid(),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).default('P2'),
  startDate: dateString,
  dueDate: dateString,
  requirement: nullableText(40000),
  objective: nullableText(4000),
});

export const mergeSchema = z.object({
  sourceProjectIds: z.array(z.string().uuid()).min(1).max(10),
  reason: z.string().max(1000).optional(),
});

export const migrationSchema = z.object({
  targetDepartmentId: z.string().uuid(),
  reason: z.string().max(1000).optional(),
});

export const createShareSchema = z.object({
  /** 分享名称（可选，缺省自动生成「XX 分享的项目」） */
  name: z.string().trim().max(100).nullable().optional(),
  /** 被分享的项目 id 列表（>=1），全部必须在创建者可见范围内 */
  projectIds: z.array(z.string().uuid()).min(1, '请至少选择一个项目').max(200),
  /** 有效天数；null = 永久有效 */
  expiresInDays: z.coerce.number().int().min(1).max(3650).nullable().optional().default(30),
});
