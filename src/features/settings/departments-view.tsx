'use client';

import * as React from 'react';
import { Badge, Card, CardHeader, CardBody, EmptyState } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Input, Select, Label, FieldError } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { Table, Th, Td } from '@/components/ui/table';
import { useToast, apiFetch } from '@/components/form-helpers';
import { WorkspacePageHeader } from '@/components/layout/workspace-shell';

type Dept = {
  id: string;
  code: string;
  name: string;
  category: 'BUSINESS' | 'FUNCTION';
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  userCount: number;
  projectCount: number;
};

type FormState = {
  code: string;
  name: string;
  category: 'BUSINESS' | 'FUNCTION';
  description: string;
  sortOrder: string;
};

const CATEGORY_LABEL: Record<'BUSINESS' | 'FUNCTION', string> = {
  BUSINESS: '业务部门',
  FUNCTION: '职能部门',
};

const emptyForm: FormState = { code: '', name: '', category: 'BUSINESS', description: '', sortOrder: '0' };

export function DepartmentsView() {
  const { toast, show } = useToast();
  const [items, setItems] = React.useState<Dept[] | null>(null);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Dept | null>(null);
  const [form, setForm] = React.useState<FormState>(emptyForm);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState('');

  async function load() {
    try {
      const res = await apiFetch<Dept[]>('/api/settings/departments');
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

  function openEdit(d: Dept) {
    setEditing(d);
    setForm({
      code: d.code,
      name: d.name,
      category: d.category ?? 'BUSINESS',
      description: d.description ?? '',
      sortOrder: String(d.sortOrder),
    });
    setErr('');
    setOpen(true);
  }

  async function submit() {
    setSaving(true);
    setErr('');
    try {
      if (editing) {
        await apiFetch(`/api/settings/departments/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: form.name.trim(),
            category: form.category,
            description: form.description.trim() || null,
            sortOrder: Number(form.sortOrder) || 0,
          }),
        });
        show('success', '部门已更新');
      } else {
        await apiFetch('/api/settings/departments', {
          method: 'POST',
          body: JSON.stringify({
            code: form.code.trim(),
            name: form.name.trim(),
            category: form.category,
            description: form.description.trim() || null,
            sortOrder: Number(form.sortOrder) || 0,
          }),
        });
        show('success', '部门已创建');
      }
      setOpen(false);
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(d: Dept) {
    try {
      await apiFetch(`/api/settings/departments/${d.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !d.isActive }),
      });
      show('success', d.isActive ? '部门已停用' : '部门已启用');
      load();
    } catch (e) {
      show('error', e instanceof Error ? e.message : '操作失败');
    }
  }

  async function remove(d: Dept) {
    if (!confirm(`确定删除「${d.name}」吗？`)) return;
    try {
      await apiFetch(`/api/settings/departments/${d.id}`, { method: 'DELETE' });
      show('success', '部门已删除');
      load();
    } catch (e) {
      show('error', e instanceof Error ? e.message : '删除失败');
    }
  }

  const inactiveCount = items?.filter((i) => !i.isActive).length ?? 0;

  return (
    <div className="space-y-5">
      <WorkspacePageHeader
        eyebrow="Settings · Departments"
        title="部门管理"
        description={`共 ${items?.length ?? 0} 个部门${inactiveCount > 0 ? `（其中 ${inactiveCount} 个已停用）` : ''}`}
        actions={<Button onClick={openCreate}>+ 新建部门</Button>}
      />

      <Card>
        <CardHeader
          title="部门列表"
          description="部门先按大类分组（业务部门 / 职能部门），再是具体部门。创建项目时按部门归属，USER 只能查看本部门项目。"
        />
        <CardBody className="p-0">
          {items === null ? (
            <div className="p-6 text-sm text-muted">加载中…</div>
          ) : items.length === 0 ? (
            <EmptyState title="暂无部门" description="点击右上角「新建部门」创建第一个部门。" />
          ) : (
            (['BUSINESS', 'FUNCTION'] as const).map((cat) => {
              const list = items.filter((d) => (d.category ?? 'BUSINESS') === cat);
              if (list.length === 0) return null;
              return (
                <div key={cat}>
                  <div className="border-y border-slate-100 bg-slate-50/70 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[1px] text-slate-500">
                    {CATEGORY_LABEL[cat]} · {list.length}
                  </div>
                  <Table>
                    <thead>
                      <tr>
                        <Th>编码</Th>
                        <Th>名称</Th>
                        <Th>排序</Th>
                        <Th align="center">成员</Th>
                        <Th align="center">项目</Th>
                        <Th align="center">状态</Th>
                        <Th align="right">操作</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((d) => (
                        <tr key={d.id}>
                          <Td className="font-mono text-xs">{d.code}</Td>
                          <Td>
                            <div className="font-medium text-fg">{d.name}</div>
                            {d.description && <div className="text-xs text-muted">{d.description}</div>}
                          </Td>
                          <Td className="font-mono text-xs">{d.sortOrder}</Td>
                          <Td align="center" className="font-mono text-xs">{d.userCount}</Td>
                          <Td align="center" className="font-mono text-xs">{d.projectCount}</Td>
                          <Td align="center">
                            {d.isActive ? <Badge tone="green" dot>启用</Badge> : <Badge tone="slate">停用</Badge>}
                          </Td>
                          <Td align="right">
                            <div className="flex items-center justify-end gap-3 text-xs">
                              <button className="text-blue-700 hover:underline" onClick={() => openEdit(d)}>
                                编辑
                              </button>
                              <button
                                className={d.isActive ? 'text-amber-700 hover:underline' : 'text-emerald-700 hover:underline'}
                                onClick={() => toggleActive(d)}
                              >
                                {d.isActive ? '停用' : '启用'}
                              </button>
                              <button
                                className="text-red-600 hover:underline disabled:text-slate-300"
                                disabled={d.userCount > 0 || d.projectCount > 0}
                                title={d.userCount > 0 || d.projectCount > 0 ? '该部门仍有成员或项目，无法删除' : ''}
                                onClick={() => remove(d)}
                              >
                                删除
                              </button>
                            </div>
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              );
            })
          )}
        </CardBody>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `编辑部门 · ${editing.name}` : '新建部门'}
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="block mb-1">大类 *</Label>
              <Select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as 'BUSINESS' | 'FUNCTION' })}
              >
                <option value="BUSINESS">业务部门</option>
                <option value="FUNCTION">职能部门</option>
              </Select>
            </div>
            <div>
              <Label className="block mb-1">名称 *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="如 销售部" maxLength={50} />
            </div>
          </div>
          <div>
            <Label className="block mb-1">编码 *</Label>
            <Input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="如 SALES"
              disabled={Boolean(editing)}
              maxLength={20}
            />
            {editing && <p className="mt-1 text-[11px] text-muted">编码创建后不可修改</p>}
          </div>
          <div>
            <Label className="block mb-1">排序</Label>
            <Input
              type="number"
              min={0}
              max={999}
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
              className="w-28"
            />
            <p className="mt-1 text-[11px] text-muted">数字越小越靠前</p>
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
