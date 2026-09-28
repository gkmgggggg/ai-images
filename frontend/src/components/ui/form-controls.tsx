import type { InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

const control =
  'w-full rounded-lg border border-line bg-panel px-3 text-sm text-ink placeholder:text-muted transition-colors focus-visible:border-ink focus-visible:outline-none disabled:opacity-60 aria-[invalid=true]:border-coral';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, 'h-10', className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, 'min-h-28 py-2 leading-relaxed', className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(control, 'h-10 pr-8', className)} {...props} />;
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('text-sm font-semibold text-ink', className)} {...props} />;
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-xs text-coral">
      {message}
    </p>
  );
}
