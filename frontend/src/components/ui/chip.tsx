import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active: boolean;
  count?: number | string;
}

/** 可选中的胶囊按钮：分类、标签筛选使用，选中态用强调色填充。 */
export function Chip({ active, count, className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm whitespace-nowrap transition-colors',
        active ? 'border-accent bg-accent font-semibold text-accent-fg' : 'border-transparent text-muted hover:text-fg',
        className,
      )}
      {...props}
    >
      {children}
      {count !== undefined && (
        <span className={cn('text-[11px] tabular-nums', active ? 'opacity-70' : 'text-muted')}>{count}</span>
      )}
    </button>
  );
}
