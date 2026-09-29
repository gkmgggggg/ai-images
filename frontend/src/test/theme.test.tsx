import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ThemeCycleButton, ThemeToggle } from '@/components/ThemeToggle';
import { readPreference, ThemeProvider } from '@/lib/theme';

describe('F13 主题', () => {
  it('没有保存过偏好时默认深色', () => {
    expect(readPreference()).toBe('dark');
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    expect(document.documentElement).toHaveClass('dark');
    expect(screen.getByRole('radio', { name: '深色' })).toHaveAttribute('aria-checked', 'true');
  });

  it('保存过的偏好优先，包括跟随系统', () => {
    localStorage.setItem('atlas-theme', 'system');
    expect(readPreference()).toBe('system');
    localStorage.setItem('atlas-theme', 'light');
    expect(readPreference()).toBe('light');
  });

  it('ThemeCycleButton 依次切换深色、浅色、跟随系统，并记住选择', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeCycleButton />
      </ThemeProvider>,
    );
    const button = screen.getByRole('button', { name: /^主题：深色/ });
    await user.click(button);
    expect(button).toHaveAccessibleName('主题：浅色，点击切换为跟随系统');
    expect(document.documentElement).not.toHaveClass('dark');
    expect(localStorage.getItem('atlas-theme')).toBe('light');
    await user.click(button);
    expect(button).toHaveAccessibleName(/^主题：跟随系统/);
    await user.click(button);
    expect(button).toHaveAccessibleName(/^主题：深色/);
    expect(document.documentElement).toHaveClass('dark');
  });

  it('index.html 的首帧脚本在没有偏好时加上 dark 类', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    expect(html).toContain('<html lang="zh-CN" class="dark">');
    const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? '';
    document.documentElement.className = '';
    document.head.insertAdjacentHTML('beforeend', '<meta name="theme-color" content="" />');
    localStorage.clear();
    new Function(script)();
    expect(document.documentElement).toHaveClass('dark');
    localStorage.setItem('atlas-theme', 'light');
    new Function(script)();
    expect(document.documentElement).not.toHaveClass('dark');
  });
});
