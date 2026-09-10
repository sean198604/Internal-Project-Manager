import * as React from 'react';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = '', ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={[
          'w-full h-10 px-3 text-sm rounded-lg border border-slate-300 bg-white placeholder:text-slate-400',
          'focus:outline-none focus:ring-2 focus:ring-[#1a365d]/15 focus:border-[#1a365d]',
          'disabled:bg-slate-50 disabled:text-slate-400',
          className,
        ].join(' ')}
        {...rest}
      />
    );
  },
);

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className = '', ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      className={[
        'w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 bg-white placeholder:text-slate-400',
        'focus:outline-none focus:ring-2 focus:ring-[#1a365d]/15 focus:border-[#1a365d]',
        'disabled:bg-slate-50 disabled:text-slate-400',
        className,
      ].join(' ')}
      {...rest}
    />
  );
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className = '', children, ...rest }, ref) {
  return (
    <select
      ref={ref}
      className={[
        'w-full h-10 px-3 text-sm rounded-lg border border-slate-300 bg-white',
        'focus:outline-none focus:ring-2 focus:ring-[#1a365d]/15 focus:border-[#1a365d]',
        'disabled:bg-slate-50 disabled:text-slate-400',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </select>
  );
});

export function Label(props: React.LabelHTMLAttributes<HTMLLabelElement>) {
  const { className = '', ...rest } = props;
  return (
    <label
      className={['text-[13px] font-semibold text-slate-600 select-none', className].join(' ')}
      {...rest}
    />
  );
}

export function FieldHelp(props: React.HTMLAttributes<HTMLParagraphElement>) {
  const { className = '', ...rest } = props;
  return <p className={['text-xs text-slate-500', className].join(' ')} {...rest} />;
}

export function FieldError(props: React.HTMLAttributes<HTMLParagraphElement>) {
  const { className = '', ...rest } = props;
  return <p className={['text-xs text-red-600', className].join(' ')} {...rest} />;
}
