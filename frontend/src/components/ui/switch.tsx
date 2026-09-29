import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  className?: string;
}

/** 开关：原生复选框加 role="switch"（透明并铺满整个开关），键盘与读屏行为由浏览器提供。 */
export function Switch({ checked, onChange, label, description, className }: SwitchProps) {
  return (
    <label className={cn('relative flex cursor-pointer items-center gap-3', className)}>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer absolute inset-0 z-10 m-0 size-full cursor-pointer opacity-0"
      />
      <span
        aria-hidden
        className="relative h-6 w-10 shrink-0 rounded-full bg-fg/15 transition-colors peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent after:absolute after:top-[3px] after:left-[3px] after:size-[18px] after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-4"
      />
      <span className="flex flex-col">
        <span className="text-sm font-semibold">{label}</span>
        {description && <span className="text-xs text-muted">{description}</span>}
      </span>
    </label>
  );
}
