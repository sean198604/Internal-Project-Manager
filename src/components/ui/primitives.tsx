import * as React from 'react';

type Tone =
  | 'neutral'
  | 'slate'
  | 'green'
  | 'amber'
  | 'red'
  | 'blue'
  | 'violet'
  | 'orange'
  | 'sky';

const TONE: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  slate: 'bg-slate-900 text-white ring-slate-900/10',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  orange: 'bg-orange-50 text-orange-700 ring-orange-200',
  sky: 'bg-sky-50 text-sky-700 ring-sky-200',
};

export function Badge({
  tone = 'neutral',
  children,
  className = '',
  dot = false,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1',
        TONE[tone],
        className,
      ].join(' ')}
    >
      {dot && <span className="inline-block w-1.5 h-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}

export function Card({
  children,
  className = '',
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={['rounded-lg border border-slate-200 bg-white shadow-sm', className].join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  actions,
  className = '',
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        'flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-200',
        className,
      ].join(' ')}
    >
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        {description && <div className="mt-0.5 text-xs text-slate-500">{description}</div>}
      </div>
      {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={['p-5', className].join(' ')}>{children}</div>;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-4">
      {icon && <div className="mb-3 text-slate-400">{icon}</div>}
      <div className="text-sm font-medium text-slate-900">{title}</div>
      {description && <div className="mt-1 text-xs text-slate-500 max-w-md">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: 'neutral' | 'red' | 'amber' | 'green' | 'blue';
}) {
  const valueColor: Record<string, string> = {
    neutral: 'text-slate-900',
    red: 'text-red-700',
    amber: 'text-amber-700',
    green: 'text-emerald-700',
    blue: 'text-blue-700',
  };
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={['mt-2 text-2xl font-semibold tabular-nums', valueColor[tone]].join(' ')}>
        {value}
      </div>
      {hint && <div className="mt-1 text-[11px] text-slate-400">{hint}</div>}
    </div>
  );
}
