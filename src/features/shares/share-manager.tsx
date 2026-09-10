'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  ClipboardCopy,
  Copy,
  ExternalLink,
  Link2,
  Plus,
  ShieldOff,
  Trash2,
} from 'lucide-react';
import { Badge, Card, CardBody, CardHeader, EmptyState } from '@/components/ui/primitives';
import { Table, Th, Td } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, FieldHelp } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { StatusBadge, STATUS_LABEL, type Status } from '@/components/status-badge';
import { useToast, apiFetch } from '@/components/form-helpers';

type ShareItem = {
  id: string;
  name: string | null;
  tokenPrefix: string;
  projectCount: number;
  expiresAt: string | null;
  revokedAt: string | null;
  accessCount: number;
  createdAt: string;
  shareUrl: string;
};

type ProjectOption = {
  id: string;
  projectCode: string;
  name: string;
  status: Status;
  priority: string;
  department: { name: string } | null;
};

const EXPIRY_OPTIONS = [
  { value: '7', label: '7 天' },
  { value: '30', label: '30 天' },
  { value: '90', label: '90 天' },
  { value: '365', label: '365 天' },
  { value: '', label: '永久有效' },
];

function expiredAt(share: ShareItem): boolean {
  if (share.revokedAt) return false;
  return share.expiresAt ? new Date(share.expiresAt).getTime() < Date.now() : false;
}

export function ShareManager({ preselect }: { preselect: string | null }) {
  const { toast, show } = useToast();

  const [shares, setShares] = React.useState<ShareItem[] | null>(null);
  const [projects, setProjects] = React.useState<ProjectOption[]>([]);
  const [open, setOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);

  // 新建表单状态
  const [name, setName] = React.useState('');
  const [expiresInDays, setExpiresInDays] = React.useState('30');
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [keyword, setKeyword] = React.useState('');
  const [createdUrl, setCreatedUrl] = React.useState<string | null>(null);
  const [createdCount, setCreatedCount] = React.useState(0);

  async function loadShares() {
    try {
      const data = await apiFetch<{ items: ShareItem[] }>('/api/shares');
      setShares(data.items);
    } catch (e) {
      show('error', (e as Error).message);
      setShares([]);
    }
  }

  async function loadProjects() {
    try {
      // pageSize 上限 100（listProjectsSchema max=100），传 200 会 400 → 项目永远为空
      const data = await apiFetch<{ items: ProjectOption[] }>('/api/projects?view=all&pageSize=100');
      setProjects(data.items);
    } catch (e) {
      show('error', `项目加载失败：${(e as Error).message}`);
    }
  }

  React.useEffect(() => {
    loadShares();
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // preselect: 从其它页面带过来的预选项目
  React.useEffect(() => {
    if (preselect && projects.length > 0) {
      if (projects.some((p) => p.id === preselect)) {
        setCreatedUrl(null);
        setCreatedCount(0);
        setSelected((prev) => new Set(prev).add(preselect));
        setOpen(true);
      }
    }
  }, [preselect, projects]);

  async function createShare() {
    if (selected.size === 0) {
      show('error', '请至少选择一个项目');
      return;
    }
    setCreating(true);
    try {
      const body: Record<string, unknown> = {
        projectIds: Array.from(selected),
      };
      if (name.trim()) body.name = name.trim();
      if (expiresInDays) body.expiresInDays = Number(expiresInDays);
      else body.expiresInDays = null;

      const created = await apiFetch<{ shareUrl: string; name: string; projectCount: number }>(
        '/api/shares',
        { method: 'POST', body: JSON.stringify(body) },
      );
      setCreatedUrl(created.shareUrl);
      setCreatedCount(created.projectCount);
      setName('');
      setSelected(new Set());
      show('success', `已生成分享链接（${created.projectCount} 个项目）`);
      loadShares();
    } catch (e) {
      show('error', (e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string) {
    if (!window.confirm('撤销后该链接立即失效，确认撤销？')) return;
    try {
      await apiFetch(`/api/shares/${id}`, { method: 'DELETE' });
      show('success', '链接已撤销');
      loadShares();
    } catch (e) {
      show('error', (e as Error).message);
    }
  }

  function toggleProject(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function copy(text: string) {
    navigator.clipboard?.writeText(window.location.origin + text).then(
      () => show('success', '链接已复制到剪贴板'),
      () => show('error', '复制失败，请手动复制'),
    );
  }

  const filtered =
    keyword.trim() === ''
      ? projects
      : projects.filter(
          (p) =>
            p.name.toLowerCase().includes(keyword.toLowerCase()) ||
            p.projectCode.toLowerCase().includes(keyword.toLowerCase()),
        );

  const archivedCount = projects.filter((p) => p.status === 'ARCHIVED').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted">Share Links</div>
          <h1 className="text-xl font-semibold text-fg">分享链接</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            勾选多个项目打包成一个链接，发给内网任何人。对方<strong>无需登录</strong>，打开链接即可看到你选择的项目。
            链接中不会包含服务器 / 部署 / 维护说明等内部信息。
          </p>
        </div>
        <Button onClick={() => { setCreatedUrl(null); setOpen(true); }}>
          <Plus size={15} /> 新建分享链接
        </Button>
      </div>

      {toast && (
        <div
          className={`rounded-md px-3 py-2 text-sm ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800'
              : toast.type === 'error'
                ? 'bg-red-50 text-red-700'
                : 'bg-blue-50 text-blue-800'
          }`}
        >
          {toast.message}
        </div>
      )}

      <Card>
        <CardHeader
          title="我创建的分享"
          description={shares ? `${shares.length} 个链接` : '加载中…'}
          actions={
            shares && shares.length > 0 ? (
              <button className="text-xs text-blue-700 hover:underline" onClick={loadShares}>
                刷新
              </button>
            ) : undefined
          }
        />
        <CardBody className="p-0">
          {shares === null ? (
            <div className="px-5 py-10 text-center text-sm text-muted">加载中…</div>
          ) : shares.length === 0 ? (
            <EmptyState
              icon={<Link2 size={26} />}
              title="还没有分享链接"
              description="点击右上角「新建分享链接」，选择要对外展示的项目后生成一个链接。"
              action={
                <Button size="sm" onClick={() => { setCreatedUrl(null); setOpen(true); }}>
                  <Plus size={14} /> 新建分享链接
                </Button>
              }
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>名称</Th>
                  <Th align="center">项目数</Th>
                  <Th align="center">访问</Th>
                  <Th>创建时间</Th>
                  <Th>有效期至</Th>
                  <Th align="center">状态</Th>
                  <Th align="right">操作</Th>
                </tr>
              </thead>
              <tbody>
                {shares.map((s) => {
                  const isExpired = expiredAt(s);
                  const active = !s.revokedAt && !isExpired;
                  return (
                    <tr key={s.id}>
                      <Td>
                        <div className="flex items-center gap-2">
                          <Link2 size={14} className="shrink-0 text-slate-400" />
                          <div>
                            <div className="font-medium text-slate-900">{s.name ?? '未命名分享'}</div>
                            <code className="text-[11px] text-slate-400">{s.tokenPrefix}</code>
                          </div>
                        </div>
                      </Td>
                      <Td align="center">
                        <button
                          className="text-blue-700 text-sm hover:underline"
                          onClick={() => window.open(window.location.origin + s.shareUrl, '_blank')}
                          title="新窗口预览对方看到的内容"
                        >
                          {s.projectCount}
                        </button>
                      </Td>
                      <Td align="center" className="tabular-nums text-sm">{s.accessCount}</Td>
                      <Td className="text-xs text-slate-500">{s.createdAt.slice(0, 10)}</Td>
                      <Td className="text-xs text-slate-500">
                        {s.expiresAt ? s.expiresAt.slice(0, 10) : '永久'}
                      </Td>
                      <Td align="center">
                        {active ? (
                          <Badge tone="green" dot>有效</Badge>
                        ) : s.revokedAt ? (
                          <Badge tone="red" dot>已撤销</Badge>
                        ) : (
                          <Badge tone="amber" dot>已过期</Badge>
                        )}
                      </Td>
                      <Td align="right">
                        <div className="flex items-center justify-end gap-1">
                          {active && (
                            <>
                              <button
                                title="打开"
                                className="p-1.5 text-slate-500 hover:text-slate-900"
                                onClick={() => window.open(window.location.origin + s.shareUrl, '_blank')}
                              >
                                <ExternalLink size={15} />
                              </button>
                              <button
                                title="复制链接"
                                className="p-1.5 text-slate-500 hover:text-slate-900"
                                onClick={() => copy(s.shareUrl)}
                              >
                                <Copy size={15} />
                              </button>
                              <button
                                title="撤销"
                                className="p-1.5 text-slate-500 hover:text-red-600"
                                onClick={() => revoke(s.id)}
                              >
                                <ShieldOff size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* ── 新建分享 Modal ── */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="新建分享链接"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>取消</Button>
            <Button loading={creating} onClick={createShare} disabled={selected.size === 0}>
              生成分享链接 {selected.size > 0 && `(${selected.size})`}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {createdUrl ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-800">
                <CheckCircle2 size={16} /> 链接已生成
              </div>
              <p className="mt-1 text-xs text-emerald-700">
                把下面链接发给对方，对方无需登录，打开即可查看这 {createdCount} 个项目。
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                <code className="flex-1 truncate rounded bg-white px-2 py-1.5 text-xs ring-1 ring-emerald-200">
                  {window.location.origin + createdUrl}
                </code>
                <Button
                  size="sm"
                  onClick={() =>
                    navigator.clipboard?.writeText(window.location.origin + createdUrl).then(
                      () => show('success', '已复制'),
                      () => show('error', '复制失败'),
                    )
                  }
                >
                  <ClipboardCopy size={13} /> 复制
                </Button>
              </div>
              <button
                className="mt-3 text-xs text-blue-700 hover:underline"
                onClick={() => {
                  setCreatedUrl(null);
                  setCreatedCount(0);
                  setSelected(new Set());
                  setName('');
                }}
              >
                再创建一个
              </button>
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>分享名称（可选）</Label>
                  <Input
                    placeholder="例如：本月项目进度汇报"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={100}
                  />
                  <FieldHelp>不填则自动命名为「XX 分享的项目（N 个）」</FieldHelp>
                </div>
                <div>
                  <Label>有效期</Label>
                  <Select value={expiresInDays} onChange={(e) => setExpiresInDays(e.target.value)}>
                    {EXPIRY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </Select>
                </div>
              </div>

              <div>
                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <Label>选择要分享的项目（{selected.size} / {projects.length} 个）</Label>
                  <div className="flex gap-3 text-xs">
                    <button className="text-blue-700 hover:underline" onClick={() => setSelected(new Set(projects.filter((p) => !['ARCHIVED', 'CANCELLED', 'MERGED'].includes(p.status)).map((p) => p.id)))}>
                      全选进行中
                    </button>
                    <button
                      className="text-blue-700 hover:underline disabled:cursor-not-allowed disabled:text-slate-300"
                      disabled={archivedCount === 0}
                      onClick={() => setSelected(new Set(projects.filter((p) => p.status === 'ARCHIVED').map((p) => p.id)))}
                    >
                      全选已归档
                    </button>
                    <button className="text-slate-500 hover:underline" onClick={() => setSelected(new Set())}>
                      清空
                    </button>
                  </div>
                </div>
                <Input
                  placeholder="搜索项目名称 / 编号…"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="mb-2"
                />
                <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-2">
                  {filtered.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted">没有可分享的项目</div>
                  ) : (
                    filtered.map((p) => {
                      const checked = selected.has(p.id);
                      return (
                        <label
                          key={p.id}
                          className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors sm:gap-3 ${
                            checked ? 'bg-blue-50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded accent-slate-900"
                            checked={checked}
                            onChange={() => toggleProject(p.id)}
                          />
                          <span className="font-mono text-xs text-slate-400">{p.projectCode}</span>
                          <span className="flex-1 truncate text-slate-900">{p.name}</span>
                          {p.department && <span className="hidden text-xs text-slate-400 sm:inline">{p.department.name}</span>}
                          <StatusBadge status={p.status} />
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
