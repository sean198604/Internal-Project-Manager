'use client';

import * as React from 'react';
import { Badge, Card, CardHeader, CardBody, EmptyState } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Input, Label, FieldError } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { Table, Th, Td } from '@/components/ui/table';
import { useToast, apiFetch } from '@/components/form-helpers';

type PType = {
  id: string;
  code: string;
  name: string;
  color: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  projectCount: number;
};

const emptyForm = { code: '', name: '', color: '', description: '', sortOrder: '0' };

export function ProjectTypesView() {
  const { toast, show } = useToast();
  const [items, setItems] = React.useState<PType[] | null>(null);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<PType | null>(null);
  const [form, setForm] = React.useState(emptyForm);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState('');

  async function load() {
    try {
      const res = await apiFetch<PType[]>('/api/settings/project-types');
      setItems(res);
    } catch (e) {
      show('error', e instanceof Error ? e.message : '加载失败');
    }
  }
  React.useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setErr('');
    setOpen(true);
  }
  function openEdit(t: PType) {
    setEditing(t);
    setForm({
      code: t.code,
      name: t.name,
      color: t.color ?? '',
      description: t.description ?? '',
      sortOrder: String(t.sortOrder),
    });
    setErr('');
    setOpen(true);
  }

  async function submit() {
    setSaving(true);
    setErr('');
    try {
      const payload = {
        name: form.name.trim(),
        color: form.color.trim() || null,
        description: form.description.trim() || null,
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (editing) {
        await apiFetch(`/api/settings/project-types/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        show('success', '类型已更新');
      } else {
        await apiFetch('/api/settings/project-types', {
          method: 'POST',
          body: JSON.stringify({ code: form.code.trim(), ...payload }),
        });
        show('success', '类型已创建');
      }
      setOpen(false);
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(t: PType) {
    try {
      await apiFetch(`/api/settings/project-types/${t.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !t.isActive }),
      });
      show('success', t.isActive ? '类型已停用' : '类型已启用');
      load();
    } catch (e) {
      show('error', e instanceof Error ? e.message : '操作失败');
    }
  }

  async function remove(t: PType) {
    if (!confirm(`确定删除「${t.name}」吗？`)) return;
    try {
      await apiFetch(`/api/settings/project-types/${t.id}`, { method: 'DELETE' });
      show('success', '类型已删除');
      load();
    } catch (e) {
      show('error', e instanceof Error ? e.message : '删除失败');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted">Settings</div>
          <h1 className="text-xl font-semibold text-fg">项目类型管理</h1>
          <div className="mt-1 text-sm text-muted">共 {items?.length ?? 0} 个类型</div>
        </div>
        <Button onClick={openCreate}>+ 新建类型</Button>
      </div>

      <Card>
        <CardHeader title="类型列表" description="用于给项目分类（新功能 / 优化 / Bug 修复等）。删除前需先转移其下的项目。" />
        <CardBody className="p-0">
          {items === null ? (
            <div className="p-6 text-sm text-muted">加载中…</div>
          ) : items.length === 0 ? (
            <EmptyState title="暂无类型" description="点击右上角「新建类型」创建第一个。" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>名称</Th>
                  <Th>编码</Th>
                  <Th align="center">项目数</Th>
                  <Th align="center">状态</Th>
                  <Th align="right">操作</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((t) => (
                  <tr key={t.id}>
                    <Td>
                      <div className="flex items-center gap-2">
                        {t.color ? (
                          <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: t.color }} />
                        ) : (
                          <span className="inline-block h-3 w-3 rounded-full bg-slate-300" />
                        )}
                        <span className="font-medium text-fg">{t.name}</span>
                      </div>
                      {t.description && <div className="mt-0.5 text-xs text-muted">{t.description}</div>}
                    </Td>
                    <Td className="font-mono text-xs">{t.code}</Td>
                    <Td align="center" className="font-mono text-xs">{t.projectCount}</Td>
                    <Td align="center">
                      {t.isActive ? <Badge tone="green" dot>启用</Badge> : <Badge tone="slate">停用</Badge>}
                    </Td>
                    <Td align="right">
                      <div className="flex items-center justify-end gap-3 text-xs">
                        <button className="text-blue-700 hover:underline" onClick={() => openEdit(t)}>编辑</button>
                        <button
                          className={t.isActive ? 'text-amber-700 hover:underline' : 'text-emerald-700 hover:underline'}
                          onClick={() => toggleActive(t)}
                        >
                          {t.isActive ? '停用' : '启用'}
                        </button>
                        <button
                          className="text-red-600 hover:underline disabled:text-slate-300"
                          disabled={t.projectCount > 0}
                          title={t.projectCount > 0 ? '该类型下仍有项目，无法删除' : ''}
                          onClick={() => remove(t)}
                        >
                          删除
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `编辑类型 · ${editing.name}` : '新建类型'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>取消</Button>
            <Button onClick={submit} loading={saving} disabled={!form.name.trim() || (!editing && !form.code.trim())}>
              保存
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="block mb-1">编码 *</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="如 FEATURE" disabled={Boolean(editing)} maxLength={20} />
              {editing && <p className="mt-1 text-[11px] text-muted">编码创建后不可修改</p>}
            </div>
            <div>
              <Label className="block mb-1">名称 *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="如 新功能" maxLength={50} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="block mb-1">标记颜色</Label>
              <div className="flex items-center gap-2">
                <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="如 #2563EB" maxLength={20} />
                {form.color && <input type="color" className="h-9 w-10 rounded-md border border-slate-300" value={/^#[0-9a-fA-F]{6}$/.test(form.color) ? form.color : '#2563EB'} onChange={(e) => setForm({ ...form, color: e.target.value })} />}
              </div>
            </div>
            <div>
              <Label className="block mb-1">排序</Label>
              <Input type="number" min={0} max={999} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
            </div>
          </div>
          <div>
            <Label className="block mb-1">描述（可选）</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={200} />
          </div>
          {err && <FieldError>{err}</FieldError>}
        </div>
      </Modal>

      {toast && (
        <div className={`fixed bottom-4 right-4 rounded-md px-4 py-2.5 text-sm text-white shadow-lg ${
          toast.type === 'success' ? 'bg-emerald-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-slate-800'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
