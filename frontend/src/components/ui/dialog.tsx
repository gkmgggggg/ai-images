import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;
export const DialogClose = DialogPrimitive.Close;

/** 基于 Radix Dialog：自带焦点陷阱、Esc 关闭、背景滚动锁定。 */
export function DialogContent({
  className,
  children,
  closeLabel = '关闭',
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & { closeLabel?: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm" />
      <DialogPrimitive.Content
        className={cn(
          'fixed inset-0 z-50 m-auto flex max-h-[100dvh] w-full flex-col overflow-hidden border-ink bg-panel shadow-2xl focus:outline-none sm:inset-4 sm:max-h-[calc(100dvh-2rem)] sm:rounded-xl sm:border',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          aria-label={closeLabel}
          className="absolute top-3 right-3 z-10 grid size-10 place-items-center rounded-full border border-ink bg-panel text-ink shadow-hard-sm transition-transform hover:-translate-y-px"
        >
          <X className="size-5" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
