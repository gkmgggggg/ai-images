import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'border-line bg-panel text-muted',
        ink: 'border-ink bg-ink text-paper',
        accent: 'border-ink bg-acid text-acid-ink',
        warning: 'border-amber-500/40 bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100',
        danger: 'border-coral/40 bg-coral/10 text-coral',
        success: 'border-emerald-600/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
