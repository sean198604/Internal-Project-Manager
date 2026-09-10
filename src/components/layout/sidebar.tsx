'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Archive,
  Building2,
  ChevronRight,
  LayoutDashboard,
  Link2,
  LogOut,
  Settings,
  Users,
} from 'lucide-react';
import type { Role } from '@prisma/client';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { ChangePasswordDialog } from './change-password-dialog';

export type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  roles: Role[];
  count?: string;
};

export const NAV_MAIN: NavItem[] = [
  {
    href: '/dashboard',
    label: '工作台',
    icon: <LayoutDashboard size={17} />,
    roles: ['ADMIN', 'MASTER', 'USER'],
  },
  {
    href: '/projects',
    label: '项目',
    icon: <Archive size={17} />,
    roles: ['ADMIN', 'MASTER', 'USER'],
  },
  {
    href: '/archive',
    label: '资产',
    icon: <Building2 size={17} />,
    roles: ['ADMIN', 'MASTER'],
  },
  {
    href: '/shares',
    label: '分享链接',
    icon: <Link2 size={17} />,
    roles: ['ADMIN', 'MASTER', 'USER'],
  },
];

export const NAV_SETTINGS: NavItem[] = [
  {
    href: '/settings/users',
    label: '用户',
    icon: <Users size={17} />,
    roles: ['ADMIN'],
  },
  {
    href: '/settings/departments',
    label: '部门',
    icon: <Building2 size={17} />,
    roles: ['ADMIN'],
  },
  {
    href: '/settings/project-types',
    label: '项目类型',
    icon: <Settings size={17} />,
    roles: ['ADMIN'],
  },
];

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: '系统管理员',
  MASTER: '主管',
  USER: '用户',
};

const SB_KEY = 'ipm_sb';

export function Sidebar({ role, displayName }: { role: Role; displayName: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SB_KEY) === '1');
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      document.body.classList.toggle('sb-collapsed', collapsed);
      localStorage.setItem(SB_KEY, collapsed ? '1' : '0');
    } catch {}
  }, [collapsed, ready]);

  const toggle = () => setCollapsed((v) => !v);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    location.replace('/login');
  }

  const renderLink = (item: NavItem) => {
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
    return (
      <Link
        key={item.href}
        href={item.href}
        title={collapsed ? item.label : undefined}
        className={cn(
          'group relative flex items-center gap-2.5 rounded-lg text-[13px] font-semibold transition-colors',
          collapsed ? 'justify-center px-0 py-2.5 mx-1 mb-0.5' : 'px-3 py-2 mb-0.5',
          active
            ? 'bg-[#dbeafe] text-[#1a365d]'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
        )}
      >
        {active && !collapsed && (
          <span className="absolute -left-2 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-[#1a365d]" />
        )}
        <span className="shrink-0 flex items-center justify-center w-5 h-5">{item.icon}</span>
        {!collapsed && <span className="whitespace-nowrap overflow-hidden">{item.label}</span>}
      </Link>
    );
  };

  const initial = role === 'ADMIN' ? 'A' : (displayName || '?').trim().charAt(0).toUpperCase();
  // ADMIN 统一显示「Admin」（不论 displayName 是什么）；其他角色用 displayName 或退到用户名
  const userLabel = role === 'ADMIN' ? 'Admin' : displayName;

  return (
    <aside
      data-collapsed={collapsed ? '1' : '0'}
      className={cn(
        'hidden shrink-0 flex-col bg-white/95 border-r border-slate-200/90 shadow-[4px_0_24px_rgba(15,23,42,0.025)] backdrop-blur-xl transition-[width] duration-200 ease-out md:sticky md:top-0 md:h-screen md:flex',
        collapsed ? 'w-[68px]' : 'w-[224px]',
      )}
    >
      {/* 品牌区 */}
      <div
        className={cn(
          'flex items-center gap-2.5 border-b border-slate-200 overflow-hidden',
          collapsed ? 'justify-center px-0 py-4' : 'px-3.5 py-3.5',
        )}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#2c5aa0] to-[#1a365d] text-white shrink-0 shadow-sm shadow-[#1a365d]/35">
          <Archive size={16} />
        </div>
        {!collapsed && (
          <div className="min-w-0 leading-tight overflow-hidden">
            <div className="truncate text-[15px] font-extrabold text-[#1a365d] tracking-tight">
              项目管理中心<span className="text-amber-500">.</span>
            </div>
            <div className="truncate text-[10px] text-slate-500 mt-0.5 tracking-wide">
              Internal-Project-Manager
            </div>
          </div>
        )}
      </div>

      {/* 折叠按钮（在模块上方、品牌下方） */}
      <div className={cn('border-b border-slate-200', collapsed ? 'py-2' : 'py-1.5')}>
        <button
          type="button"
          onClick={toggle}
          title={collapsed ? '展开侧栏' : '收起侧栏'}
          className={cn(
            'flex w-full items-center gap-2 text-[12px] font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900',
            collapsed ? 'justify-center py-2' : 'px-3 py-2',
          )}
        >
          {collapsed ? (
            <ChevronRight size={15} className="shrink-0" />
          ) : (
            <>
              <span className="shrink-0 text-[13px] font-bold leading-none">»</span>
              <span className="whitespace-nowrap">收起侧栏</span>
            </>
          )}
        </button>
      </div>

      {/* 模块分组 */}
      <nav className="flex-1 overflow-y-auto py-3">
        {!collapsed && (
          <div className="px-4 mb-2 text-[10px] font-bold tracking-[1.2px] text-slate-400 uppercase">
            模块
          </div>
        )}
        <div className={cn(collapsed ? 'px-1' : 'px-2')}>
          {NAV_MAIN.filter((i) => i.roles.includes(role)).map(renderLink)}
        </div>

        {role === 'ADMIN' && (
          <div className="mt-6">
            {!collapsed && (
              <div className="px-4 mb-2 text-[10px] font-bold tracking-[1.2px] text-slate-400 uppercase">
                设置
              </div>
            )}
            <div className={cn(collapsed ? 'px-1' : 'px-2')}>
              {NAV_SETTINGS.filter((i) => i.roles.includes(role)).map(renderLink)}
            </div>
          </div>
        )}
      </nav>

      {/* 用户区（侧栏底部） */}
      <div className="border-t border-slate-200 px-2 py-3">
        {!collapsed ? (
          <>
            <div className="flex items-center gap-2.5 px-2 pb-2.5 overflow-hidden">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2c5aa0] to-[#1a365d] text-white text-[13px] font-bold">
                {initial}
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="truncate text-[13px] font-bold leading-tight">{userLabel}</div>
                <div className="truncate text-[11px] text-slate-500 leading-tight">
                  {ROLE_LABEL[role]}
                </div>
              </div>
            </div>
            <div className="flex gap-1.5">
              <ChangePasswordDialog />
              <button
                type="button"
                onClick={logout}
                title="退出登录"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-[12px] font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              >
                <LogOut size={13} />
                <span className="whitespace-nowrap">退出</span>
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 py-1">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#2c5aa0] to-[#1a365d] text-white text-[13px] font-bold"
              title={`${userLabel} · ${ROLE_LABEL[role]}`}
            >
              {initial}
            </div>
            <button
              type="button"
              onClick={logout}
              title="退出登录"
              className="flex h-8 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            >
              <LogOut size={14} />
            </button>
            <ChangePasswordDialog compact />
          </div>
        )}
      </div>
    </aside>
  );
}
