'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export type TabItem = {
  key: string;
  label: React.ReactNode;
  href?: string;
  badge?: React.ReactNode;
};

type TabContextValue = {
  active: string;
  setActive: (key: string) => void;
};

const TabContext = React.createContext<TabContextValue | null>(null);

export function Tabs({
  defaultKey,
  value,
  onChange,
  items,
  children,
  className,
}: {
  defaultKey?: string;
  value?: string;
  onChange?: (key: string) => void;
  items: TabItem[];
  children: React.ReactNode;
  className?: string;
}) {
  const [internal, setInternal] = React.useState(defaultKey ?? items[0]?.key ?? '');
  const active = value ?? internal;

  function setActive(key: string) {
    if (value === undefined) setInternal(key);
    onChange?.(key);
  }

  return (
    <TabContext.Provider value={{ active, setActive }}>
      <div className={cn('flex flex-col min-h-0', className)}>
        <div className="border-b border-slate-200 px-1 overflow-x-auto">
          <div role="tablist" className="flex gap-1">
            {items.map((it) => {
              const isActive = it.key === active;
              return (
                <button
                  key={it.key}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActive(it.key)}
                  className={cn(
                    'px-3 py-2 text-sm font-medium border-b-2 -mb-px transition whitespace-nowrap flex items-center gap-2',
                    isActive
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-800',
                  )}
                >
                  {it.label}
                  {it.badge}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex-1 min-h-0">{children}</div>
      </div>
    </TabContext.Provider>
  );
}

export function TabPanel({
  forKey,
  children,
  className,
}: {
  forKey: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = React.useContext(TabContext);
  if (!ctx) return null;
  if (ctx.active !== forKey) return null;
  return <div className={className}>{children}</div>;
}
