import * as PopoverPrimitive from '@radix-ui/react-popover';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;
export const PopoverClose = PopoverPrimitive.Close;

/** 基于 Radix Popover：自带定位、焦点管理、Esc 与点击外部关闭，关闭后焦点回到触发按钮。 */
export function PopoverContent({ className, sideOffset = 8, ...props }: ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          'z-30 rounded-modal border border-border bg-surface p-6 text-fg shadow-[0_40px_100px_-20px_rgba(0,0,0,.6)] animate-[drop-in_.22s_cubic-bezier(.2,.8,.2,1)_both] focus:outline-none',
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
