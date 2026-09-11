import type { AttachmentType, Prisma } from '@prisma/client';
import { prisma } from '@/server/db/prisma';

export const MIN_REQUIREMENT_LENGTH = 50;

export const ARCHIVE_ITEMS = [
  {
    key: 'REQUIREMENT', label: '项目需求完整', weight: 15,
    description: '已沉淀项目要解决的问题、范围和关键需求。',
    criteria: `项目需求不少于 ${MIN_REQUIREMENT_LENGTH} 个字符。`,
  },
  {
    key: 'ACCEPTANCE', label: '验收信息完整', weight: 10,
    description: '已记录验收人和验收日期，确认成果已交付。',
    criteria: '同时填写验收人和验收日期。',
  },
  {
    key: 'DEPLOYMENT', label: '部署信息完整', weight: 15,
    description: '至少登记一条可追溯的部署记录。',
    criteria: '存在至少一条部署记录（环境、主机、端口等按实际填写）。',
  },
  {
    key: 'VERSION', label: '当前版本完整', weight: 10,
    description: '明确当前可运行的软件版本或版本标识。',
    criteria: '“当前版本”字段不为空。',
  },
  {
    key: 'DOCUMENT', label: '文档已提交', weight: 15,
    description: '已上传可供后续维护人员查阅的项目文档。',
    criteria: '至少存在一份当前版本的“文档”类型资料。',
  },
  {
    key: 'SCREENSHOT', label: '图片资料已提交', weight: 10,
    description: '已上传系统界面、关键流程或部署佐证图片。',
    criteria: '至少存在一张当前版本的“截图”类型图片。',
  },
  {
    key: 'SPECIAL_NOTES', label: '特殊注意事项已记录', weight: 10,
    description: '记录限制条件、风险、升级顺序或禁止操作。',
    criteria: '“特殊注意事项”字段不为空。',
  },
  {
    key: 'MAINTENANCE', label: '维护方式已记录', weight: 10,
    description: '说明启动、停止、重启、回滚或日常维护方式。',
    criteria: '“维护说明”字段不为空。',
  },
  {
    key: 'CONFIRMED', label: '负责人已确认', weight: 5,
    description: '由归档负责人确认资产资料可交接、可追溯。',
    criteria: '已完成归档负责人确认。',
  },
] as const;

export type ArchiveItemKey = (typeof ARCHIVE_ITEMS)[number]['key'];

/** 归档门槛：低于此分数归档需二次确认（不阻止归档） */
export const ARCHIVE_WARNING_THRESHOLD = 60;

export type ArchiveState = {
  score: number;
  items: Record<ArchiveItemKey, boolean>;
};

/**
 * 计算归档完整度。数据变更时调用，结果写入
 * projects.archiveCompleteness 与 project_archive_checklists。
 */
export async function computeArchiveState(
  tx: Prisma.TransactionClient,
  projectId: string,
): Promise<ArchiveState> {
  const project = await tx.project.findUnique({
    where: { id: projectId },
    select: {
      requirement: true,
      acceptedById: true,
      acceptanceDate: true,
      currentVersion: true,
      specialNotes: true,
      maintenanceNotes: true,
      archiveConfirmedById: true,
    },
  });

  if (!project) {
    return { score: 0, items: emptyItems() };
  }

  const [deploymentCount, docGroups] = await Promise.all([
    tx.projectDeployment.count({ where: { projectId } }),
    tx.projectDocument.groupBy({
      by: ['docType'],
      where: { projectId, deletedAt: null, isCurrent: true },
      _count: { _all: true },
    }),
  ]);

  const hasDocType = (type: AttachmentType) =>
    docGroups.some((g) => g.docType === type && g._count._all > 0);

  const items: Record<ArchiveItemKey, boolean> = {
    REQUIREMENT: (project.requirement?.trim().length ?? 0) >= MIN_REQUIREMENT_LENGTH,
    ACCEPTANCE: Boolean(project.acceptedById && project.acceptanceDate),
    DEPLOYMENT: deploymentCount > 0,
    VERSION: Boolean(project.currentVersion?.trim()),
    DOCUMENT: hasDocType('DOCUMENT'),
    SCREENSHOT: hasDocType('SCREENSHOT'),
    SPECIAL_NOTES: Boolean(project.specialNotes?.trim()),
    MAINTENANCE: Boolean(project.maintenanceNotes?.trim()),
    CONFIRMED: Boolean(project.archiveConfirmedById),
  };

  let score = 0;
  for (const item of ARCHIVE_ITEMS) {
    if (items[item.key]) score += item.weight;
  }

  return { score, items };
}

/** 把自动判定结果同步到 checklist 与项目主表 */
export async function syncArchiveState(
  tx: Prisma.TransactionClient,
  projectId: string,
): Promise<ArchiveState> {
  const state = await computeArchiveState(tx, projectId);

  await tx.project.update({
    where: { id: projectId },
    data: { archiveCompleteness: state.score },
  });

  for (const item of ARCHIVE_ITEMS) {
    const auto = state.items[item.key];
    const existing = await tx.projectArchiveChecklist.findUnique({
      where: { projectId_itemKey: { projectId, itemKey: item.key } },
      select: { isChecked: true, isAutoChecked: true },
    });

    if (!existing) {
      await tx.projectArchiveChecklist.create({
        data: { projectId, itemKey: item.key, isChecked: auto, isAutoChecked: auto },
      });
      continue;
    }

    // 人工勾选过的项保留人工结果；自动项跟随重算
    if (existing.isAutoChecked || auto) {
      await tx.projectArchiveChecklist.update({
        where: { projectId_itemKey: { projectId, itemKey: item.key } },
        data: { isChecked: auto || existing.isChecked, isAutoChecked: auto },
      });
    }
  }

  return state;
}

function emptyItems(): Record<ArchiveItemKey, boolean> {
  return {
    REQUIREMENT: false,
    ACCEPTANCE: false,
    DEPLOYMENT: false,
    VERSION: false,
    DOCUMENT: false,
    SCREENSHOT: false,
    SPECIAL_NOTES: false,
    MAINTENANCE: false,
    CONFIRMED: false,
  };
}

export async function recomputeArchive(projectId: string): Promise<ArchiveState> {
  return prisma.$transaction((tx) => syncArchiveState(tx, projectId));
}
