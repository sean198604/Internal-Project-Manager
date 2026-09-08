// Form helpers for client components
'use client';

import * as React from 'react';

export function useToast() {
  const [toast, setToast] = React.useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = React.useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  return { toast, show };
}

// Convenience: fetch wrapper that throws with server message on !ok
export async function apiFetch<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    credentials: 'include',
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let message = `请求失败 (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string; message?: string };
      message = data.error || data.message || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  const body = (await res.json()) as unknown;
  // 后端统一用 ok()/created() 包 { data: ... } 信封，这里统一解包，
  // 客户端组件直接拿到业务对象（无 data 键时按原样返回）
  if (body !== null && typeof body === 'object' && 'data' in (body as Record<string, unknown>)) {
    return (body as { data: T }).data;
  }
  return body as T;
}
