'use client';

import * as React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 项目星级（0-5）。
 * 只读：不给 onRate；可交互：传 onRate(value)。
 * value=0 显示灰星（未评分）。
 */
export function StarRating({
  value,
  onRate,
  size = 13,
  className,
  title,
}: {
  value: number;
  onRate?: (v: number) => void;
  size?: number;
  className?: string;
  title?: string;
}) {
  const [hover, setHover] = React.useState<number | null>(null);
  const interactive = !!onRate;
  const shown = hover ?? value;

  return (
    <span
      className={cn('inline-flex items-center gap-[1px]', className)}
      title={title ?? (value > 0 ? `${value} 星` : '未评分')}
      onMouseLeave={() => setHover(null)}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= shown;
        const star = (
          <Star
            key={n}
            size={size}
            strokeWidth={1.5}
            className={cn(
              filled ? 'text-amber-400' : 'text-slate-300',
              interactive && 'cursor-pointer transition-transform hover:scale-125',
            )}
            fill={filled ? 'currentColor' : 'none'}
          />
        );
        if (!interactive) return star;
        return (
          <span
            key={n}
            role="button"
            tabIndex={0}
            aria-label={`${n} 星`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRate?.(value === n ? 0 : n); // 点当前星再点一次 = 取消评分
            }}
            onMouseEnter={() => setHover(n)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onRate?.(value === n ? 0 : n);
              }
            }}
          >
            {star}
          </span>
        );
      })}
    </span>
  );
}
