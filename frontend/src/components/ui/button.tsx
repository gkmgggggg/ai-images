import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border text-sm font-semibold transition-[transform,box-shadow] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'border-ink bg-ink text-paper hover:-translate-y-px',
        accent: 'border-ink bg-acid text-acid-ink shadow-hard-sm hover:-translate-y-px hover:shadow-hard',
        outline: 'border-ink bg-panel text-ink hover:-translate-y-px hover:shadow-hard-sm',
        ghost: 'border-transparent bg-transparent text-ink hover:bg-line/60',
        danger: 'border-coral bg-panel text-coral hover:bg-coral hover:text-white',
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
