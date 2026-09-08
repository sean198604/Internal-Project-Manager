import type { AttachmentType, Prisma } from '@prisma/client';
import { prisma } from '@/server/db/prisma';

export const ARCHIVE_ITEMS = [
  { key: 'REQUIREMENT', label: '项目需求完整', weight: 15 },
  { key: 'ACCEPTANCE', label: '验收信息完整', weight: 10 },
  { key: 'DEPLOYMENT', label: '部署信息完整', weight: 15 },
  { key: 'VERSION', label: '当前版本完整', weight: 10 },
  { key: 'DOCUMENT', label: '文档已提交', weight: 15 },
  { key: 'SCREENSHOT', label: '截图已提交', weight: 10 },
  { key: 'SPECIAL_NOTES', label: '特殊注意事项已记录', weight: 10 },
  { key: 'MAINTENANCE', label: '维护方式已记录', weight: 10 },
  { key: 'CONFIRMED', label: '负责人已确认', weight: 5 },
] as const;

export type ArchiveItemKey = (typeof ARCHIVE_ITEMS)[number]['key'];

export const MIN_REQUIREMENT_LENGTH = 50;

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
