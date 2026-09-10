import * as React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    'bg-[#1a365d] text-white shadow-sm shadow-[#1a365d]/20 hover:bg-[#16345f] active:bg-[#102b4e] disabled:bg-slate-400',
  secondary:
    'bg-white text-slate-900 border border-slate-300 hover:bg-slate-50 active:bg-slate-100 disabled:bg-slate-100 disabled:text-slate-400',
  ghost:
    'bg-transparent text-slate-700 hover:bg-slate-100 active:bg-slate-200 disabled:text-slate-400',
  danger:
    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:bg-red-300',
};

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-xs max-md:min-h-11',
  md: 'h-10 px-4 text-sm max-md:min-h-11',
  lg: 'h-11 px-5 text-base',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, disabled, className = '', children, ...rest },
  ref,
) {
  const cls = [
    'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition select-none whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a365d]/30',
    VARIANT[variant],
    SIZE[size],
    (disabled || loading) && 'cursor-not-allowed',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button ref={ref} disabled={disabled || loading} className={cls} {...rest}>
      {loading && (
        <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
});
