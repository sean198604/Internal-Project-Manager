'use client';

import { apiFetch } from '@/components/form-helpers';

export type PStatus =
  | 'DRAFT'
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'WAITING_ACCEPTANCE'
  | 'COMPLETED'
  | 'ARCHIVED'
  | 'ON_HOLD'
  | 'CANCELLED'
  | 'MERGED';

/**
 * 状态机邻接表 —— 必须与 src/server/modules/projects/state-machine.ts 保持一致。
 * 改动状态机时两端同步更新，否则前端预览/自动流转会与后端校验脱节。
 */
export const ALLOWED: Record<PStatus, PStatus[]> = {
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

/** 生命周期主线（编辑器状态步进条展示顺序） */
export const LIFECYCLE: PStatus[] = [
  'DRAFT',
  'PLANNED',
  'IN_PROGRESS',
  'WAITING_ACCEPTANCE',
  'COMPLETED',
];

export function canTransition(from: PStatus, to: PStatus): boolean {
  if (from === to) return true;
  return ALLOWED[from]?.includes(to) ?? false;
}

/**
 * BFS 寻找 from → to 的最短合法路径（含起点与终点）。
 * 例如 DRAFT → COMPLETED 返回 ['DRAFT','IN_PROGRESS','COMPLETED']。
 * 无路径返回 null。
 */
export function findPath(from: PStatus, to: PStatus): PStatus[] | null {
  if (from === to) return [from];
  const queue: PStatus[] = [from];
  const visited = new Set<PStatus>([from]);
  const prev = new Map<PStatus, PStatus>();
  while (queue.length) {
    const cur = queue.shift() as PStatus;
    for (const next of ALLOWED[cur] ?? []) {
      if (visited.has(next)) continue;
      visited.add(next);
      prev.set(next, cur);
      if (next === to) {
        const path: PStatus[] = [to];
        let p: PStatus | undefined = to;
        while (p !== undefined && p !== from) {
          p = prev.get(p);
          if (p !== undefined) path.unshift(p);
        }
        return path;
      }
      queue.push(next);
    }
  }
  return null;
}

/**
 * 把项目状态一步到位推进到 to：
 * 后端只允许相邻迁移，这里按 findPath 逐跳 PATCH，最后一跳可附带额外关键字段
 * （progress / actualCompletedDate 等）。每跳都会产生一条状态变更记录，审计完整。
 */
export async function advanceStatus(
  projectId: string,
  from: PStatus,
  to: PStatus,
  finalExtra?: Record<string, unknown>,
): Promise<PStatus[]> {
  const path = findPath(from, to);
  if (!path || path.length < 2) {
    throw new Error('状态机不允许从当前状态流转到该目标状态');
  }
  for (let i = 1; i < path.length; i++) {
    const body: Record<string, unknown> = { status: path[i] };
    if (i === path.length - 1 && finalExtra && Object.keys(finalExtra).length > 0) {
      Object.assign(body, finalExtra);
    }
    await apiFetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }
  return path;
}

/** 台北时区今天的 YYYY-MM-DD（归档/完成日期落库用，遵守 DB UTC / 展示 Asia/Taipei 铁律） */
export function todayTaipei(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
}
