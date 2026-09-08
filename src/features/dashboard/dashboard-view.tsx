'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { ChevronRight, Plus, AlertTriangle, Clock, FileArchive, Activity, PauseCircle } from 'lucide-react';
import type { Role } from '@prisma/client';
import { Card, CardHeader, StatCard, Badge } from '@/components/ui/primitives';
import { Table, Th, Td } from '@/components/ui/table';
import { PriorityBadge, StatusBadge } from '@/components/status-badge';

type FocusItem = {
  id: string;
  projectCode: string;
  name: string;
  dueDate?: string | null;
  lastUpdateAt?: string | null;
  priority: string;
  department?: string | null;
  owner?: string | null;
};

export function DashboardView({
  role,
  totals,
  distributions,
  focus,
}: {
  role: Role;
  totals: {
    total: number;
    inProgress: number;
    waiting: number;
    overdue: number;
    dueSoon: number;
    stale: number;
    completedRecent: number;
    archivedRecent: number;
  };
  distributions: {
    status: Record<string, number>;
    priority: Record<string, number>;
    department: { name: string; count: number }[];
  };
  focus: { overdue: FocusItem[]; dueSoon: FocusItem[]; stale: FocusItem[] };
}) {
  const isPrivileged = role === 'ADMIN' || role === 'MASTER';
  const totalActive = useMemo(
    () => Object.values(distributions.status).reduce((s, n) => s + n, 0),
    [distributions.status],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted">Overview</div>
          <h1 className="text-xl font-semibold text-fg">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">{isPrivileged ? '可查看全部项目数据' : '可查看本部门项目数据'}</p>
        </div>
        <Link href="/projects/new" className="btn-primary h-9 px-4 inline-flex items-center gap-1.5 text-sm">
          <Plus size={15} /> 新建项目
        </Link>
      </div>

      {/* 关键指标 */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard label="项目总数" value={totals.total} hint="含活跃与归档" />
        <StatCard label="进行中" value={totals.inProgress} tone="blue" />
        <StatCard label="待验收" value={totals.waiting} tone="amber" />
        <StatCard label="已逾期" value={totals.overdue} tone="red" hint={`待办中需立即关注`} />
        <StatCard label="即将到期" value={totals.dueSoon} tone="amber" hint="7 天内" />
        <StatCard label="长期未更新" value={totals.stale} tone="amber" hint="> 7 天" />
        <StatCard label="近 30 天完成" value={totals.completedRecent} tone="green" />
        <StatCard label="近 30 天归档" value={totals.archivedRecent} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 状态分布 */}
        <Card>
          <CardHeader title="项目状态分布" description={`共 ${totalActive} 个有效项目`} />
          <div className="p-5 space-y-2.5">
            {Object.entries(distributions.status).length === 0 ? (
              <div className="text-sm text-muted">暂无数据</div>
            ) : (
              Object.entries(distributions.status)
                .sort((a, b) => b[1] - a[1])
                .map(([status, count]) => {
                  const pct = totalActive ? Math.round((count / totalActive) * 100) : 0;
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <div className="w-24 shrink-0">
                        <StatusBadge status={status as never} />
                      </div>
                      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-slate-900"
                          style={{ width: `${pct}%` }}
                          aria-hidden="true"
                        />
                      </div>
                      <div className="w-20 text-right text-sm tabular-nums text-slate-600">
                        {count} <span className="text-muted">({pct}%)</span>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </Card>

        {/* 优先级分布 */}
        <Card>
          <CardHeader title="优先级分布" />
          <div className="p-5 grid grid-cols-2 gap-3">
            {(['P0', 'P1', 'P2', 'P3'] as const).map((p) => (
              <div key={p} className="rounded-md border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <PriorityBadge priority={p} />
                  <div className="text-xl font-semibold tabular-nums">{distributions.priority[p]}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* 部门分布 */}
        <Card>
          <CardHeader title="部门分布" />
          <div className="p-5 space-y-2">
            {distributions.department.length === 0 ? (
              <div className="text-sm text-muted">暂无数据</div>
            ) : (
              distributions.department.map((d) => (
                <div key={d.name} className="flex items-center justify-between">
                  <span className="text-sm text-fg">{d.name}</span>
                  <span className="text-sm tabular-nums text-muted">{d.count}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* 重点项目列表 */}
      <div className="grid gap-6 lg:grid-cols-3">
        <FocusList
          title="已逾期"
          icon={<AlertTriangle size={14} className="text-red-600" />}
          emptyText="🎉 没有逾期项目"
          rows={focus.overdue}
          dateKey="dueDate"
        />
        <FocusList
          title="7 天内到期"
          icon={<Clock size={14} className="text-amber-600" />}
          emptyText="没有即将到期项目"
          rows={focus.dueSoon}
          dateKey="dueDate"
        />
        <FocusList
          title="长期未更新"
          icon={<PauseCircle size={14} className="text-amber-600" />}
          emptyText="所有进行中项目都已更新"
          rows={focus.stale}
          dateKey="lastUpdateAt"
        />
      </div>
    </div>
  );
}

function FocusList({
  title,
  icon,
  emptyText,
  rows,
  dateKey,
}: {
  title: string;
  icon: React.ReactNode;
  emptyText: string;
  rows: FocusItem[];
  dateKey: 'dueDate' | 'lastUpdateAt';
}) {
  return (
    <Card>
      <CardHeader title={title} description={`${rows.length} 项`} actions={icon} />
      {rows.length === 0 ? (
        <div className="p-6 text-sm text-muted text-center">{emptyText}</div>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>编号 / 名称</Th>
              <Th className="text-right">{dateKey === 'dueDate' ? '到期' : '最后更新'}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <Td>
                  <Link href={`/projects/${r.id}`} className="group flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted font-mono">{r.projectCode}</span>
                      <PriorityBadge priority={r.priority} />
                    </div>
                    <span className="text-sm text-fg group-hover:underline">{r.name}</span>
                    <span className="text-xs text-muted">
                      {r.owner ?? '未指派'} · {r.department ?? ''}
                    </span>
                  </Link>
                </Td>
                <Td className="text-right text-xs text-slate-500" align="right">
                  {r[dateKey] ? r[dateKey]!.slice(0, 10) : '—'}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}
