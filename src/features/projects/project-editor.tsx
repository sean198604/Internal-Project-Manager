'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, Check, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea, Select, FieldHelp } from '@/components/ui/field';
import { Card, CardHeader, CardBody } from '@/components/ui/primitives';
import { apiFetch } from '@/components/form-helpers';
import { STATUS_LABEL, StatusBadge } from '@/components/status-badge';
import { LIFECYCLE, PStatus, advanceStatus, findPath, todayTaipei } from './status-flow';

type Department = { id: string; name: string; category?: 'BUSINESS' | 'FUNCTION' };
type ProjectType = { id: string; name: string };
type User = { id: string; displayName: string };
type Role = 'ADMIN' | 'MASTER' | 'USER';

type CriteriaItem = { text: string; done: boolean };
type ProjectStatus = PStatus;

/** 编辑弹窗允许手动选择的状态（MERGED 走合并专项，不在下拉中暴露） */
const EDITABLE_STATES: PStatus[] = [
  'DRAFT',
  'PLANNED',
  'IN_PROGRESS',
  'WAITING_ACCEPTANCE',
  'COMPLETED',
  'ARCHIVED',
  'ON_HOLD',
  'CANCELLED',
];

/** 仅系统管理员 / 主管可修改的关键字段（与后端 service.update touchesCritical 一致） */
const CRITICAL_KEYS = [
  'status',
  'progress',
  'actualCompletedDate',
  'priority',
  'departmentId',
  'ownerId',
  'dueDate',
] as const;

type FormState = {
  name: string;
  shortName: string;
  systemName: string;
  description: string;
  objective: string;
  requirement: string;
  acceptanceCriteria: CriteriaItem[];
  departmentId: string;
  projectTypeId: string;
  ownerId: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  startDate: string;
  dueDate: string;
  status: ProjectStatus;
  progress: string;
  actualCompletedDate: string;
};

const initial: FormState = {
  name: '',
  shortName: '',
  systemName: '',
  description: '',
  objective: '',
  requirement: '',
  acceptanceCriteria: [],
  departmentId: '',
  projectTypeId: '',
  ownerId: '',
  priority: 'P2',
  startDate: '',
  dueDate: '',
  status: 'DRAFT',
  progress: '0',
  actualCompletedDate: '',
};

const PRIORITY_OPTIONS: { v: FormState['priority']; label: string; active: string; idle: string }[] = [
  {
    v: 'P0',
    label: 'P0 · 最高',
    active: 'bg-red-600 border-red-600 text-white shadow-sm',
    idle: 'border-red-200 text-red-700 hover:bg-red-50',
  },
  {
    v: 'P1',
    label: 'P1 · 高',
    active: 'bg-amber-500 border-amber-500 text-white shadow-sm',
    idle: 'border-amber-300 text-amber-700 hover:bg-amber-50',
  },
  {
    v: 'P2',
    label: 'P2 · 中',
    active: 'bg-[#378ADD] border-[#378ADD] text-white shadow-sm',
    idle: 'border-sky-200 text-sky-700 hover:bg-sky-50',
  },
  {
    v: 'P3',
    label: 'P3 · 低',
    active: 'bg-slate-500 border-slate-500 text-white shadow-sm',
    idle: 'border-slate-300 text-slate-600 hover:bg-slate-50',
  },
];

export function ProjectEditor({
  mode,
  me,
  initialValue,
  departments,
  projectTypes,
  users,
}: {
  mode: 'create' | 'edit';
  me: { id: string; displayName: string; role?: Role };
  initialValue?: any;
  departments: Department[];
  projectTypes: ProjectType[];
  users: User[];
}) {
  const router = useRouter();
  const isPrivilegedActor = (me.role === 'ADMIN' || me.role === 'MASTER') as boolean;
  const normDate = (v?: string | null) => (v && v !== '—' ? v : '');
  const [form, setForm] = useState<FormState>(() => {
    if (mode !== 'edit') return initial;
    return {
      name: initialValue.name ?? '',
      shortName: initialValue.shortName ?? '',
      systemName: initialValue.systemName ?? '',
      description: initialValue.description ?? '',
      objective: initialValue.objective ?? '',
      requirement: initialValue.requirement ?? '',
      acceptanceCriteria: Array.isArray(initialValue.acceptanceCriteria)
        ? initialValue.acceptanceCriteria
        : [],
      departmentId: initialValue.department?.id ?? '',
      projectTypeId: initialValue.projectType?.id ?? '',
      ownerId: initialValue.owner?.id ?? me.id,
      priority: initialValue.priority ?? 'P2',
      startDate: normDate(initialValue.startDate),
      dueDate: normDate(initialValue.dueDate),
      status: initialValue.status ?? 'DRAFT',
      progress: String(initialValue.progress ?? 0),
      actualCompletedDate: normDate(initialValue.actualCompletedDate),
    };
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // 编辑态下「能否改关键字段」：只有管理员/主管能改（USER 只可改名称/描述/目标/需求等非关键内容）
  const canChangeCritical = mode === 'create' || isPrivilegedActor;
  const isTerminalRow = mode === 'edit' && (initialValue?.status === 'CANCELLED' || initialValue?.status === 'MERGED');

  function update<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  /** 点生命周期步进：允许一步直达（保存时后端按状态机自动逐跳流转） */
  function pickStatus(s: ProjectStatus) {
    if (!canChangeCritical) return;
    setForm((f) => {
      const next: FormState = { ...f, status: s };
      // 标记已完成：联动 进度=100% + 实际完成日期=今天（可再改）
      if (s === 'COMPLETED') {
        if (Number(next.progress || 0) < 100) next.progress = '100';
        if (!next.actualCompletedDate) next.actualCompletedDate = todayTaipei();
      }
      return next;
    });
  }

  function setProgressVal(raw: string) {
    let n = Number(raw);
    if (Number.isNaN(n)) n = 0;
    n = Math.max(0, Math.min(100, n));
    setForm((f) => ({ ...f, progress: String(n) }));
  }

  async function save() {
    setError(null);

    if (mode === 'create') {
      // 创建：发送全量（必填已由按钮 disabled 把关）
      setSaving(true);
      try {
        const payload: Record<string, unknown> = {
          ...form,
          shortName: form.shortName || null,
          systemName: form.systemName || null,
          description: form.description || null,
          objective: form.objective || null,
          requirement: form.requirement || null,
          acceptanceCriteria: form.acceptanceCriteria,
          startDate: form.startDate || null,
          dueDate: form.dueDate || null,
          ownerId: form.ownerId || me.id,
        };
        const res = await apiFetch<any>('/api/projects', { method: 'POST', body: JSON.stringify(payload) });
        router.push(`/projects/${res.id}`);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : '创建失败');
      } finally {
        setSaving(false);
      }
      return;
    }

    // ── 编辑态：只 diff 出真正变化过的字段 ──
    setSaving(true);
    try {
      const iv = initialValue;
      const changed: Record<string, unknown> = {};
      const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

      if (!eq(form.name ?? '', iv.name ?? '')) changed.name = form.name;
      if (!eq(form.shortName || '', iv.shortName ?? '')) changed.shortName = form.shortName || null;
      if (!eq(form.systemName || '', iv.systemName ?? '')) changed.systemName = form.systemName || null;
      if (!eq(form.description || '', iv.description ?? '')) changed.description = form.description || null;
      if (!eq(form.objective || '', iv.objective ?? '')) changed.objective = form.objective || null;
      if (!eq(form.requirement || '', iv.requirement ?? '')) changed.requirement = form.requirement || null;
      if (!eq(form.acceptanceCriteria, iv.acceptanceCriteria ?? [])) changed.acceptanceCriteria = form.acceptanceCriteria;
      if (!eq(form.departmentId, iv.department?.id ?? '')) changed.departmentId = form.departmentId;
      if (!eq(form.projectTypeId, iv.projectType?.id ?? '')) changed.projectTypeId = form.projectTypeId;
      if (!eq(form.ownerId, iv.owner?.id ?? me.id)) changed.ownerId = form.ownerId;
      if (!eq(form.priority, iv.priority ?? 'P2')) changed.priority = form.priority;
      if (!eq(normDate(form.startDate), normDate(iv.startDate))) changed.startDate = form.startDate || null;
      if (!eq(normDate(form.dueDate), normDate(iv.dueDate))) changed.dueDate = form.dueDate || null;
      if (!eq(String(form.progress || 0), String(iv.progress ?? 0))) changed.progress = Number(form.progress || 0);
      if (!eq(normDate(form.actualCompletedDate), normDate(iv.actualCompletedDate))) {
        changed.actualCompletedDate = form.actualCompletedDate || null;
      }
      const statusChanged = form.status !== iv.status;
      if (statusChanged) changed.status = form.status;

      // USER 无权改关键字段：从 payload 剔除，避免后端 404
      if (!isPrivilegedActor) {
        for (const k of CRITICAL_KEYS) delete changed[k];
      }
      if (isTerminalRow) {
        throw new Error('已取消 / 已合并的项目为终态，不可再修改');
      }

      const statusFrom = iv.status as PStatus;
      const statusTo = form.status as PStatus;
      const needStatusAdvance = isPrivilegedActor && statusChanged;

      // 关键字段（进度 / 完成日期）放在状态流转的最后一跳一并提交；无状态变更则走普通 PATCH
      const statusExtra: Record<string, unknown> = {};
      if (changed.progress !== undefined) statusExtra.progress = changed.progress as number;
      if (changed.actualCompletedDate !== undefined) {
        statusExtra.actualCompletedDate = changed.actualCompletedDate;
      }

      if (needStatusAdvance && statusFrom !== statusTo) {
        const path = findPath(statusFrom, statusTo);
        if (!path) {
          throw new Error(`状态机不允许从「${STATUS_LABEL[statusFrom]}」流转到「${STATUS_LABEL[statusTo]}」`);
        }
        const baseChanged = { ...changed };
        delete baseChanged.status;
        delete baseChanged.progress;
        delete baseChanged.actualCompletedDate;
        if (Object.keys(baseChanged).length > 0) {
          await apiFetch(`/api/projects/${iv.id}`, { method: 'PATCH', body: JSON.stringify(baseChanged) });
        }
        await advanceStatus(iv.id, statusFrom, statusTo, statusExtra);
      } else {
        const payload = { ...changed };
        if (needStatusAdvance) payload.status = form.status; // 相邻直接迁移
        if (Object.keys(payload).length === 0) {
          // 无任何变更
          router.push(`/projects/${iv.id}`);
          router.refresh();
          return;
        }
        await apiFetch(`/api/projects/${iv.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      }

      router.push(`/projects/${iv.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  // ── 渲染辅助 ──
  const statusPreviewPath =
    mode === 'edit' && form.status !== initialValue?.status
      ? findPath((initialValue?.status as PStatus) ?? 'DRAFT', form.status as PStatus)
      : null;
  const curStatus: PStatus = (mode === 'edit' ? (initialValue?.status as PStatus) : 'DRAFT') || 'DRAFT';
  const lifecycleIdx = LIFECYCLE.indexOf(curStatus);
  const currentInLifecycle = lifecycleIdx >= 0;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[1.4px] text-slate-400">Projects</div>
        <h1 className="mt-0.5 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
          {mode === 'create' ? '新建项目' : `编辑：${initialValue?.projectCode ?? ''}`}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {mode === 'create'
            ? '下方标记 * 的为核心字段。新项目将以「草稿 · 0%」创建，保存后可在详情页推进状态。'
            : '状态支持一步直达：保存时按状态机自动逐级流转（如 草稿 → 进行中 → 已完成）。'}
        </p>
      </div>

      {error && <div className="rounded-md bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm">{error}</div>}

      {/* ────────── 关键状态 / 优先级 / 进度（高亮区） ────────── */}
      <div className="rounded-xl border border-[#1a365d]/25 bg-gradient-to-br from-[#f8fafc] via-white to-[#eef4fb] p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#1a365d]" />
            <span className="text-sm font-bold text-[#1a365d]">
              {mode === 'edit' ? '生命周期与关键状态' : '关键属性'}
            </span>
          </div>
          {mode === 'edit' && !isPrivilegedActor && (
            <span className="text-[11px] text-slate-400">状态 / 进度 / 优先级 仅系统管理员、主管可调整</span>
          )}
        </div>

        {mode === 'edit' ? (
          <div className="mt-4 space-y-4">
            {/* 状态步进条：点击即选目标，保存自动走中间状态 */}
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                {LIFECYCLE.map((s, i) => {
                  const reachable = s === curStatus || !!findPath(curStatus, s);
                  const active = form.status === s;
                  const passed = currentInLifecycle && i < lifecycleIdx;
                  const isCurrent = curStatus === s;
                  const clickable = canChangeCritical && reachable && !isTerminalRow;
                  return (
                    <div key={s} className="flex items-center gap-1.5">
                      {i > 0 && <ArrowRight size={13} className="text-slate-300 shrink-0" />}
                      <button
                        type="button"
                        disabled={!clickable}
                        title={
                          !reachable
                            ? '该状态需先经中间状态，暂不能直接到达'
                            : isCurrent
                              ? '当前状态'
                              : `保存后流转到「${STATUS_LABEL[s]}」`
                        }
                        onClick={() => pickStatus(s)}
                      className={
                          'inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors ' +
                          (active && s !== curStatus
                            ? 'border-[#1a365d] bg-[#1a365d] text-white shadow-sm'
                            : isCurrent
                              ? 'border-[#1a365d] bg-[#1a365d]/10 text-[#1a365d]'
                              : passed
                                ? 'border-slate-200 bg-slate-50 text-slate-400'
                                : reachable
                                  ? 'border-slate-200 bg-white text-slate-600 hover:border-[#1a365d]/50 hover:text-[#1a365d]'
                                  : 'border-slate-100 bg-slate-50 text-slate-300')
                        }
                      >
                        {isCurrent && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                        {active && s !== curStatus && <Check size={12} strokeWidth={3} />}
                        {STATUS_LABEL[s]}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  当前：<StatusBadge status={curStatus} />
                </span>
                {statusPreviewPath && statusPreviewPath.length > 1 ? (
                  <span className="inline-flex items-center gap-1">
                    保存后：
                    <span className="font-semibold text-[#1a365d]">
                      {statusPreviewPath.map((s, i) => (
                        <span key={s}>
                          {i > 0 && <ArrowRight size={11} className="inline text-slate-300 mx-0.5 -mt-0.5" />}
                          {STATUS_LABEL[s]}
                        </span>
                      ))}
                    </span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    目标：
                    <span className="font-semibold text-[#1a365d]">{STATUS_LABEL[form.status]}</span>
                  </span>
                )}
              </div>

              {/* 非常规状态（暂停 / 取消 / 归档 等） */}
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-white/80 border border-slate-200 px-3 py-2">
                <span className="text-xs text-slate-500">更多状态：</span>
                <Select
                  value={form.status}
                  disabled={!canChangeCritical || isTerminalRow}
                  onChange={(e) => update('status', e.target.value as ProjectStatus)}
                  className="h-8 w-40 text-xs"
                >
                  {EDITABLE_STATES.map((s) => {
                    const reachable = s === curStatus || !!findPath(curStatus, s);
                    return (
                      <option key={s} value={s} disabled={!reachable}>
                        {STATUS_LABEL[s]}
                        {!reachable ? '（需先流转到中间状态）' : ''}
                      </option>
                    );
                  })}
                </Select>
                <span className="text-[11px] text-slate-400">
                  {curStatus === 'ARCHIVED' || curStatus === 'COMPLETED'
                    ? '归档请在详情页「整理档案并归档」完成，会生成完整度清单。'
                    : 'MERGED（合并）请走谱系合并专项流程。'}
                </span>
              </div>
            </div>

            {/* 第二行：优先级 / 进度 / 实际完成日期 三个载体 */}
            <div className="grid gap-3 lg:grid-cols-3">
              <div className="rounded-lg bg-white border border-slate-200 p-3.5 space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">优先级</div>
                <div className="flex flex-wrap gap-1.5">
                  {PRIORITY_OPTIONS.map((o) => {
                    const active = form.priority === o.v;
                    return (
                      <button
                        key={o.v}
                        type="button"
                        disabled={!canChangeCritical}
                        onClick={() => update('priority', o.v)}
                        className={
                          'rounded-md border px-2.5 py-1.5 text-[12px] font-bold transition-colors ' +
                          (active ? o.active : o.idle + ' disabled:opacity-50')
                        }
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-lg bg-white border border-slate-200 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">进度</div>
                  <div className="text-2xl font-extrabold tabular-nums text-[#1a365d]">
                    {form.progress || 0}
                    <span className="text-sm font-semibold text-slate-400">%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  disabled={!canChangeCritical}
                  value={Number(form.progress || 0)}
                  onChange={(e) => setProgressVal(e.target.value)}
                  className="w-full accent-[#1a365d]"
                />
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    disabled={!canChangeCritical}
                    value={form.progress}
                    onChange={(e) => setProgressVal(e.target.value)}
                    className="h-8 w-20 text-right tabular-nums"
                  />
                  <span className="text-xs text-slate-400">/ 100</span>
                </div>
                {form.status === 'COMPLETED' && (
                  <div className="text-[11px] font-medium text-green-600">✓ 已完成状态，进度默认 100%</div>
                )}
              </div>

              <div className="rounded-lg bg-white border border-slate-200 p-3.5 space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">实际完成日期</div>
                <Input
                  type="date"
                  disabled={!canChangeCritical}
                  value={form.actualCompletedDate || ''}
                  onChange={(e) => update('actualCompletedDate', e.target.value)}
                />
                <div className="text-[11px] leading-relaxed text-slate-400">
                  标记「已完成」自动填今天，可手改。
                  <br />
                  点“已完成”即可一步到位保存。
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* create：优先级 + 说明 */
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Label className="block w-20">优先级 *</Label>
              <div className="flex flex-wrap gap-1.5">
                {PRIORITY_OPTIONS.map((o) => {
                  const active = form.priority === o.v;
                  return (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => update('priority', o.v)}
                      className={
                        'rounded-md border px-3 py-1.5 text-[12px] font-bold transition-colors ' +
                        (active ? o.active : o.idle)
                      }
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="开始日期 *">
                <Input type="date" value={form.startDate} onChange={(e) => update('startDate', e.target.value)} />
              </Field>
              <Field label="预计完成日期 *">
                <Input type="date" value={form.dueDate} onChange={(e) => update('dueDate', e.target.value)} />
                <FieldHelp>超过此日期未完成将自动识别为「延期」。</FieldHelp>
              </Field>
            </div>
          </div>
        )}
      </div>

      {/* ────────── 基本信息 ────────── */}
      <Card>
        <CardHeader title="基本信息" />
        <CardBody className="grid gap-4 lg:grid-cols-2">
          <Field label="项目名称 *" required>
            <Input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="如：销售报价平台第一期" />
          </Field>
          <Field label="短名称">
            <Input value={form.shortName} onChange={(e) => update('shortName', e.target.value)} placeholder="可选" />
          </Field>
          <Field label="系统名称">
            <Input value={form.systemName} onChange={(e) => update('systemName', e.target.value)} placeholder="如：Sales Quote System" />
            <FieldHelp>项目名称 ≠ 系统名称。系统名称是上线后供人记忆的名字。</FieldHelp>
          </Field>

          <Field label="需求部门 *" required>
            <Select
              value={form.departmentId}
              disabled={mode === 'edit' && !isPrivilegedActor}
              onChange={(e) => update('departmentId', e.target.value)}
            >
              <option value="">请选择部门</option>
              <optgroup label="业务部门">
                {departments.filter((d) => (d.category ?? 'BUSINESS') === 'BUSINESS').map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </optgroup>
              <optgroup label="职能部门">
                {departments.filter((d) => (d.category ?? 'BUSINESS') !== 'BUSINESS').map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </optgroup>
            </Select>
          </Field>
          <Field label="项目类型 *" required>
            <Select value={form.projectTypeId} onChange={(e) => update('projectTypeId', e.target.value)}>
              <option value="">请选择类型</option>
              {projectTypes.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>

          <Field label="项目负责人 *" required>
            <Select
              value={form.ownerId}
              disabled={mode === 'edit' && !isPrivilegedActor}
              onChange={(e) => update('ownerId', e.target.value)}
            >
              <option value="">请选择负责人</option>
              <option value={me.id}>{me.displayName}（我）</option>
              {users.filter((u) => u.id !== me.id).map((u) => <option key={u.id} value={u.id}>{u.displayName}</option>)}
            </Select>
          </Field>
          {mode === 'edit' && (
            <Field label="开始日期 *">
              <Input type="date" value={form.startDate} onChange={(e) => update('startDate', e.target.value)} />
            </Field>
          )}

          {mode === 'edit' && (
            <Field label="预计完成日期 *">
              <Input
                type="date"
                disabled={!isPrivilegedActor}
                value={form.dueDate}
                onChange={(e) => update('dueDate', e.target.value)}
              />
            </Field>
          )}
          {mode === 'create' && (
            <Field label="项目描述">
              <Textarea rows={2} value={form.description} onChange={(e) => update('description', e.target.value)} />
            </Field>
          )}
        </CardBody>
      </Card>

      {/* ────────── 目标与需求 ────────── */}
      <Card>
        <CardHeader title="目标与需求" />
        <CardBody className="space-y-4">
          <Field label="项目目标（Objective）">
            <Textarea rows={3} value={form.objective} onChange={(e) => update('objective', e.target.value)} placeholder="这个项目为什么做？解决什么业务问题？" />
          </Field>
          <Field label="项目需求（Requirement）">
            <Textarea rows={6} value={form.requirement} onChange={(e) => update('requirement', e.target.value)} placeholder={"支持 Markdown\n- 功能 A\n- 功能 B"} />
          </Field>
          {mode === 'edit' && (
            <Field label="项目描述">
              <Textarea rows={3} value={form.description} onChange={(e) => update('description', e.target.value)} />
            </Field>
          )}
        </CardBody>
      </Card>

      {/* ────────── 验收标准 ────────── */}
      <Card>
        <CardHeader
          title="验收标准（Acceptance Criteria）"
          description="作为 checklist，归档评分时会自动计入。"
          actions={
            <Button variant="secondary" size="sm" onClick={() => update('acceptanceCriteria', [...form.acceptanceCriteria, { text: '', done: false }])}>
              <Plus size={14} /> 添加
            </Button>
          }
        />
        <CardBody className="space-y-2">
          {form.acceptanceCriteria.length === 0 ? (
            <div className="text-sm text-muted">暂无验收项，点击右上方「添加」。</div>
          ) : (
            form.acceptanceCriteria.map((it, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={it.done}
                  onChange={(e) => {
                    const copy = [...form.acceptanceCriteria];
                    copy[idx] = { ...it, done: e.target.checked };
                    update('acceptanceCriteria', copy);
                  }}
                />
                <Input
                  value={it.text}
                  onChange={(e) => {
                    const copy = [...form.acceptanceCriteria];
                    copy[idx] = { ...it, text: e.target.value };
                    update('acceptanceCriteria', copy);
                  }}
                  placeholder="□ 功能完成"
                  className="flex-1"
                />
                <button
                  type="button"
                  className="text-muted hover:text-red-600 p-1"
                  onClick={() => {
                    const copy = form.acceptanceCriteria.filter((_, i) => i !== idx);
                    update('acceptanceCriteria', copy);
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </CardBody>
      </Card>

      <div className="flex flex-wrap justify-end gap-2 max-sm:[&>button]:flex-1">
        {mode === 'edit' && !isPrivilegedActor && (
          <span className="mr-auto self-center text-[11px] text-slate-400">关键字段由系统管理员维护，你只能修改描述类内容</span>
        )}
        <Button variant="ghost" onClick={() => history.back()}>取消</Button>
        <Button
          onClick={save}
          loading={saving}
          disabled={isTerminalRow || !form.name || !form.departmentId || !form.projectTypeId || !form.ownerId}
        >
          保存{mode === 'create' ? '并创建' : ''}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: React.ReactNode; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="block">{label}{required ? <span className="text-red-500"> *</span> : null}</Label>
      {children}
    </div>
  );
}
