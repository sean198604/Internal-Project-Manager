'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Filter, Plus, RotateCcw, Search, X } from 'lucide-react';
import { Card } from '@/components/ui/primitives';
import { Table, Th, Td } from '@/components/ui/table';
import { PriorityBadge, StatusBadge, STATUS_LABEL } from '@/components/status-badge';
import { StarRating } from '@/components/star-rating';
import { Badge } from '@/components/ui/primitives';
import { Input, Select } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/primitives';
import { apiFetch } from '@/components/form-helpers';
import { useRouter, useSearchParams } from 'next/navigation';

type SortKey = 'updatedAt' | 'lastUpdateAt' | 'dueDate' | 'createdAt' | 'priority' | 'projectCode' | 'port';
type ViewKey = 'active' | 'archive' | 'all';
function isViewKey(v: string | null | undefined): v is ViewKey {
  return v === 'active' || v === 'archive' || v === 'all';
}
function isSortKey(v: string | null | undefined): v is SortKey {
  return v === 'updatedAt' || v === 'lastUpdateAt' || v === 'dueDate' || v === 'createdAt' || v === 'priority' || v === 'projectCode' || v === 'port';
}

type Item = {
  id: string;
  projectCode: string;
  name: string;
  status: string;
  healthStatus: string;
  progress: number;
  priority: string;
  rating: number;
  dueDate: string | null;
  lastUpdateAt: string | null;
  archiveCompleteness: number;
  department: { id: string; name: string } | null;
  projectType: { id: string; name: string } | null;
  owner: { id: string; displayName: string } | null;
  derived: {
    isOverdue: boolean;
    overdueDays: number;
    isDueSoon: boolean;
    isStale: boolean;
  };
};

export function ProjectsListView({
  departments,
  projectTypes,
  users,
}: {
  departments: { id: string; name: string }[];
  projectTypes: { id: string; name: string }[];
  users: { id: string; displayName: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  const [view, setView] = useState<ViewKey>(isViewKey(params.get('view')) ? params.get('view') as ViewKey : 'active');
  const [q, setQ] = useState(params.get('q') ?? '');
  const [departmentId, setDepartmentId] = useState(params.get('departmentId') ?? '');
  const [projectTypeId, setProjectTypeId] = useState(params.get('projectTypeId') ?? '');
  const [ownerId, setOwnerId] = useState(params.get('ownerId') ?? '');
  const [priority, setPriority] = useState(params.get('priority') ?? '');
  const [status, setStatus] = useState(params.get('status') ?? '');
  const [healthStatus, setHealthStatus] = useState(params.get('healthStatus') ?? '');
  const [sort, setSort] = useState<SortKey>(isSortKey(params.get('sort')) ? params.get('sort') as SortKey : 'updatedAt');
  const [order, setOrder] = useState<'asc' | 'desc'>((params.get('order') as 'asc' | 'desc') ?? 'desc');
  const [page, setPage] = useState(Number(params.get('page') ?? '1'));
  const [pageSize] = useState(20);

  const [data, setData] = useState<{ items: Item[]; total: number; totalPages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const activeFilterCount = [q, departmentId, projectTypeId, ownerId, priority, status, healthStatus]
    .filter(Boolean).length;

  useEffect(() => {
    const sp = new URLSearchParams();
    if (view !== 'active') sp.set('view', view);
    if (q) sp.set('q', q);
    if (departmentId) sp.set('departmentId', departmentId);
    if (projectTypeId) sp.set('projectTypeId', projectTypeId);
    if (ownerId) sp.set('ownerId', ownerId);
    if (priority) sp.set('priority', priority);
    if (status) sp.set('status', status);
    if (healthStatus) sp.set('healthStatus', healthStatus);
    if (sort !== 'updatedAt') sp.set('sort', sort);
    if (order !== 'desc') sp.set('order', order);
    if (page !== 1) sp.set('page', String(page));
    const qs = sp.toString();
    router.replace(qs ? `/projects?${qs}` : '/projects');
  }, [view, q, departmentId, projectTypeId, ownerId, priority, status, healthStatus, sort, order, page, router]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const sp = new URLSearchParams();
    sp.set('view', view);
    sp.set('sort', sort);
    sp.set('order', order);
    sp.set('page', String(page));
    sp.set('pageSize', String(pageSize));
    if (q) sp.set('q', q);
    if (departmentId) sp.set('departmentId', departmentId);
    if (projectTypeId) sp.set('projectTypeId', projectTypeId);
    if (ownerId) sp.set('ownerId', ownerId);
    if (priority) sp.set('priority', priority);
    if (status) sp.set('status', status);
    if (healthStatus) sp.set('healthStatus', healthStatus);

    apiFetch<{ items: Item[]; meta: { total: number; totalPages: number } }>(`/api/projects?${sp.toString()}`)
      .then((res) => {
        if (cancelled) return;
        setData({ items: res.items, total: res.meta.total, totalPages: res.meta.totalPages });
      })
      .catch(() => {
        if (cancelled) return;
        setData({ items: [], total: 0, totalPages: 1 });
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [view, q, departmentId, projectTypeId, ownerId, priority, status, healthStatus, sort, order, page, pageSize]);

  function reset() {
    setQ('');
    setDepartmentId('');
    setProjectTypeId('');
    setOwnerId('');
    setPriority('');
    setStatus('');
    setHealthStatus('');
    setSort('updatedAt');
    setOrder('desc');
    setPage(1);
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[1.4px] text-slate-400">Projects</div>
          <h1 className="mt-0.5 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">项目列表</h1>
          <p className="mt-1 hidden text-sm text-slate-500 sm:block">集中检索、跟踪和维护全部项目</p>
        </div>
        <Link href="/projects/new" className="btn-primary inline-flex h-11 shrink-0 items-center gap-1.5 px-3.5 text-sm sm:px-4">
          <Plus size={15} /> 新建项目
        </Link>
      </div>

      {/* 视图切换 */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-line text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {(['active', 'archive', 'all'] as const).map((v) => (
          <button
            key={v}
            onClick={() => {
              setView(v);
              setPage(1);
            }}
            className={
              'min-h-11 whitespace-nowrap px-3 py-2 border-b-2 -mb-px ' +
              (view === v
                ? 'border-slate-900 text-fg font-medium'
                : 'border-transparent text-muted hover:text-fg')
            }
          >
            {v === 'active' ? '项目' : v === 'archive' ? '已归档' : '全部'}
          </button>
        ))}
      </div>

      {/* 过滤器 */}
      <div className="md:hidden">
        <Button
          variant="secondary"
          className="w-full justify-between"
          onClick={() => setMobileFiltersOpen((open) => !open)}
        >
          <span className="flex items-center gap-2">
            <Filter size={16} /> 筛选条件
            {activeFilterCount > 0 && <Badge tone="blue">{activeFilterCount}</Badge>}
          </span>
          {mobileFiltersOpen ? <X size={16} /> : <ChevronRight size={16} />}
        </Button>
      </div>
      <Card className={mobileFiltersOpen ? 'block' : 'hidden md:block'}>
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-8">
          <div className="lg:col-span-2 relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <Input
              placeholder="搜索项目名 / 编号 / 系统名…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              className="pl-8"
            />
          </div>
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">全部状态</option>
            {(['DRAFT', 'PLANNED', 'IN_PROGRESS', 'WAITING_ACCEPTANCE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED', 'CANCELLED', 'MERGED'] as const).map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </Select>
          <Select value={departmentId} onChange={(e) => { setDepartmentId(e.target.value); setPage(1); }}>
            <option value="">全部部门</option>
            <optgroup label="业务部门">
              {departments.filter((d) => (d as { category?: string }).category !== 'FUNCTION').map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </optgroup>
            <optgroup label="职能部门">
              {departments.filter((d) => (d as { category?: string }).category === 'FUNCTION').map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </optgroup>
          </Select>
          <Select value={projectTypeId} onChange={(e) => { setProjectTypeId(e.target.value); setPage(1); }}>
            <option value="">全部类型</option>
            {projectTypes.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
          <Select value={ownerId} onChange={(e) => { setOwnerId(e.target.value); setPage(1); }}>
            <option value="">全部负责人</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.displayName}</option>)}
          </Select>
          <Select value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }}>
            <option value="">全部优先级</option>
            <option value="P0">P0</option>
            <option value="P1">P1</option>
            <option value="P2">P2</option>
            <option value="P3">P3</option>
          </Select>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
            <Select value={healthStatus} onChange={(e) => { setHealthStatus(e.target.value); setPage(1); }}>
              <option value="">全部健康</option>
              <option value="NORMAL">正常</option>
              <option value="AT_RISK">有风险</option>
              <option value="DELAYED">延期</option>
              <option value="ON_HOLD">暂停</option>
            </Select>
            <Button variant="ghost" size="sm" onClick={reset} className="shrink-0">
              <RotateCcw size={14} /> 重置
            </Button>
          </div>
        </div>
      </Card>

      {/* 排序 + 计数 */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <span className="font-medium">{loading ? '正在加载…' : `共 ${data?.total ?? 0} 个项目`}</span>
        <div className="flex items-center gap-1.5">
          <span className="hidden sm:inline">排序：</span>
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value as never)}
            className="h-9 w-auto min-w-[112px] text-xs"
          >
            <option value="updatedAt">最近更新</option>
            <option value="lastUpdateAt">最近进度更新</option>
            <option value="dueDate">预计完成</option>
            <option value="createdAt">创建时间</option>
            <option value="priority">优先级</option>
            <option value="projectCode">编号</option>
            <option value="port">部署端口</option>
          </Select>
          <Button variant="ghost" size="sm" className="w-11 px-0" aria-label="切换排序方向" onClick={() => setOrder(order === 'asc' ? 'desc' : 'asc')}>
            {order === 'asc' ? '↑' : '↓'}
          </Button>
        </div>
      </div>

      {/* 表格 */}
      {!data ? (
        <div className="text-sm text-muted">加载中…</div>
      ) : data.items.length === 0 ? (
        <Card>
          <EmptyState
            title="暂无项目"
            description="调整过滤条件或创建新项目"
            action={
              <Link href="/projects/new" className="btn-primary h-9 px-4 inline-flex items-center gap-1.5 text-sm">
                <Plus size={15} /> 新建项目
              </Link>
            }
          />
        </Card>
      ) : (
        <>
        <div className="space-y-3 md:hidden">
          {data.items.map((r) => (
            <Link
              key={r.id}
              href={`/projects/${r.id}`}
              className="block rounded-xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.035)] transition active:scale-[.995]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[11px] font-semibold text-slate-400">{r.projectCode}</span>
                    <PriorityBadge priority={r.priority} />
                  </div>
                  <h2 className="mt-1.5 line-clamp-2 text-[15px] font-bold leading-5 text-slate-900">{r.name}</h2>
                </div>
                <ChevronRight size={18} className="mt-1 shrink-0 text-slate-300" />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <StatusBadge status={r.status as never} />
                {r.derived.isOverdue && <Badge tone="red">逾期 {r.derived.overdueDays}天</Badge>}
                {r.derived.isDueSoon && <Badge tone="amber">7天内到期</Badge>}
                {r.derived.isStale && <Badge tone="amber">长期未更新</Badge>}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                <div>
                  <div className="text-slate-400">部门 / 类型</div>
                  <div className="mt-0.5 truncate font-medium text-slate-700">
                    {r.department?.name ?? '—'} · {r.projectType?.name ?? '—'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">负责人</div>
                  <div className="mt-0.5 truncate font-medium text-slate-700">{r.owner?.displayName ?? '—'}</div>
                </div>
                <div>
                  <div className="text-slate-400">星级</div>
                  <div className="mt-1"><StarRating value={r.rating} /></div>
                </div>
                <div>
                  <div className="text-slate-400">预计完成</div>
                  <div className="mt-0.5 font-medium tabular-nums text-slate-700">{r.dueDate ?? '—'}</div>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-slate-400">项目进度</span>
                  <span className="font-bold tabular-nums text-[#1a365d]">{r.progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#1a365d] to-blue-500" style={{ width: `${r.progress}%` }} />
                </div>
              </div>
            </Link>
          ))}
        </div>

        <Table className="hidden md:block">
          <thead>
            <tr>
              <Th>编号 / 名称</Th>
              <Th>部门</Th>
              <Th>类型</Th>
              <Th>负责人</Th>
              <Th>状态</Th>
              <Th>优先级</Th>
              <Th align="center" className="w-[110px]">星级</Th>
              <Th align="right">进度</Th>
              <Th align="right">预计完成</Th>
              <Th align="right">最近更新</Th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/50">
                <Td>
                  <Link href={`/projects/${r.id}`} className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted font-mono">{r.projectCode}</span>
                      {r.derived.isOverdue && <Badge tone="red">逾期 {r.derived.overdueDays}天</Badge>}
                      {r.derived.isDueSoon && <Badge tone="amber">7天内到期</Badge>}
                      {r.derived.isStale && <Badge tone="amber">长期未更新</Badge>}
                    </div>
                    <span className="text-sm text-fg hover:underline">{r.name}</span>
                  </Link>
                </Td>
                <Td>{r.department?.name ?? '—'}</Td>
                <Td className="text-slate-600">{r.projectType?.name ?? '—'}</Td>
                <Td>{r.owner?.displayName ?? '—'}</Td>
                <Td><StatusBadge status={r.status as never} /></Td>
                <Td><PriorityBadge priority={r.priority} /></Td>
                <Td align="center"><StarRating value={r.rating} /></Td>
                <Td align="right">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-xs tabular-nums text-muted w-6">{r.progress}%</span>
                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#1a365d] to-blue-500" style={{ width: `${r.progress}%` }} />
                    </div>
                  </div>
                </Td>
                <Td align="right" className="text-xs text-slate-600">{r.dueDate ?? '—'}</Td>
                <Td align="right" className="text-xs text-slate-500">{r.lastUpdateAt?.slice(5, 10) ?? '—'}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
        </>
      )}

      {/* 分页 */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>上一页</Button>
          <span className="text-sm text-muted">{page} / {data.totalPages}</span>
          <Button variant="ghost" size="sm" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>下一页</Button>
        </div>
      )}
    </div>
  );
}
