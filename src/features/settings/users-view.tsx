'use client';

import * as React from 'react';
import { Badge, Card, CardHeader, CardBody, EmptyState } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Input, Select, Label, FieldHelp, FieldError } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { Table, Th, Td } from '@/components/ui/table';
import { useToast, apiFetch } from '@/components/form-helpers';
import { WorkspacePageHeader } from '@/components/layout/workspace-shell';

type DeptOpt = { id: string; name: string; code: string };
type UserRow = {
  id: string;
  username: string;
  displayName: string;
  role: 'ADMIN' | 'MASTER' | 'USER';
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  departmentId: string | null;
  departmentName: string | null;
  departmentActive: boolean | null;
  projectCount: number;
};

const ROLE_TONE: Record<string, 'violet' | 'blue' | 'neutral'> = {
  ADMIN: 'violet',
  MASTER: 'blue',
  USER: 'neutral',
};

type UserForm = {
  username: string;
  displayName: string;
  password: string;
  role: string;
  departmentId: string;
};

const emptyForm: UserForm = { username: '', displayName: '', password: '', role: 'USER', departmentId: '' };

export function UsersView({ meId }: { meId: string }) {
  const { toast, show } = useToast();
  const [items, setItems] = React.useState<UserRow[] | null>(null);
  const [depts, setDepts] = React.useState<DeptOpt[]>([]);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<UserRow | null>(null);
  const [form, setForm] = React.useState<UserForm>(emptyForm);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState('');

  async function loadAll() {
    try {
      const [u, d] = await Promise.all([
        apiFetch<UserRow[]>('/api/settings/users'),
        apiFetch<DeptOpt[]>('/api/settings/departments'),
      ]);
      setItems(u);
      setDepts(d.filter((x) => x.id !== null));
    } catch (e) {
      show('error', e instanceof Error ? e.message : '加载失败');
    }
  }
  React.useEffect(() => { loadAll(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setErr('');
    setOpen(true);
  }
  function openEdit(u: UserRow) {
    setEditing(u);
    setForm({
      username: u.username,
      displayName: u.displayName,
      password: '',
      role: u.role,
      departmentId: u.departmentId ?? '',
    });
    setErr('');
    setOpen(true);
  }

  async function submit() {
    setSaving(true);
    setErr('');
    try {
      if (editing) {
        const patch: Record<string, unknown> = {
          displayName: form.displayName.trim(),
          role: form.role,
          departmentId: form.departmentId || null,
        };
        if (form.password) patch.password = form.password;
        await apiFetch(`/api/settings/users/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(patch),
        });
        show('success', '用户已更新');
      } else {
        await apiFetch('/api/settings/users', {
          method: 'POST',
          body: JSON.stringify({
            username: form.username.trim(),
            displayName: form.displayName.trim(),
            password: form.password,
            role: form.role,
            departmentId: form.departmentId || null,
          }),
        });
        show('success', '用户已创建');
      }
      setOpen(false);
      loadAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(u: UserRow) {
    if (u.id === meId) {
      show('error', '不能停用当前登录的账号');
      return;
    }
    try {
      await apiFetch(`/api/settings/users/${u.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !u.isActive }),
      });
      show('success', u.isActive ? '账号已停用' : '账号已启用');
      loadAll();
    } catch (e) {
      show('error', e instanceof Error ? e.message : '操作失败');
    }
  }

  const activeCount = items?.filter((i) => i.isActive).length ?? 0;

  return (
    <div className="space-y-5">
      <WorkspacePageHeader
        eyebrow="Settings · Users"
        title="用户管理"
        description={`共 ${items?.length ?? 0} 个账号，${activeCount} 个启用中`}
        actions={<Button onClick={openCreate}>+ 新建账号</Button>}
      />

      <Card>
        <CardHeader
          title="账号列表"
          description="ADMIN / MASTER 可查看全部部门项目；USER 只能查看本部门项目。可停用账号（不删除，保留历史记录）。"
        />
        <CardBody className="p-0">
          {items === null ? (
            <div className="p-6 text-sm text-muted">加载中…</div>
          ) : items.length === 0 ? (
            <EmptyState title="暂无账号" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>姓名</Th>
                  <Th>用户名</Th>
                  <Th>角色</Th>
                  <Th>部门</Th>
                  <Th align="center">负责项目</Th>
                  <Th>最近登录</Th>
                  <Th align="center">状态</Th>
                  <Th align="right">操作</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => (
                  <tr key={u.id}>
                    <Td>
                      <span className="font-medium text-fg">{u.displayName}</span>
                      {u.id === meId && <span className="ml-2 text-[11px] text-muted">(我)</span>}
                    </Td>
                    <Td className="font-mono text-xs">{u.username}</Td>
                    <Td>
                      <Badge tone={ROLE_TONE[u.role]}>{u.role}</Badge>
                    </Td>
                    <Td>
                      {u.departmentName ?? <span className="text-muted">—</span>}
                      {u.departmentName && u.departmentActive === false && (
                        <span className="ml-1 text-[11px] text-amber-700">(已停用)</span>
                      )}
                    </Td>
                    <Td align="center" className="font-mono text-xs">{u.projectCount}</Td>
                    <Td className="text-xs text-muted">{u.lastLoginAt ? u.lastLoginAt.slice(0, 16).replace('T', ' ') : '从未登录'}</Td>
                    <Td align="center">
                      {u.isActive ? <Badge tone="green" dot>启用</Badge> : <Badge tone="red" dot>停用</Badge>}
                    </Td>
                    <Td align="right">
                      <div className="flex items-center justify-end gap-3 text-xs">
                        <button className="text-blue-700 hover:underline" onClick={() => openEdit(u)}>编辑</button>
                        {u.id !== meId && (
                          <button
                            className={u.isActive ? 'text-amber-700 hover:underline' : 'text-emerald-700 hover:underline'}
                            onClick={() => toggleActive(u)}
                          >
                            {u.isActive ? '停用' : '启用'}
                          </button>
                        )}
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
        title={editing ? `编辑账号 · ${editing.displayName}` : '新建账号'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>取消</Button>
            <Button
              onClick={submit}
              loading={saving}
              disabled={!form.displayName.trim() || (!editing && (!form.username.trim() || form.password.length < 6))}
            >
              保存
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {!editing && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="block mb-1">用户名 *</Label>
                <Input
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
                  placeholder="登录用户名"
                  maxLength={30}
                />
              </div>
              <div>
                <Label className="block mb-1">姓名 *</Label>
                <Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="显示姓名" maxLength={50} />
              </div>
            </div>
          )}
          {editing && (
            <div>
              <Label className="block mb-1">姓名 *</Label>
              <Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} maxLength={50} />
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="block mb-1">{editing ? '重置密码（留空不改）' : '初始密码 *'}</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editing ? '不修改请留空' : '至少 6 位'}
                maxLength={64}
              />
            </div>
            <div>
              <Label className="block mb-1">角色</Label>
              <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="USER">USER（本部门）</option>
                <option value="MASTER">MASTER（全部，技术）</option>
                <option value="ADMIN">ADMIN（全部，管理）</option>
              </Select>
            </div>
          </div>
          <div>
            <Label className="block mb-1">所属部门</Label>
            <Select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
              <option value="">— 无部门（全局）—</option>
              {depts.map((d) => (
                <option key={d.id} value={d.id}>{d.name}（{d.code}）</option>
              ))}
            </Select>
            <FieldHelp>USER 必须选部门，否则看不到任何项目。</FieldHelp>
          </div>
          {editing && (
            <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-muted">
              该用户已有 {editing.projectCount} 个负责项目。停用账号不会删除其历史记录。
            </div>
          )}
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
