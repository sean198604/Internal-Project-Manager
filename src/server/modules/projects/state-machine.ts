import { ProjectStatus } from '@prisma/client';
import { ConflictError } from '@/server/lib/errors';

/** 合法状态迁移表。未列出的迁移一律拒绝。 */
const ALLOWED_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  DRAFT: ['PLANNED', 'IN_PROGRESS', 'CANCELLED', 'MERGED'],
  PLANNED: ['DRAFT', 'IN_PROGRESS', 'ON_HOLD', 'CANCELLED', 'MERGED'],
  IN_PROGRESS: ['PLANNED', 'WAITING_ACCEPTANCE', 'COMPLETED', 'ON_HOLD', 'CANCELLED', 'MERGED'],
  WAITING_ACCEPTANCE: ['IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED', 'MERGED'],
  COMPLETED: ['IN_PROGRESS', 'WAITING_ACCEPTANCE', 'ARCHIVED'],
  ARCHIVED: ['COMPLETED'],
  ON_HOLD: ['DRAFT', 'PLANNED', 'IN_PROGRESS', 'CANCELLED', 'MERGED'],
  CANCELLED: ['DRAFT'],
  MERGED: [],
};

export function canTransition(from: ProjectStatus, to: ProjectStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: ProjectStatus, to: ProjectStatus): void {
  if (from === to) return;
  if (!canTransition(from, to)) {
    throw new ConflictError(
      'INVALID_STATUS_TRANSITION',
      `不允许从 ${from} 变更为 ${to}`,
      { from, to },
    );
  }
}

/** 已终结状态，不可再编辑业务字段 */
export const TERMINAL_STATUSES: ProjectStatus[] = [
  ProjectStatus.CANCELLED,
  ProjectStatus.MERGED,
];

export function isTerminal(status: ProjectStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/** 视为「未完成」的状态集合（延期 / 即将到期判定用） */
export const UNFINISHED_STATUSES: ProjectStatus[] = [
  ProjectStatus.DRAFT,
  ProjectStatus.PLANNED,
  ProjectStatus.IN_PROGRESS,
  ProjectStatus.WAITING_ACCEPTANCE,
  ProjectStatus.ON_HOLD,
];

export function isUnfinished(status: ProjectStatus): boolean {
  return UNFINISHED_STATUSES.includes(status);
}
