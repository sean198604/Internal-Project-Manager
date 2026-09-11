'use client';

import * as React from 'react';
import type { Role } from '@prisma/client';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

export type WorkspaceHeaderConfig = {
  eyebrow: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
};

const WorkspaceHeaderContext = React.createContext<
  React.Dispatch<React.SetStateAction<WorkspaceHeaderConfig | null>> | null
>(null);

export function WorkspaceShell({
  role,
  displayName,
  departmentName,
  children,
}: {
  role: Role;
  displayName: string;
  departmentName: string | null;
  children: React.ReactNode;
}) {
  const [pageHeader, setPageHeader] = React.useState<WorkspaceHeaderConfig | null>(null);

  return (
    <WorkspaceHeaderContext.Provider value={setPageHeader}>
      <div className="flex min-h-screen">
        <Sidebar role={role} displayName={displayName} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            departmentName={departmentName}
            role={role}
            displayName={displayName}
            pageHeader={pageHeader}
          />
          <main className="flex-1 overflow-x-hidden">
            <div className="mx-auto w-full max-w-[1400px] px-4 pb-28 pt-4 sm:px-6 sm:pt-5 md:pb-8 lg:px-8 lg:pt-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </WorkspaceHeaderContext.Provider>
  );
}

export function WorkspacePageHeader({
  eyebrow,
  title,
  description,
  actions,
}: WorkspaceHeaderConfig) {
  const setPageHeader = React.useContext(WorkspaceHeaderContext);

  React.useEffect(() => {
    if (!setPageHeader) return;
    setPageHeader({ eyebrow, title, description, actions });
    return () => setPageHeader(null);
  }, [actions, description, eyebrow, setPageHeader, title]);

  return null;
}
