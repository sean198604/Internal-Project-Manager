import { ProjectStatus } from '@prisma/client';
import { daysFromToday, daysSince } from '@/lib/time';
import { isUnfinished } from './state-machine';

export const STALE_DAYS = 7;
export const DUE_SOON_DAYS = 7;

export type DerivedFlags = {
  isOverdue: boolean;
  overdueDays: number;
  isDueSoon: boolean;
  daysUntilDue: number | null;
  isStale: boolean;
  staleDays: number | null;
};

type DerivationInput = {
  status: ProjectStatus;
  dueDate: Date | null;
  lastUpdateAt: Date | null;
  createdAt: Date;
};

/**
 * 派生状态统一在此计算 —— 不存库，前端不得自行判断。
 */
export function computeDerived(input: DerivationInput): DerivedFlags {
  const { status, dueDate, lastUpdateAt, createdAt } = input;

  // 延期
  let isOverdue = false;
  let overdueDays = 0;
  if (dueDate && isUnfinished(status)) {
    const days = daysFromToday(dueDate);
    if (days > 0) {
      isOverdue = true;
      overdueDays = days;
    }
  }

  // 即将到期
  let isDueSoon = false;
  let daysUntilDue: number | null = null;
  if (dueDate && isUnfinished(status) && !isOverdue) {
    const days = -daysFromToday(dueDate);
    daysUntilDue = days;
    if (days >= 0 && days <= DUE_SOON_DAYS) {
      isDueSoon = true;
    }
  }

  // 长期未更新（仅进行中）
  let isStale = false;
  let staleDays: number | null = null;
  if (status === ProjectStatus.IN_PROGRESS) {
    const reference = lastUpdateAt ?? createdAt;
    const days = daysSince(reference);
    staleDays = days;
    if (days > STALE_DAYS) {
      isStale = true;
    }
  }

  return { isOverdue, overdueDays, isDueSoon, daysUntilDue, isStale, staleDays };
}
