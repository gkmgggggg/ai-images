import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;
export const DialogClose = DialogPrimitive.Close;

function Overlay() {
  return <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-overlay backdrop-blur-sm animate-[fade-in_.2s_both]" />;
}

/** 基于 Radix Dialog：自带焦点陷阱、Esc 关闭、背景滚动锁定。窄屏铺满，宽屏居中。 */
export function DialogContent({
  className,
  children,
  closeLabel = '关闭',
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & { closeLabel?: string }) {
  return (
    <DialogPrimitive.Portal>
      <Overlay />
      <DialogPrimitive.Content
        className={cn(
          'fixed inset-0 z-50 m-auto flex max-h-[100dvh] w-full flex-col overflow-hidden bg-surface shadow-[0_40px_100px_-20px_rgba(0,0,0,.6)] animate-[pop-in_.3s_cubic-bezier(.2,.8,.2,1)_both] focus:outline-none sm:inset-6 sm:max-h-[calc(100dvh-3rem)] sm:rounded-modal sm:border sm:border-border',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          aria-label={closeLabel}
          className="absolute top-4 right-4 z-10 grid size-10 place-items-center rounded-full border border-border bg-surface/80 text-fg backdrop-blur transition-colors hover:border-fg"
        >
          <X className="size-5" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/** 底部抽屉：窄屏的筛选面板等使用，同样带焦点陷阱与 Esc 关闭。 */
export function SheetContent({ className, children, ...props }: ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <Overlay />
      <DialogPrimitive.Content
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col overflow-y-auto rounded-t-[20px] bg-surface px-4 pt-2 shadow-[0_-10px_40px_rgba(0,0,0,.35)] animate-[sheet-up_.3s_cubic-bezier(.2,.8,.2,1)_both] focus:outline-none',
          className,
        )}
        {...props}
      >
        <div aria-hidden className="mx-auto mt-1 mb-3 h-1 w-10 shrink-0 rounded-full bg-border" />
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
