'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  ArrowRightLeft,
  Calendar,
  ChevronRight,
  CircleDot,
  ClipboardCheck,
  Download,
  ExternalLink,
  Eye,
  FileText,
  GitBranch,
  GitMerge,
  History,
  Image as ImageIcon,
  Pencil,
  Plus,
  CheckCircle2,
  ShieldOff,
  Share2,
  Terminal,
  Trash2,
  Users,
  Server,
} from 'lucide-react';
import { Badge, Card, CardBody, CardHeader, EmptyState } from '@/components/ui/primitives';
import { Table, Th, Td } from '@/components/ui/table';
import { Tabs, TabPanel } from '@/components/ui/tabs';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea, Select, FieldHelp } from '@/components/ui/field';
import { HealthBadge, PriorityBadge, STATUS_LABEL, StatusBadge } from '@/components/status-badge';
import { StarRating } from '@/components/star-rating';
import { apiFetch } from '@/components/form-helpers';
import { ProjectEditor } from './project-editor';
import { advanceStatus, todayTaipei, type PStatus } from './status-flow';

type Department = { id: string; name: string };
type ProjectType = { id: string; name: string };
type UserLite = { id: string; displayName: string };

type Deployment = {
  id: string;
  environment: string;
  serverName: string | null;
  serverIp: string | null;
  hostname: string | null;
  port: number | null;
  protocol: string | null;
  deploymentPath: string | null;
  serviceName: string | null;
  runtime: string | null;
  database: string | null;
  version: string | null;
  status: string;
  notes: string | null;
  lastVerifiedAt: string | null;
};

const ENV_LABEL: Record<string, string> = {
  DEVELOPMENT: 'Dev',
  TESTING: 'Test',
  STAGING: 'Stage',
  PRODUCTION: 'Prod',
};

const DEPLOY_STATUS_LABEL: Record<string, string> = {
  ACTIVE: '运行中',
  MAINTENANCE: '维护中',
  DEPRECATED: '已弃用',
  OFFLINE: '已下线',
  UNKNOWN: '未知',
};

export function Field({ label, required, children }: { label: React.ReactNode; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="block">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </Label>
      {children}
    </div>
  );
}

export function ProjectDetailView({
  me,
  isPrivileged,
  project,
  departments,
  projectTypes,
  users,
}: {
  me: { id: string; role: string; displayName: string };
  isPrivileged: boolean;
  project: any;
  departments: Department[];
  projectTypes: ProjectType[];
  users: UserLite[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<'overview' | 'updates' | 'deployment' | 'documents' | 'archive' | 'lineage' | 'history'>('overview');

  const [updates, setUpdates] = useState<any[] | null>(null);
  const [deployments, setDeployments] = useState<Deployment[] | null>(null);
  const [documents, setDocuments] = useState<any[] | null>(null);
  const [archiveState, setArchiveState] = useState<any | null>(null);
  const [lineage, setLineage] = useState<any | null>(null);
  const [history, setHistory] = useState<any[] | null>(null);
  const [timeline, setTimeline] = useState<any[] | null>(null);
  const [completing, setCompleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function loadAll() {
    const tasks: Promise<void>[] = [];
    tasks.push(apiFetch<{ items: any[] }>(`/api/projects/${project.id}/updates`).then((r) => setUpdates(r.items)).catch(() => setUpdates([])));
    if (isPrivileged) {
      tasks.push(apiFetch<{ items: Deployment[] }>(`/api/projects/${project.id}/deployments`).then((r) => setDeployments(r.items)).catch(() => setDeployments([])));
    } else {
      setDeployments(null);
    }
    tasks.push(apiFetch<{ items: any[] }>(`/api/projects/${project.id}/documents`).then((r) => setDocuments(r.items)).catch(() => setDocuments([])));
    tasks.push(apiFetch<any>(`/api/projects/${project.id}/archive`).then(setArchiveState).catch(() => setArchiveState(null)));
    tasks.push(apiFetch<any>(`/api/projects/${project.id}/lineage`).then(setLineage).catch(() => setLineage(null)));
    tasks.push(apiFetch<{ items: any[] }>(`/api/projects/${project.id}/timeline`).then((r) => setTimeline(r.items)).catch(() => setTimeline([])));
    if (isPrivileged) {
      tasks.push(apiFetch<{ items: any[] }>(`/api/projects/${project.id}/history`).then((r) => setHistory(r.items)).catch(() => setHistory([])));
    }
    await Promise.all(tasks);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  /** 一键标记已完成：按状态机自动逐级流转到 COMPLETED，进度 100%、完成日期默认今天 */
  async function markComplete() {
    setCompleting(true);
    setActionError(null);
    try {
      const existingDate =
        project.actualCompletedDate && project.actualCompletedDate !== '—'
          ? project.actualCompletedDate
          : todayTaipei();
      await advanceStatus(project.id, project.status as PStatus, 'COMPLETED', {
        progress: 100,
        actualCompletedDate: existingDate,
      });
      router.refresh();
      loadAll();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : '标记失败，请刷新后重试');
    } finally {
      setCompleting(false);
    }
  }

  /** 星级评分（仅 ADMIN/MASTER 可评） */
  async function handleRate(v: number) {
    setActionError(null);
    try {
      await apiFetch(`/api/projects/${project.id}/rating`, {
        method: 'PUT',
        body: JSON.stringify({ rating: v }),
      });
      router.refresh();
      loadAll();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : '评分失败，请刷新后重试');
    }
  }

  const derived = project.derived ?? {};
  const perm = project.permissions ?? {};

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* 顶部摘要 */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap text-xs text-muted [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span className="font-mono">{project.projectCode}</span>
            <ChevronRight size={12} />
            <span>{project.department?.name}</span>
            <ChevronRight size={12} />
            <span>{project.projectType?.name}</span>
          </div>
          <h1 className="mt-1 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">{project.name}</h1>
          {project.systemName && <div className="text-sm text-muted">系统名：{project.systemName}</div>}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={project.status} />
            <HealthBadge health={project.healthStatus} />
            <PriorityBadge priority={project.priority} />
            {derived.isOverdue && <Badge tone="red" dot>逾期 {derived.overdueDays} 天</Badge>}
            {derived.isDueSoon && <Badge tone="amber" dot>{derived.daysUntilDue} 天内到期</Badge>}
            {derived.isStale && <Badge tone="amber" dot>长期未更新</Badge>}
            {project.status === 'ARCHIVED' && (project.archiveCompleteness ?? 0) < 60 && (
              <Badge tone="amber">⚠ 档案未完成 {project.archiveCompleteness}%</Badge>
            )}
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">星级</span>
            <StarRating
              value={project.rating ?? 0}
              size={18}
              onRate={isPrivileged ? handleRate : undefined}
              title={
                isPrivileged
                  ? '点击设置星级（1-5 星，再点一次取消）'
                  : (project.rating ?? 0) > 0
                    ? `${project.rating} 星`
                    : '未评分'
              }
            />
            {(project.rating ?? 0) > 0 && (
              <span className="text-xs text-slate-400 tabular-nums">({project.rating}/5)</span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 max-sm:[&>button]:flex-1">
          {isPrivileged &&
            perm.canEdit &&
            project.status !== 'COMPLETED' &&
            !['ARCHIVED', 'CANCELLED', 'MERGED'].includes(project.status) && (
              <Button
                variant="primary"
                onClick={markComplete}
                loading={completing}
                title="按状态机自动流转到「已完成」，进度设为 100%"
                className="!bg-green-600 hover:!bg-green-700"
              >
                <CheckCircle2 size={14} /> 标记已完成
              </Button>
            )}
          {perm.canEdit && (
            <EditProjectButton
              departments={departments}
              projectTypes={projectTypes}
              users={users}
              me={me}
              initialValue={project}
              onSaved={() => router.refresh()}
            />
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push(`/shares?preselect=${project.id}`)}
            title="把项目加入分享链接，发给无需登录的人查看"
          >
            <Share2 size={14} /> 分享
          </Button>
          {!perm.canEdit && project.owner?.displayName && (
            <span className="text-sm text-muted">负责人 · {project.owner.displayName}</span>
          )}
        </div>
      </div>

      {actionError && (
        <div className="rounded-md bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm">{actionError}</div>
      )}

      {/* 关键统计 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <QuickStat label="进度" value={`${project.progress}%`} />
        <QuickStat label="状态" value={<StatusBadge status={project.status} />} />
        <QuickStat label="开始" value={project.startDate ?? '—'} />
        <QuickStat label="预计完成" value={project.dueDate ?? '—'} highlight={derived.isOverdue} />
        <QuickStat
          label="实际完成"
          value={
            project.status === 'COMPLETED' || project.status === 'ARCHIVED'
              ? (project.actualCompletedDate ?? project.acceptanceDate ?? '—')
              : '—'
          }
        />
      </div>

      <Tabs
        defaultKey="overview"
        items={[
          { key: 'overview', label: '概览' },
          { key: 'updates', label: '进度更新', badge: updates ? <Badge tone="neutral">{updates.length}</Badge> : null },
          { key: 'deployment', label: '部署', badge: isPrivileged && deployments ? <Badge tone="neutral">{deployments.length}</Badge> : null },
          { key: 'documents', label: '文档', badge: documents ? <Badge tone="neutral">{documents.length}</Badge> : null },
          { key: 'archive', label: '归档清单' },
          { key: 'lineage', label: '谱系' },
          ...(isPrivileged ? [{ key: 'history' as const, label: '历史' }] : []),
        ]}
      >
        <TabPanel forKey="overview">
          <OverviewPanel project={project} timeline={timeline} updates={updates} />
        </TabPanel>

        <TabPanel forKey="updates">
          <UpdatesPanel
            projectId={project.id}
            canWrite={perm.canEdit || project.permissions?.canEdit !== false}
            items={updates}
            onChanged={loadAll}
          />
        </TabPanel>

        <TabPanel forKey="deployment">
          {isPrivileged ? (
            <DeploymentPanel projectId={project.id} items={deployments} onChanged={loadAll} />
          ) : (
            <div className="p-6 text-sm text-muted">无权查看部署信息</div>
          )}
        </TabPanel>

        <TabPanel forKey="documents">
          <DocumentsPanel projectId={project.id} canEdit={perm.canEdit} items={documents} onChanged={loadAll} />
        </TabPanel>

        <TabPanel forKey="archive">
          <ArchivePanel
            projectId={project.id}
            isPrivileged={isPrivileged}
            project={project}
            state={archiveState}
            users={users}
            onChanged={loadAll}
          />
        </TabPanel>

        <TabPanel forKey="lineage">
          <LineagePanel
            projectId={project.id}
            currentDepartmentId={project.department?.id}
            currentProjectTypeId={project.projectType?.id}
            isPrivileged={isPrivileged}
            data={lineage}
            departments={departments}
            projectTypes={projectTypes}
            users={users}
            me={me}
            onChanged={() => { router.refresh(); loadAll(); }}
          />
        </TabPanel>

        {isPrivileged && (
          <TabPanel forKey="history">
            <HistoryPanel items={history} />
          </TabPanel>
        )}
      </Tabs>
    </div>
  );
}

function QuickStat({ label, value, highlight, muted }: { label: string; value: React.ReactNode; highlight?: boolean; muted?: boolean }) {
  return (
    <div className={['rounded-xl border p-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)]', highlight ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'].join(' ')}>
      <div className="text-[11px] uppercase tracking-wider text-muted">{label}</div>
      <div className={['mt-1 text-[15px] font-bold tabular-nums sm:text-base', muted ? 'text-slate-400' : 'text-fg'].join(' ')}>{value}</div>
    </div>
  );
}

function EditProjectButton({
  departments,
  projectTypes,
  users,
  me,
  initialValue,
  onSaved,
}: any) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Pencil size={14} /> 编辑基本信息
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="编辑项目" size="full">
        <ProjectEditor
          mode="edit"
          initialValue={initialValue}
          me={me}
          departments={departments}
          projectTypes={projectTypes}
          users={users}
        />
      </Modal>
    </>
  );
}

// ──────────────────────────── 概览 ────────────────────────────

function OverviewPanel({ project, timeline, updates }: { project: any; timeline: any[] | null; updates: any[] | null }) {
  return (
    <div className="grid gap-6 lg:grid-cols-3 mt-4">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader title="项目需求" />
          <CardBody>
            {project.requirement ? (
              <pre className="whitespace-pre-wrap text-sm text-fg font-sans">{project.requirement}</pre>
            ) : (
              <div className="text-sm text-muted">未填写</div>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="项目目标" />
          <CardBody>
            {project.objective ? <div className="text-sm text-fg whitespace-pre-wrap">{project.objective}</div> : <div className="text-sm text-muted">未填写</div>}
          </CardBody>
        </Card>
        {Array.isArray(project.acceptanceCriteria) && project.acceptanceCriteria.length > 0 && (
          <Card>
            <CardHeader title="验收标准" />
            <CardBody className="space-y-1">
              {project.acceptanceCriteria.map((c: any, i: number) => (
                <label key={i} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!c.done} readOnly />
                  <span className={c.done ? 'text-slate-400 line-through' : 'text-fg'}>{c.text}</span>
                </label>
              ))}
            </CardBody>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader title="项目信息" />
          <CardBody className="space-y-2 text-sm">
            <Row label="负责人" value={project.owner?.displayName ?? '—'} />
            <Row label="创建人" value={project.creator?.displayName ?? '—'} />
            <Row label="开发人" value={project.developer?.displayName ?? '—'} />
            <Row label="当前维护人" value={project.maintainer?.displayName ?? '—'} />
            <Row label="验收人" value={project.acceptedBy?.displayName ?? '—'} />
            <Row label="创建时间" value={project.createdAt?.slice(0, 10) ?? '—'} />
            <Row label="最后更新" value={project.lastUpdateAt?.slice(0, 10) ?? '—'} />
          </CardBody>
        </Card>

        {project.parentProjectId && (
          <Card>
            <CardHeader title="父项目" />
            <CardBody>
              <Link href={`/projects/${project.parentProjectId}`} className="text-sm text-blue-700 hover:underline">
                前往父项目 →
              </Link>
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader title="时间线" description={`${timeline?.length ?? 0} 项`} />
          <CardBody>
            {timeline && timeline.length > 0 ? (
              <ol className="space-y-3 text-sm">
                {timeline.slice(0, 10).map((t) => (
                  <li key={t.id} className="flex gap-3">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-300 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium text-fg">{t.title}</div>
                      {t.description && <div className="text-xs text-muted line-clamp-2">{t.description}</div>}
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {t.occurredAt?.slice(0, 16).replace('T', ' ')}{t.actor ? ` · ${t.actor}` : ''}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="text-sm text-muted">暂无时间线</div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted">{label}</span>
      <span className="text-fg">{value}</span>
    </div>
  );
}

// ──────────────────────────── Updates ────────────────────────────

function UpdatesPanel({
  projectId,
  canWrite,
  items,
  onChanged,
}: {
  projectId: string;
  canWrite: boolean;
  items: any[] | null;
  onChanged: () => void;
}) {
  const [content, setContent] = useState('');
  const [progress, setProgress] = useState<number | ''>('');
  const [issues, setIssues] = useState('');
  const [next, setNext] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!content.trim()) {
      setError('更新内容必填');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/projects/${projectId}/updates`, {
        method: 'POST',
        body: JSON.stringify({
          content,
          progress: progress === '' ? null : Number(progress),
          currentIssues: issues || null,
          nextSteps: next || null,
        }),
      });
      setContent('');
      setProgress('');
      setIssues('');
      setNext('');
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : '提交失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 mt-4">
      <Card>
        <CardHeader title="新增进度更新" description="更新内容永久保留，必要时可在历史中追溯。" />
        <CardBody className="space-y-3">
          {error && <div className="rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}
          <div>
            <Label className="block mb-1">更新内容 *</Label>
            <Textarea rows={4} value={content} onChange={(e) => setContent(e.target.value)} placeholder="完成 xxx。下一步 xxx…" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label className="block mb-1">进度（%）</Label>
              <Input type="number" min={0} max={100} value={progress} onChange={(e) => setProgress(e.target.value as never)} placeholder="0-100" />
            </div>
            <div className="lg:col-span-1">
              <Label className="block mb-1">当前问题</Label>
              <Input value={issues} onChange={(e) => setIssues(e.target.value)} />
            </div>
            <div className="lg:col-span-2">
              <Label className="block mb-1">下一步</Label>
              <Input value={next} onChange={(e) => setNext(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end max-sm:[&>button]:w-full">
            <Button onClick={submit} loading={saving} disabled={!canWrite && false}>
              提交更新
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="历史更新" description={`${items?.length ?? 0} 条`} />
        <CardBody>
          {items == null ? (
            <div className="text-sm text-muted">加载中…</div>
          ) : items.length === 0 ? (
            <EmptyState title="暂无更新" description="提交第一条更新以记录开发进度。" />
          ) : (
            <ol className="space-y-4">
              {items.map((u) => (
                <li key={u.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-2 text-xs text-muted">
                    <span>{u.createdBy?.displayName ?? '系统'} · {u.createdAt?.slice(0, 16).replace('T', ' ')}</span>
                    {u.progress != null && <Badge tone="blue">{u.progress}%</Badge>}
                  </div>
                  <div className="mt-2 text-sm whitespace-pre-wrap">{u.content}</div>
                  {(u.currentIssues || u.nextSteps) && (
                    <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                      {u.currentIssues && (
                        <div className="rounded-md bg-amber-50 px-3 py-2 text-amber-800"><b>当前问题：</b>{u.currentIssues}</div>
                      )}
                      {u.nextSteps && (
                        <div className="rounded-md bg-blue-50 px-3 py-2 text-blue-800"><b>下一步：</b>{u.nextSteps}</div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

// ──────────────────────────── Deployment ────────────────────────────

function DeploymentPanel({
  projectId,
  items,
  onChanged,
}: {
  projectId: string;
  items: Deployment[] | null;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    environment: 'DEVELOPMENT',
    serverName: '',
    serverIp: '',
    hostname: '',
    port: '',
    protocol: 'http',
    deploymentPath: '',
    serviceName: '',
    runtime: '',
    database: '',
    version: '',
    status: 'ACTIVE',
    notes: '',
  });

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        port: form.port ? Number(form.port) : null,
        serverName: form.serverName || null,
        serverIp: form.serverIp || null,
        hostname: form.hostname || null,
        deploymentPath: form.deploymentPath || null,
        serviceName: form.serviceName || null,
        runtime: form.runtime || null,
        database: form.database || null,
        version: form.version || null,
        notes: form.notes || null,
      };
      await apiFetch(`/api/projects/${projectId}/deployments`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setOpen(false);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('删除该部署记录？')) return;
    await apiFetch(`/api/deployments/${id}`, { method: 'DELETE' });
    onChanged();
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus size={14} /> 新增部署
        </Button>
      </div>

      {items == null ? (
        <div className="text-sm text-muted">加载中…</div>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState title="尚未登记部署信息" description="点击右上角「新增部署」" />
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {items.map((d) => (
            <Card key={d.id}>
              <CardHeader
                title={
                  <div className="flex items-center gap-2">
                    <Badge tone="slate">{ENV_LABEL[d.environment] ?? d.environment}</Badge>
                    <Badge
                      tone={
                        d.status === 'ACTIVE' ? 'green'
                          : d.status === 'MAINTENANCE' ? 'amber'
                          : d.status === 'OFFLINE' ? 'red'
                          : d.status === 'DEPRECATED' ? 'orange'
                          : 'neutral'
                      }
                    >
                      {DEPLOY_STATUS_LABEL[d.status]}
                    </Badge>
                    {d.version && <span className="text-xs text-muted">v{d.version}</span>}
                  </div>
                }
                actions={
                  <button className="text-muted hover:text-red-600 p-1" onClick={() => remove(d.id)} title="删除">
                    <Trash2 size={14} />
                  </button>
                }
              />
              <CardBody className="space-y-1 text-sm">
                {d.serverName && <Row label="服务器" value={d.serverName} />}
                {d.serverIp && <Row label="IP" value={<span className="font-mono">{d.serverIp}</span>} />}
                {d.hostname && <Row label="Hostname" value={d.hostname} />}
                {d.port != null && <Row label="Port" value={<span className="font-mono">{d.port}</span>} />}
                {d.protocol && <Row label="Protocol" value={d.protocol} />}
                {d.deploymentPath && <Row label="部署路径" value={d.deploymentPath} />}
                {d.serviceName && <Row label="Service" value={d.serviceName} />}
                {d.runtime && <Row label="Runtime" value={d.runtime} />}
                {d.database && <Row label="Database" value={d.database} />}
                {d.notes && <Row label="备注" value={d.notes} />}
                {d.lastVerifiedAt && <Row label="最后验证" value={d.lastVerifiedAt.slice(0, 10)} />}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="新增部署" size="lg" footer={
        <>
          <Button variant="ghost" onClick={() => setOpen(false)}>取消</Button>
          <Button onClick={submit} loading={saving}>保存</Button>
        </>
      }>
        {error && <div className="rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm mb-3">{error}</div>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="环境 *" required>
            <Select value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value })}>
              <option value="DEVELOPMENT">Development</option>
              <option value="TESTING">Testing</option>
              <option value="STAGING">Staging</option>
              <option value="PRODUCTION">Production</option>
            </Select>
          </Field>
          <Field label="状态">
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="ACTIVE">运行中</option>
              <option value="MAINTENANCE">维护中</option>
              <option value="DEPRECATED">已弃用</option>
              <option value="OFFLINE">已下线</option>
              <option value="UNKNOWN">未知</option>
            </Select>
          </Field>
          <Field label="服务器名"><Input value={form.serverName} onChange={(e) => setForm({ ...form, serverName: e.target.value })} /></Field>
          <Field label="IP"><Input value={form.serverIp} onChange={(e) => setForm({ ...form, serverIp: e.target.value })} /></Field>
          <Field label="Hostname"><Input value={form.hostname} onChange={(e) => setForm({ ...form, hostname: e.target.value })} /></Field>
          <Field label="端口"><Input type="number" value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })} /></Field>
          <Field label="Protocol"><Input value={form.protocol} onChange={(e) => setForm({ ...form, protocol: e.target.value })} /></Field>
          <Field label="Service"><Input value={form.serviceName} onChange={(e) => setForm({ ...form, serviceName: e.target.value })} /></Field>
          <Field label="部署路径"><Input value={form.deploymentPath} onChange={(e) => setForm({ ...form, deploymentPath: e.target.value })} /></Field>
          <Field label="Runtime"><Input value={form.runtime} onChange={(e) => setForm({ ...form, runtime: e.target.value })} /></Field>
          <Field label="Database"><Input value={form.database} onChange={(e) => setForm({ ...form, database: e.target.value })} /></Field>
          <Field label="版本"><Input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} /></Field>
        </div>
        <div className="mt-3">
          <Label className="block mb-1">备注</Label>
          <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}

// ──────────────────────────── Documents ────────────────────────────

function DocumentsPanel({
  projectId,
  canEdit,
  items,
  onChanged,
}: {
  projectId: string;
  canEdit: boolean;
  items: any[] | null;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [stage, setStage] = useState<'choose' | 'uploading'>('choose');
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [meta, setMeta] = useState({
    docType: 'REQUIREMENT' as 'REQUIREMENT' | 'DESIGN' | 'DEPLOYMENT' | 'TESTING' | 'ACCEPTANCE' | 'OPERATIONS' | 'OTHER',
    title: '',
    version: '1.0',
    isCurrent: true,
    notes: '',
  });
  const [file, setFile] = useState<File | null>(null);

  async function onUpload() {
    if (!file) { setError('请选择文件'); return; }
    if (!meta.title) { setError('请填写文档标题'); return; }

    setSaving(true);
    setError(null);
    setStage('uploading');
    try {
      // step 1: start
      const start = await apiFetch<{ attachmentId: string; uploadUrl: string }>(`/api/projects/${projectId}/documents`, {
        method: 'POST',
        body: JSON.stringify({
          mode: 'start',
          fileName: file.name,
          size: file.size,
          mimeType: file.type || undefined,
        }),
      });
      // step 2: PUT file
      const buf = await file.arrayBuffer();
      const putRes = await fetch(start.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: buf,
      });
      if (!putRes.ok) throw new Error(`文件上传失败 (${putRes.status})`);
      // step 3: create document
      await apiFetch(`/api/projects/${projectId}/documents`, {
        method: 'POST',
        body: JSON.stringify({
          mode: 'create',
          attachmentId: start.attachmentId,
          docType: meta.docType,
          title: meta.title,
          version: meta.version || null,
          isCurrent: meta.isCurrent,
          notes: meta.notes || null,
        }),
      });
      setOpen(false);
      setFile(null);
      setMeta({ docType: 'REQUIREMENT', title: '', version: '1.0', isCurrent: true, notes: '' });
      setStage('choose');
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : '上传失败');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('删除该文档？')) return;
    await apiFetch(`/api/documents/${id}`, { method: 'DELETE' });
    onChanged();
  }

  return (
    <div className="space-y-4 mt-4">
      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={() => setOpen(true)}>
            <Plus size={14} /> 上传文档
          </Button>
        </div>
      )}

      {items == null ? (
        <div className="text-sm text-muted">加载中…</div>
      ) : items.length === 0 ? (
        <Card><EmptyState title="暂无文档" description="如有需求文档、部署文档、操作说明等，可在此上传。" /></Card>
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>标题</Th>
                <Th>类型</Th>
                <Th>版本</Th>
                <Th>当前</Th>
                <Th>大小</Th>
                <Th>上传时间</Th>
                <Th>操作</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.id}>
                  <Td>
                    <button
                      type="button"
                      onClick={() => setPreviewDoc(d)}
                      className="inline-flex items-center gap-1.5 text-fg hover:text-accent hover:underline"
                      title="在网页内预览"
                    >
                      <Eye size={13} />
                      <span>{d.title}</span>
                    </button>
                    {d.notes && <div className="text-xs text-muted line-clamp-1 mt-0.5">{d.notes}</div>}
                  </Td>
                  <Td><Badge tone="neutral">{d.docType}</Badge></Td>
                  <Td className="font-mono text-xs">{d.version ?? '—'}</Td>
                  <Td>{d.isCurrent ? <Badge tone="green">当前</Badge> : <Badge tone="neutral">历史</Badge>}</Td>
                  <Td className="text-xs text-muted">{Math.ceil((d.attachment?.sizeBytes ?? 0) / 1024)} KB</Td>
                  <Td className="text-xs text-muted">{d.createdAt?.slice(0, 10)}</Td>
                  <Td>
                    {canEdit && (
                      <button className="text-muted hover:text-red-600" onClick={() => remove(d.id)}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      <Modal open={open} onClose={() => { setOpen(false); setStage('choose'); }} title="上传文档" footer={
        <>
          <Button variant="ghost" onClick={() => { setOpen(false); setStage('choose'); }}>取消</Button>
          <Button onClick={onUpload} loading={saving} disabled={!file || !meta.title}>
            {stage === 'uploading' ? '上传中…' : '上传'}
          </Button>
        </>
      }>
        {error && <div className="rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm mb-3">{error}</div>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="文档类型 *" required>
            <Select value={meta.docType} onChange={(e) => setMeta({ ...meta, docType: e.target.value as never })}>
              <option value="REQUIREMENT">需求文档</option>
              <option value="DESIGN">设计 / 开发文档</option>
              <option value="DEPLOYMENT">部署文档</option>
              <option value="TESTING">测试报告</option>
              <option value="ACCEPTANCE">验收资料</option>
              <option value="OPERATIONS">操作说明</option>
              <option value="OTHER">其他</option>
            </Select>
          </Field>
          <Field label="版本">
            <Input value={meta.version} onChange={(e) => setMeta({ ...meta, version: e.target.value })} placeholder="如 1.0" />
          </Field>
          <Field label="标题 *" required>
            <Input value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
          </Field>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={meta.isCurrent} onChange={(e) => setMeta({ ...meta, isCurrent: e.target.checked })} />
              设为当前版本
            </label>
          </div>
          <div className="sm:col-span-2">
            <Label className="block mb-1">备注</Label>
            <Textarea rows={2} value={meta.notes} onChange={(e) => setMeta({ ...meta, notes: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label className="block mb-1">文件 *（最大 50 MB）</Label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-white"
            />
          </div>
        </div>
      </Modal>

      <DocumentPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
    </div>
  );
}

function DocumentPreviewModal({ doc, onClose }: { doc: any | null; onClose: () => void }) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [contentType, setContentType] = useState<'markdown' | 'image' | 'text' | 'pdf' | 'unsupported'>('unsupported');
  const [url, setUrl] = useState<string | null>(null);
  const [html, setHtml] = useState<string>('');
  const [text, setText] = useState<string>('');

  useEffect(() => {
    if (!doc) return;
    setState('loading');
    const name = (doc.attachment?.originalFileName ?? doc.title ?? '').toLowerCase();
    const mime = (doc.attachment?.mimeType ?? '').toLowerCase();
    const isMd = name.endsWith('.md') || name.endsWith('.markdown') || mime === 'text/markdown';
    const isImg = mime.startsWith('image/');
    const isPdf = mime === 'application/pdf' || name.endsWith('.pdf');
    const isText = name.endsWith('.txt') || name.endsWith('.csv') || name.endsWith('.log') || mime.startsWith('text/');

    let kind: typeof contentType = 'unsupported';
    if (isMd) kind = 'markdown';
    else if (isImg) kind = 'image';
    else if (isPdf) kind = 'pdf';
    else if (isText) kind = 'text';

    const previewUrl = `/api/documents/${doc.id}/preview`;
    setContentType(kind);
    setUrl(previewUrl);

    if (kind === 'markdown' || kind === 'text') {
      fetch(previewUrl, { credentials: 'same-origin' })
        .then(async (r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          if (kind === 'markdown') {
            const h = await r.text();
            setHtml(h);
          } else {
            const t = await r.text();
            setText(t);
          }
          setState('ready');
        })
        .catch(() => setState('error'));
    } else {
      setState('ready');
    }
  }, [doc]);

  useEffect(() => {
    if (!doc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [doc, onClose]);

  if (!doc) return null;
  const previewable = contentType !== 'unsupported';

  return (
    <Modal
      open={!!doc}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 min-w-0">
          {contentType === 'image' ? <ImageIcon size={14} className="shrink-0" /> :
           contentType === 'markdown' ? <FileText size={14} className="shrink-0" /> :
           <FileText size={14} className="shrink-0" />}
          <span className="truncate">{doc.title}</span>
        </div>
      }
      size="xl"
      footer={
        <>
          <a
            href={`/api/documents/${doc.id}/download`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary"
          >
            <Download size={14} /> 下载原文件
          </a>
          <Button onClick={onClose}>关闭</Button>
        </>
      }
    >
      {state === 'loading' && (
        <div className="text-sm text-muted py-12 text-center">加载中…</div>
      )}
      {state === 'error' && (
        <div className="text-sm text-red-600 py-8">
          预览加载失败。可点击右下角「下载原文件」获取。
        </div>
      )}
      {state === 'ready' && (
        <>
          {!previewable && (
            <div className="space-y-3 text-sm text-slate-700">
              <div className="rounded-md bg-slate-50 px-4 py-6 text-center">
                <FileText size={28} className="mx-auto text-slate-400" />
                <div className="mt-2 text-slate-800">该类型不支持在线预览</div>
                <div className="mt-1 text-xs text-slate-500">
                  {doc.attachment?.originalFileName ?? doc.title}
                </div>
              </div>
            </div>
          )}
          {contentType === 'markdown' && (
            <div
              className="md-render"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
          {contentType === 'text' && (
            <pre className="bg-slate-900 text-slate-50 px-4 py-3 rounded-md overflow-auto text-[12.5px] whitespace-pre-wrap break-words">
              {text}
            </pre>
          )}
          {contentType === 'image' && url && (
            <div className="flex items-center justify-center bg-slate-50 rounded-md overflow-hidden">
              <img
                src={url}
                alt={doc.title}
                className="max-w-full max-h-[70vh] object-contain"
              />
            </div>
          )}
          {contentType === 'pdf' && url && (
            <iframe
              src={url}
              className="w-full h-[70vh] rounded-md border border-slate-200"
              title={doc.title}
            />
          )}
        </>
      )}
    </Modal>
  );
}

// ──────────────────────────── Archive ────────────────────────────

function ArchivePanel({
  projectId,
  isPrivileged,
  project,
  state,
  users,
  onChanged,
}: {
  projectId: string;
  isPrivileged: boolean;
  project: any;
  state: any;
  users: UserLite[];
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    currentVersion: '',
    systemName: project.systemName ?? '',
    systemStatus: 'ACTIVE',
    description: '',
    objective: '',
    businessValue: '',
    specialNotes: '',
    maintenanceNotes: '',
    handoverInfo: '',
    currentMaintainerId: '',
    confirm: false,
  });

  async function toggle(key: string, value: boolean) {
    await apiFetch(`/api/projects/${projectId}/archive`, {
      method: 'POST',
      body: JSON.stringify({ itemKey: key, isChecked: value }),
    });
    onChanged();
  }

  async function commit() {
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/projects/${projectId}/archive/commit`, {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          currentVersion: form.currentVersion || null,
          systemName: form.systemName || null,
          description: form.description || null,
          objective: form.objective || null,
          businessValue: form.businessValue || null,
          specialNotes: form.specialNotes || null,
          maintenanceNotes: form.maintenanceNotes || null,
          handoverInfo: form.handoverInfo || null,
          currentMaintainerId: form.currentMaintainerId || null,
        }),
      });
      setOpen(false);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : '归档失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardHeader
          title="归档完整度"
          description={`分项勾选会按权重计入总分，状态为 COMPLETED 或 ARCHIVED 时生效。`}
          actions={
            isPrivileged && project.status !== 'ARCHIVED' ? (
              <Button onClick={() => setOpen(true)}>整理档案并归档</Button>
            ) : project.status === 'ARCHIVED' ? (
              <Badge tone="slate">已归档</Badge>
            ) : null
          }
        />
        <CardBody>
          {!state ? (
            <div className="text-sm text-muted">加载中…</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-baseline gap-3">
                <div className="text-3xl font-semibold tabular-nums">{state.archiveCompleteness}%</div>
                <div className="text-sm text-muted">
                  {state.archiveCompleteness >= 60 ? '已达到归档门槛' : '尚未达到 60%，需要二次确认'}
                </div>
              </div>
              <Table>
                <thead>
                  <tr>
                    <Th>检查项</Th>
                    <Th align="right">自动判定</Th>
                    <Th align="right">人工确认</Th>
                  </tr>
                </thead>
                <tbody>
                  {state.items.map((it: any) => (
                    <tr key={it.key}>
                      <Td>{it.key}</Td>
                      <Td align="right">
                        {it.isAutoChecked ? <Badge tone="green">✓ 自动满足</Badge> : <Badge tone="neutral">未满足</Badge>}
                      </Td>
                      <Td align="right">
                        {isPrivileged ? (
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={it.isChecked}
                              onChange={(e) => toggle(it.key, e.target.checked)}
                            />
                            <span className="text-xs text-muted">已人工确认</span>
                          </label>
                        ) : (
                          it.isChecked ? <Badge tone="green">✓</Badge> : <Badge tone="neutral">—</Badge>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </CardBody>
      </Card>

      {isPrivileged && project.status === 'ARCHIVED' && (
        <Card>
          <CardHeader title="维护 / 注意事项" />
          <CardBody className="space-y-3 text-sm">
            <Section title="业务价值" value={project.businessValue} />
            <Section title="特殊注意事项" value={project.specialNotes} />
            <Section title="维护说明" value={project.maintenanceNotes} />
            <Section title="交接信息" value={project.handoverInfo} />
          </CardBody>
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="整理档案" size="lg" footer={
        <>
          <Button variant="ghost" onClick={() => setOpen(false)}>取消</Button>
          <Button onClick={commit} loading={saving}>归档</Button>
        </>
      }>
        {error && <div className="rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm mb-3">{error}</div>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="系统名"><Input value={form.systemName} onChange={(e) => setForm({ ...form, systemName: e.target.value })} /></Field>
          <Field label="当前版本"><Input value={form.currentVersion} onChange={(e) => setForm({ ...form, currentVersion: e.target.value })} placeholder="如 1.5" /></Field>
          <Field label="软件状态">
            <Select value={form.systemStatus} onChange={(e) => setForm({ ...form, systemStatus: e.target.value })}>
              <option value="ACTIVE">运行中</option>
              <option value="MAINTENANCE">维护中</option>
              <option value="DEPRECATED">已弃用</option>
              <option value="OFFLINE">已下线</option>
              <option value="UNKNOWN">未知</option>
            </Select>
          </Field>
          <Field label="当前维护人">
            <Select value={form.currentMaintainerId} onChange={(e) => setForm({ ...form, currentMaintainerId: e.target.value })}>
              <option value="">未指定</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.displayName}</option>)}
            </Select>
          </Field>
        </div>
        <div className="mt-3 space-y-2.5">
          <Field label="业务价值"><Textarea rows={2} value={form.businessValue} onChange={(e) => setForm({ ...form, businessValue: e.target.value })} /></Field>
          <Field label="特殊注意事项"><Textarea rows={3} value={form.specialNotes} onChange={(e) => setForm({ ...form, specialNotes: e.target.value })} placeholder="绝对不能做的事 / 升级顺序 / 数据库注意事项…" /></Field>
          <Field label="维护说明"><Textarea rows={3} value={form.maintenanceNotes} onChange={(e) => setForm({ ...form, maintenanceNotes: e.target.value })} placeholder="如何启动 / 停止 / 重启 / 回滚…" /></Field>
          <Field label="交接信息"><Textarea rows={3} value={form.handoverInfo} onChange={(e) => setForm({ ...form, handoverInfo: e.target.value })} /></Field>
        </div>
        {state && state.archiveCompleteness < 60 && (
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.checked })} />
            我确认即使档案完整度不足 60%，仍然归档
          </label>
        )}
      </Modal>
    </div>
  );
}

function Section({ title, value }: { title: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-xs font-medium text-muted">{title}</div>
      <div className="whitespace-pre-wrap text-fg">{value || '—'}</div>
    </div>
  );
}

// ──────────────────────────── Lineage ────────────────────────────

function LineagePanel({
  projectId,
  currentDepartmentId,
  currentProjectTypeId,
  isPrivileged,
  data,
  departments,
  projectTypes,
  users,
  me,
  onChanged,
}: any) {
  const [branchOpen, setBranchOpen] = useState(false);
  const [migrateOpen, setMigrateOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);

  async function branch(name: string) {
    await apiFetch(`/api/projects/${projectId}/branch`, {
      method: 'POST',
      body: JSON.stringify({
        name,
        departmentId: currentDepartmentId,
        projectTypeId: currentProjectTypeId,
        ownerId: me.id,
        priority: 'P2',
        startDate: null,
        dueDate: null,
      }),
    });
    onChanged();
  }

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardHeader title="项目谱系" description="父项目 / 兄弟项目 / 子项目" actions={
          <div className="flex gap-2">
            {isPrivileged && <>
              <Button size="sm" variant="secondary" onClick={() => setBranchOpen(true)}><GitBranch size={14}/> 创建分支</Button>
              <Button size="sm" variant="secondary" onClick={() => setMigrateOpen(true)}><ArrowRightLeft size={14}/> 迁移部门</Button>
              <Button size="sm" variant="secondary" onClick={() => setMergeOpen(true)}><GitMerge size={14}/> 合并</Button>
            </>}
          </div>
        } />
        <CardBody>
          {!data ? (
            <div className="text-sm text-muted">加载中…</div>
          ) : data.nodes.length <= 1 ? (
            <EmptyState title="该项目尚无关联项目" description={isPrivileged ? '可创建分支、合并、迁移以建立谱系。' : '等待其他项目关联。'} />
          ) : (
            <ol className="space-y-2 text-sm">
              {data.nodes.map((n: any) => (
                <li
                  key={n.id}
                  className={[
                    'flex items-center justify-between rounded-md border px-3 py-2',
                    n.id === data.currentId ? 'border-slate-900 bg-slate-50' : 'border-slate-200',
                  ].join(' ')}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted">{n.projectCode}</span>
                      {n.id === data.rootId && <Badge tone="violet">根</Badge>}
                      {n.id === data.currentId && <Badge tone="slate">当前</Badge>}
                    </div>
                    <Link href={`/projects/${n.id}`} className="text-fg hover:underline">{n.name}</Link>
                  </div>
                  <div className="text-xs text-muted">{STATUS_LABEL[n.status as keyof typeof STATUS_LABEL] ?? n.status} · {n.createdAt.slice(0, 10)}</div>
                </li>
              ))}
            </ol>
          )}
        </CardBody>
      </Card>

      {/* 分支 / 迁移 / 合并 Modal */}
      <NameModal
        open={branchOpen}
        onClose={() => setBranchOpen(false)}
        title="创建项目分支"
        label="新分支名称"
        placeholder="如：采购报表升级"
        onConfirm={(name) => { setBranchOpen(false); return branch(name); }}
      />

      <MigrateModal
        open={migrateOpen}
        onClose={() => setMigrateOpen(false)}
        onConfirm={async (targetDepartmentId, reason) => {
          await apiFetch(`/api/projects/${projectId}/migrate`, {
            method: 'POST',
            body: JSON.stringify({ targetDepartmentId, reason }),
          });
          setMigrateOpen(false);
          onChanged();
        }}
        departments={departments}
      />

      <MergeModal
        open={mergeOpen}
        onClose={() => setMergeOpen(false)}
        onConfirm={async (sourceProjectIds, reason) => {
          await apiFetch(`/api/projects/${projectId}/merge`, {
            method: 'POST',
            body: JSON.stringify({ sourceProjectIds, reason }),
          });
          setMergeOpen(false);
          onChanged();
        }}
      />
    </div>
  );
}

function NameModal({
  open,
  onClose,
  title,
  label,
  placeholder,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  label: React.ReactNode;
  placeholder?: string;
  onConfirm: (name: string) => Promise<void> | void;
}) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title={title} footer={
      <>
        <Button variant="ghost" onClick={onClose}>取消</Button>
        <Button onClick={async () => { setSaving(true); try { await onConfirm(name); } finally { setSaving(false); } }} loading={saving} disabled={!name.trim()}>确认</Button>
      </>
    }>
      <Label className="block mb-1">{label}</Label>
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={placeholder} />
      <FieldHelp>将基于当前项目派生，会自动设置 parentProjectId / rootProjectId。</FieldHelp>
    </Modal>
  );
}

function MigrateModal({
  open,
  onClose,
  onConfirm,
  departments,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (targetDepartmentId: string, reason?: string) => Promise<void> | void;
  departments: { id: string; name: string }[];
}) {
  const [target, setTarget] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title="迁移部门" footer={
      <>
        <Button variant="ghost" onClick={onClose}>取消</Button>
        <Button onClick={async () => { setSaving(true); try { await onConfirm(target, reason || undefined); } finally { setSaving(false); } }} loading={saving} disabled={!target}>确认</Button>
      </>
    }>
      <Label className="block mb-1">目标部门 *</Label>
      <Select value={target} onChange={(e) => setTarget(e.target.value)}>
        <option value="">请选择</option>
        <optgroup label="业务部门">
          {departments.filter((d: any) => (d.category ?? 'BUSINESS') === 'BUSINESS').map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </optgroup>
        <optgroup label="职能部门">
          {departments.filter((d: any) => (d.category ?? 'BUSINESS') !== 'BUSINESS').map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </optgroup>
      </Select>
      <div className="mt-3">
        <Label className="block mb-1">原因</Label>
        <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
    </Modal>
  );
}

function MergeModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (sourceProjectIds: string[], reason?: string) => Promise<void> | void;
}) {
  const [sources, setSources] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title="合并项目到当前项目" footer={
      <>
        <Button variant="ghost" onClick={onClose}>取消</Button>
        <Button
          variant="danger"
          onClick={async () => { setSaving(true); try { await onConfirm(sources.split(/[\s,]+/).filter(Boolean), reason || undefined); } finally { setSaving(false); } }}
          loading={saving}
          disabled={!sources.trim()}
        >
          合并
        </Button>
      </>
    }>
      <div className="rounded-md bg-amber-50 text-amber-800 px-3 py-2 text-sm mb-3">
        ⚠ 合并后，被合并的项目将变为 MERGED 状态，不可再次修改业务字段。
      </div>
      <Label className="block mb-1">被合并项目 ID（逗号或空格分隔） *</Label>
      <Textarea rows={3} value={sources} onChange={(e) => setSources(e.target.value)} placeholder="uuid1, uuid2, uuid3" />
      <div className="mt-3">
        <Label className="block mb-1">原因</Label>
        <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
    </Modal>
  );
}

// ──────────────────────────── History ────────────────────────────

function HistoryPanel({ items }: { items: any[] | null }) {
  return (
    <div className="mt-4">
      <Card>
        <CardHeader title="变更历史" description={`${items?.length ?? 0} 条审计记录`} />
        <CardBody>
          {items == null ? (
            <div className="text-sm text-muted">加载中…</div>
          ) : items.length === 0 ? (
            <EmptyState title="暂无历史" />
          ) : (
            <ol className="space-y-3 text-sm">
              {items.map((h) => (
                <li key={h.id} className="rounded-md border border-slate-200 p-3">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>{h.action} · {h.actor ?? '系统'}</span>
                    <span>{h.createdAt?.slice(0, 19).replace('T', ' ')}</span>
                  </div>
                  {h.changedFields?.length > 0 && (
                    <div className="mt-1 text-xs">
                      变更字段：<span className="font-mono text-fg">{h.changedFields.join(', ')}</span>
                    </div>
                  )}
                  {h.after && (
                    <details className="mt-1">
                      <summary className="text-xs text-blue-700 cursor-pointer">查看变更内容</summary>
                      <pre className="mt-1 text-xs bg-slate-50 rounded p-2 overflow-auto">{JSON.stringify({ before: h.before, after: h.after, reason: h.reason }, null, 2)}</pre>
                    </details>
                  )}
                </li>
              ))}
            </ol>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

// ──────────────────────────── Share（移至 /shares 管理页，详情页仅提供入口）────────────────────────────
