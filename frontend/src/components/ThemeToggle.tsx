import { Monitor, Moon, Sun } from 'lucide-react';

import { useTheme, type ThemePreference } from '@/lib/theme';
import { cn } from '@/lib/utils';

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: '浅色', Icon: Sun },
  { value: 'system', label: '跟随系统', Icon: Monitor },
  { value: 'dark', label: '深色', Icon: Moon },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { preference, setPreference } = useTheme();
  return (
    <div role="radiogroup" aria-label="主题" className={cn('inline-flex rounded-full border border-line bg-panel p-0.5', className)}>
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={preference === value}
          title={label}
          aria-label={label}
          onClick={() => setPreference(value)}
          className={cn(
            'grid size-8 place-items-center rounded-full text-muted transition-colors',
            preference === value && 'bg-ink text-paper',
          )}
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  );
}
