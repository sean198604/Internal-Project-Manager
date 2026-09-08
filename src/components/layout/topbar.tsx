'use client';

import type { Role } from '@prisma/client';

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: '系统管理员',
  MASTER: '主管',
  USER: '用户',
};

export function Topbar({
  departmentName,
  role,
}: {
  departmentName: string | null;
  role: Role;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-3 border-b border-slate-200 bg-white/85 px-8 backdrop-blur-md">
      <span className="text-xs font-medium text-slate-500">
        {departmentName ? departmentName : '项目管理中心'}
      </span>
      {departmentName && (
        <>
          <span className="text-slate-300">·</span>
          <span className="text-xs font-medium text-slate-500">{ROLE_LABEL[role]}</span>
        </>
      )}
    </header>
  );
}