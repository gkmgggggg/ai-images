import { cn } from '@/lib/utils';

interface SegmentedProps<T extends string> {
  items: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}

/** 分段控件：语义上是一组标签页（role="tab"），用于提示词语言切换等。 */
export function Segmented<T extends string>({ items, value, onChange, label, className }: SegmentedProps<T>) {
  return (
    <div role="tablist" aria-label={label} className={cn('inline-flex gap-0.5 rounded-full bg-fg/[0.07] p-[3px]', className)}>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={item.value === value}
          onClick={() => onChange(item.value)}
          className={cn(
            'h-7 rounded-full px-3 text-xs font-semibold transition-colors',
            item.value === value ? 'bg-surface text-fg shadow-[0_1px_3px_rgba(0,0,0,.18)]' : 'text-muted hover:text-fg',
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
