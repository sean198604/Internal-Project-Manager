'use client';

import * as React from 'react';
import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Label, FieldHelp, FieldError } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { apiFetch } from '@/components/form-helpers';

export function ChangePasswordDialog({ compact }: { compact?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);
  const [form, setForm] = React.useState({ current: '', next: '', confirm: '' });

  function openDialog() {
    setError(null);
    setDone(false);
    setForm({ current: '', next: '', confirm: '' });
    setOpen(true);
  }

  async function submit() {
    setError(null);
    if (!form.current) return setError('请输入当前密码');
    if (form.next.length < 8) return setError('新密码至少 8 位');
    if (!/[A-Za-z]/.test(form.next) || !/\d/.test(form.next)) return setError('新密码需同时包含字母和数字');
    if (form.next !== form.confirm) return setError('两次输入的新密码不一致');

    setSubmitting(true);
    try {
      await apiFetch('/api/auth/password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: form.current,
          newPassword: form.next,
          confirmPassword: form.confirm,
        }),
      });
      setDone(true);
      setForm({ current: '', next: '', confirm: '' });
    } catch (e) {
      setError((e as Error).message || '修改失败，请重试');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        title="修改密码"
        className={
          compact
            ? 'flex h-8 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            : 'flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-[12px] font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-900'
        }
      >
        <KeyRound size={compact ? 14 : 13} />
        {!compact && <span className="whitespace-nowrap">修改密码</span>}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="修改密码"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>取消</Button>
            <Button loading={submitting} onClick={submit} disabled={done}>
              {done ? '已完成' : '确认修改'}
            </Button>
          </>
        }
      >
        {done ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-5 text-center text-sm font-medium text-emerald-800">
            密码已修改成功
          </div>
        ) : (
          <div className="space-y-3.5">
            <div>
              <Label>当前密码</Label>
              <Input
                type="password"
                autoComplete="current-password"
                value={form.current}
                onChange={(e) => setForm((f) => ({ ...f, current: e.target.value }))}
                placeholder="输入当前登录密码"
              />
            </div>
            <div>
              <Label>新密码</Label>
              <Input
                type="password"
                autoComplete="new-password"
                value={form.next}
                onChange={(e) => setForm((f) => ({ ...f, next: e.target.value }))}
                placeholder="至少 8 位，包含字母和数字"
              />
            </div>
            <div>
              <Label>确认新密码</Label>
              <Input
                type="password"
                autoComplete="new-password"
                value={form.confirm}
                onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
                placeholder="再次输入新密码"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submit();
                }}
              />
              <FieldHelp>修改成功后，下次登录请使用新密码。</FieldHelp>
            </div>
            {error && <FieldError>{error}</FieldError>}
          </div>
        )}
      </Modal>
    </>
  );
}
