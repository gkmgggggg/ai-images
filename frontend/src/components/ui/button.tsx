import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-full border text-sm font-semibold whitespace-nowrap transition-[background-color,border-color,color,box-shadow] disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'border-fg bg-fg text-bg hover:opacity-90',
        accent:
          'border-accent bg-accent text-accent-fg shadow-[0_0_26px_-6px_var(--accent)] hover:shadow-[0_0_32px_-4px_var(--accent)]',
        outline: 'border-border bg-surface text-fg hover:border-fg',
        subtle: 'border-transparent bg-fg/[0.07] text-fg hover:bg-fg/[0.12]',
        ghost: 'border-transparent bg-transparent text-fg hover:bg-surface-2',
        danger: 'border-danger/40 bg-transparent text-danger hover:border-danger hover:bg-danger/10',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4',
        lg: 'h-12 px-5 text-base',
        icon: 'size-10',
        'icon-sm': 'size-8',
      },
    },
    defaultVariants: { variant: 'outline', size: 'md' },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
