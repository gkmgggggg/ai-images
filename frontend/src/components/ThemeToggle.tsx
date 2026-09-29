import { Monitor, Moon, Sun } from 'lucide-react';

import { THEME_CYCLE, useTheme, type ThemePreference } from '@/lib/theme';
import { cn } from '@/lib/utils';

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: '浅色', Icon: Sun },
  { value: 'system', label: '跟随系统', Icon: Monitor },
  { value: 'dark', label: '深色', Icon: Moon },
];

const LABELS = Object.fromEntries(OPTIONS.map((o) => [o.value, o.label])) as Record<ThemePreference, string>;

/** 三选一的主题单选组，宽屏使用。 */
export function ThemeToggle({ className }: { className?: string }) {
  const { preference, setPreference } = useTheme();
  return (
    <div role="radiogroup" aria-label="主题" className={cn('inline-flex gap-0.5 rounded-full bg-fg/[0.07] p-[3px]', className)}>
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
            'grid size-8 place-items-center rounded-full text-muted transition-colors hover:text-fg',
            preference === value && 'bg-fg text-bg hover:text-bg',
          )}
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  );
}

/** 单个按钮依次切换主题（深色 → 浅色 → 跟随系统），窄屏使用。 */
export function ThemeCycleButton({ className }: { className?: string }) {
  const { preference, setPreference } = useTheme();
  const next = THEME_CYCLE[(THEME_CYCLE.indexOf(preference) + 1) % THEME_CYCLE.length];
  const Icon = OPTIONS.find((o) => o.value === preference)?.Icon ?? Moon;
  return (
    <button
      type="button"
      onClick={() => setPreference(next)}
      aria-label={`主题：${LABELS[preference]}，点击切换为${LABELS[next]}`}
      title={`主题：${LABELS[preference]}`}
      className={cn(
        'grid size-10 shrink-0 place-items-center rounded-full bg-fg/[0.07] text-fg transition-colors hover:bg-fg/[0.12]',
        className,
      )}
    >
      <Icon className="size-[18px]" />
    </button>
  );
}
