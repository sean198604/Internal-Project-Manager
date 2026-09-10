'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/dashboard';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json?.error?.message ?? '登录失败，请稍后重试');
        return;
      }

      router.replace(nextPath);
      router.refresh();
    } catch {
      setError('网络异常，请检查连接后重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3.5">
      <div>
        <label
          htmlFor="username"
          className="mb-1.5 block text-[12px] font-semibold text-slate-500"
        >
          用户名
        </label>
        <input
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoFocus
          required
          placeholder="请输入用户名"
          className="h-11 w-full rounded-lg border border-slate-200 bg-[#fcfdff] px-3 text-[14px] outline-none transition focus:border-[#1a365d] focus:bg-white focus:shadow-[0_0_0_3px_rgba(26,54,93,0.10)]"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-1.5 block text-[12px] font-semibold text-slate-500"
        >
          密码
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          placeholder="请输入密码"
          className="h-11 w-full rounded-lg border border-slate-200 bg-[#fcfdff] px-3 text-[14px] outline-none transition focus:border-[#1a365d] focus:bg-white focus:shadow-[0_0_0_3px_rgba(26,54,93,0.10)]"
        />
      </div>

      {error && (
        <div className="rounded-lg bg-[#fee2e2] px-3 py-2 text-[12px] text-[#dc2626]">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#1a365d] text-[14px] font-bold text-white shadow-[0_2px_6px_rgba(26,54,93,0.3)] transition hover:bg-[#16345f] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>登录中…</span>
          </>
        ) : (
          <span>登 录</span>
        )}
      </button>
    </form>
  );
}
