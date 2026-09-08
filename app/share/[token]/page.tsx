'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { Calendar, ChevronDown, ChevronRight, Clock, FolderOpen, Link2 } from 'lucide-react';
import { Badge } from '@/components/ui/primitives';
import { PriorityBadge, STATUS_LABEL, type Status } from '@/components/status-badge';

type ShareUpdate = {
  id: string;
  content: string;
  progress: number | null;
  createdAt: string;
  author: string | null;
};

type ShareProject = {
  id: string;
  projectCode: string;
  name: string;
  systemName: string | null;
  description: string | null;
  objective: string | null;
  requirement: string | null;
  status: Status;
  healthStatus: string;
  progress: number;
  priority: string;
  startDate: string | null;
  dueDate: string | null;
  actualCompletedDate: string | null;
  department: string | null;
  owner: string | null;
  lastUpdateAt: string | null;
  updates: ShareUpdate[];
};

type SharePayload = {
  id: string;
  name: string | null;
  projectCount: number;
  createdAt: string;
  expiresAt: string | null;
  projects: ShareProject[];
};

const STATUS_TONE: Record<string, React.ComponentProps<typeof Badge>['tone']> = {
  IN_PROGRESS: 'blue',
  WAITING_ACCEPTANCE: 'amber',
  COMPLETED: 'green',
  ARCHIVED: 'slate',
  ON_HOLD: 'orange',
  CANCELLED: 'red',
  MERGED: 'violet',
  DRAFT: 'neutral',
  PLANNED: 'sky',
};

export default function PublicSharePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = React.useState<SharePayload | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    fetch(`/api/public/share/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error?.message ?? '链接无效或已失效');
        }
        return res.json();
      })
      .then((json) => setData(json.data))
      .catch((e) => setError((e as Error).message));
  }, [token]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <main className="min-h-screen bg-slate-100 py-10 px-4">
      <div className="mx-auto max-w-4xl space-y-5">
        <header className="text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] uppercase tracking-wider text-slate-500 ring-1 ring-slate-200">
            <Link2 size={12} /> Internal-Project-Manager · 项目分享
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">
            {data ? data.name : '…'}
          </h1>
          {data && (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
              <span>共 {data.projectCount} 个项目</span>
              <span>·</span>
              <span>创建于 {data.createdAt.slice(0, 10)}</span>
              {data.expiresAt && (
                <>
                  <span>·</span>
                  <span>链接有效期至 {data.expiresAt.slice(0, 10)}</span>
                </>
              )}
            </div>
          )}
        </header>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-10 text-center">
            <div className="text-3xl">🔒</div>
            <div className="mt-2 text-sm font-medium text-red-800">{error}</div>
            <p className="mt-1 text-xs text-red-600">
              链接可能已被撤销或过期，请联系分享者获取新的链接。
            </p>
          </div>
        )}

        {!data && !error && (
          <div className="py-16 text-center text-sm text-slate-400">加载分享内容…</div>
        )}

        {data && (
          <ol className="space-y-4">
            {data.projects.map((p) => {
              const isOpen = expanded.has(p.id);
              return (
                <li key={p.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                  {/* 头部：始终可见 */}
                  <button
                    className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-50"
                    onClick={() => toggle(p.id)}
                  >
                    <span className="shrink-0 text-slate-400">
                      {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </span>
                    <span className="shrink-0 font-mono text-xs text-slate-400">{p.projectCode}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-900">{p.name}</span>
                      {p.systemName && (
                        <span className="block truncate text-xs text-slate-400">{p.systemName}</span>
                      )}
                    </span>
                    <span className="shrink-0 font-mono text-xs text-slate-500">{p.progress}%</span>
                    <Badge tone={STATUS_TONE[p.status] ?? 'neutral'} dot>
                      {STATUS_LABEL[p.status]}
                    </Badge>
                    <PriorityBadge priority={p.priority} />
                  </button>

                  {/* 摘要行 */}
                  <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-slate-100 px-5 py-2.5 text-xs text-slate-500">
                    <span>部门：{p.department ?? '—'}</span>
                    <span>负责人：{p.owner ?? '—'}</span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={12} /> 到期：{p.dueDate ?? '—'}
                    </span>
                    {p.lastUpdateAt && (
                      <span className="inline-flex items-center gap-1">
                        <Clock size={12} /> 最近更新：{p.lastUpdateAt.slice(0, 10)}
                      </span>
                    )}
                  </div>

                  {/* 展开详情 */}
                  {isOpen && (
                    <div className="space-y-4 border-t border-slate-100 px-5 py-4 text-sm">
                      {p.objective ? (
                        <div>
                          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">项目目标</div>
                          <div className="whitespace-pre-wrap text-slate-700">{p.objective}</div>
                        </div>
                      ) : null}
                      {p.requirement ? (
                        <div>
                          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">需求说明</div>
                          <div className="whitespace-pre-wrap text-slate-700">{p.requirement}</div>
                        </div>
                      ) : null}

                      <div>
                        <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                          最近进度更新{p.updates.length > 0 ? `（${p.updates.length}）` : ''}
                        </div>
                        {p.updates.length === 0 ? (
                          <div className="text-slate-400">暂无更新</div>
                        ) : (
                          <ol className="space-y-2">
                            {p.updates.map((u) => (
                              <li key={u.id} className="rounded-md bg-slate-50 px-3 py-2.5 ring-1 ring-slate-100">
                                <div className="flex items-center justify-between text-[11px] text-slate-400">
                                  <span>{u.author ?? '系统'} · {u.createdAt.slice(0, 10)}</span>
                                  {u.progress != null && (
                                    <span className="font-mono text-slate-600">{u.progress}%</span>
                                  )}
                                </div>
                                <div className="mt-1 whitespace-pre-wrap text-slate-700">{u.content}</div>
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        <footer className="flex items-center justify-center gap-1.5 pt-2 text-center text-xs text-slate-400">
          <FolderOpen size={13} />
          本页面为项目进度分享，不包含服务器 / 部署 / 维护说明等内部信息。
        </footer>
      </div>
    </main>
  );
}
