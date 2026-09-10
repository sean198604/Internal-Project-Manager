import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getActorOrNull } from '@/server/lib/auth';
import { prisma } from '@/server/db/prisma';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';

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
    <div className="flex min-h-screen">
      <Sidebar role={actor.role} displayName={actor.displayName} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          departmentName={department?.name ?? null}
          role={actor.role}
          displayName={actor.displayName}
        />
        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto w-full max-w-[1400px] px-4 pb-28 pt-5 sm:px-6 sm:pt-6 md:pb-8 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
