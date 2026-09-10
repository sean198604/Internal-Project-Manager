'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Archive, LogOut, Menu, X } from 'lucide-react';
import type { Role } from '@prisma/client';
import { cn } from '@/lib/utils';
import { ChangePasswordDialog } from './change-password-dialog';
import { NAV_MAIN, NAV_SETTINGS, ROLE_LABEL } from './sidebar';

export function Topbar({
  departmentName,
  role,
  displayName,
}: {
  departmentName: string | null;
  role: Role;
  displayName: string;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    location.replace('/login');
  }

  const mainItems = NAV_MAIN.filter((item) => item.roles.includes(role));
  const settingsItems = NAV_SETTINGS.filter((item) => item.roles.includes(role));
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-200/90 bg-white/90 px-4 backdrop-blur-xl sm:px-6 md:h-14 md:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 md:hidden"
            aria-label="打开导航菜单"
          >
            <Menu size={21} />
          </button>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#2c5aa0] to-[#1a365d] text-white shadow-sm md:hidden">
            <Archive size={16} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold text-slate-700">
              {departmentName || '项目管理中心'}
            </div>
            <div className="truncate text-[11px] text-slate-400 md:hidden">{ROLE_LABEL[role]}</div>
          </div>
          {departmentName && (
            <>
              <span className="hidden text-slate-300 md:inline">·</span>
              <span className="hidden text-xs font-medium text-slate-500 md:inline">{ROLE_LABEL[role]}</span>
            </>
          )}
        </div>
        <div className="hidden items-center gap-2 text-xs text-slate-500 sm:flex md:hidden">
          <span className="max-w-32 truncate font-semibold text-slate-700">{displayName}</span>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="关闭导航菜单"
            className="absolute inset-0 h-full w-full bg-slate-950/45 backdrop-blur-[2px]"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(86vw,340px)] flex-col bg-white shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#2c5aa0] to-[#1a365d] text-white shadow-sm">
                  <Archive size={17} />
                </div>
                <div>
                  <div className="text-[15px] font-extrabold tracking-tight text-[#1a365d]">项目管理中心</div>
                  <div className="text-[10px] tracking-wide text-slate-400">INTERNAL PROJECT MANAGER</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
                aria-label="关闭导航菜单"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4">
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[1.2px] text-slate-400">模块</div>
              {[...mainItems, ...settingsItems].map((item, index) => (
                <div key={item.href}>
                  {index === mainItems.length && settingsItems.length > 0 && (
                    <div className="mb-2 mt-6 px-3 text-[10px] font-bold uppercase tracking-[1.2px] text-slate-400">设置</div>
                  )}
                  <Link
                    href={item.href}
                    className={cn(
                      'mb-1 flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold',
                      isActive(item.href)
                        ? 'bg-blue-50 text-[#1a365d]'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                    )}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/70 ring-1 ring-slate-200/70">{item.icon}</span>
                    {item.label}
                  </Link>
                </div>
              ))}
            </nav>

            <div className="border-t border-slate-200 bg-slate-50/70 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="mb-3">
                <div className="truncate text-sm font-bold text-slate-900">{role === 'ADMIN' ? 'Admin' : displayName}</div>
                <div className="mt-0.5 text-xs text-slate-500">{departmentName || ROLE_LABEL[role]}</div>
              </div>
              <div className="flex gap-2">
                <ChangePasswordDialog />
                <button
                  type="button"
                  onClick={logout}
                  className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600"
                >
                  <LogOut size={15} /> 退出登录
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl md:hidden">
        <div
          className="mx-auto grid max-w-lg px-1"
          style={{ gridTemplateColumns: `repeat(${mainItems.length}, minmax(0, 1fr))` }}
        >
          {mainItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex min-h-[64px] flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold',
                isActive(item.href) ? 'text-[#1a365d]' : 'text-slate-500',
              )}
            >
              {isActive(item.href) && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-[#1a365d]" />}
              <span className={cn('flex h-8 w-10 items-center justify-center rounded-xl', isActive(item.href) && 'bg-blue-50')}>
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
