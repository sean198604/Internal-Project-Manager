import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getActorOrNull } from '@/server/lib/auth';
import { prisma } from '@/server/db/prisma';
import { WorkspaceShell } from '@/components/layout/workspace-shell';

export const dynamic = 'force-dynamic';

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const actor = await getActorOrNull();
  if (!actor) redirect('/login');

  const department = actor.departmentId
    ? await prisma.department.findUnique({
        where: { id: actor.departmentId },
        select: { name: true },
      })
    : null;

  return (
    <WorkspaceShell
      role={actor.role}
      displayName={actor.displayName}
      departmentName={department?.name ?? null}
    >
      {children}
    </WorkspaceShell>
  );
}
