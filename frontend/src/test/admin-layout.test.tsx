import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminLayout } from '@/features/admin/AdminLayout';
import { readSidebarCollapsed, SIDEBAR_STORAGE_KEY } from '@/features/admin/useSidebarCollapsed';
import { ThemeProvider } from '@/lib/theme';

function json(data: unknown) {
  return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

function renderAdmin() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <MemoryRouter initialEntries={['/admin/cases']}>
          <Routes>
            <Route path="/admin" element={<AdminLayout />}>
              <Route path="cases" element={<p>案例列表</p>} />
            </Route>
            <Route path="/admin/login" element={<p>登录页</p>} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

/** 宽屏侧栏底部的账号按钮（窄屏顶栏的头像按钮排在前面） */
async function sidebarAccountButton() {
  const buttons = await screen.findAllByRole('button', { name: '账号菜单：admin' });
  return buttons[buttons.length - 1];
}

const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
  const url = String(input);
  if (url === '/api/v1/auth/me') return json({ id: 1, username: 'admin' });
  if (url === '/api/v1/auth/logout') return new Response(null, { status: 204 });
  throw new Error(`意外的请求：${url}`);
});

beforeEach(() => {
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('F10 F13 后台账号菜单（规格 0003）', () => {
  it('AC-1 侧栏不再直接放主题切换和「查看前台」', async () => {
    renderAdmin();
    await sidebarAccountButton();
    expect(screen.queryByRole('radiogroup', { name: '主题' })).toBeNull();
    expect(screen.queryByRole('link', { name: /查看前台/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /退出/ })).toBeNull();
  });

  it('AC-2 菜单里有查看前台、主题、退出登录；切换主题不关菜单，Esc 关闭后焦点回到按钮', async () => {
    const user = userEvent.setup();
    renderAdmin();
    const trigger = await sidebarAccountButton();
    await user.click(trigger);

    const menu = screen.getByRole('dialog', { name: '账号菜单' });
    const front = within(menu).getByRole('link', { name: '查看前台' });
    expect(front).toHaveAttribute('href', '/');
    expect(front).toHaveAttribute('target', '_blank');
    expect(within(menu).getByRole('button', { name: '退出登录' })).toBeInTheDocument();

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    await user.click(within(menu).getByRole('radio', { name: '浅色' }));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(within(menu).getByRole('radio', { name: '浅色' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('dialog', { name: '账号菜单' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: '账号菜单' })).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('AC-2 点「退出登录」调用退出接口并回到登录页', async () => {
    const user = userEvent.setup();
    renderAdmin();
    await user.click(await sidebarAccountButton());
    await user.click(screen.getByRole('button', { name: '退出登录' }));
    expect(await screen.findByText('登录页')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/auth/logout', expect.objectContaining({ method: 'POST' }));
  });
});

describe('F10 后台侧栏收起（规格 0003）', () => {
  it('AC-3 AC-4 收起后按钮变为「展开侧栏」，导航名称与当前页高亮不变，文字只对读屏保留', async () => {
    const user = userEvent.setup();
    renderAdmin();
    await user.click(await screen.findByRole('button', { name: '收起侧栏' }));

    expect(screen.getByRole('button', { name: '展开侧栏' })).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: '后台导航' });
    for (const name of ['案例', '分类', '标签', '导入与索引']) {
      const link = within(nav).getByRole('link', { name });
      // 收起时文字只在宽屏隐藏（md:sr-only），悬停提示对读屏隐藏
      expect(within(link).getByText(name, { selector: '.md\\:sr-only' })).toBeInTheDocument();
      expect(within(link).getByText(name, { selector: '[aria-hidden="true"]' })).toBeInTheDocument();
    }
    expect(within(nav).getByRole('link', { name: '案例' })).toHaveAttribute('aria-current', 'page');

    await user.click(screen.getByRole('button', { name: '展开侧栏' }));
    expect(screen.getByRole('button', { name: '收起侧栏' })).toBeInTheDocument();
    expect(within(nav).queryByText('案例', { selector: '[aria-hidden="true"]' })).toBeNull();
  });

  it('AC-5 收起状态写入 localStorage，重新进入后保持', async () => {
    const user = userEvent.setup();
    const { unmount } = renderAdmin();
    await user.click(await screen.findByRole('button', { name: '收起侧栏' }));
    expect(localStorage.getItem(SIDEBAR_STORAGE_KEY)).toBe('collapsed');
    unmount();

    renderAdmin();
    expect(await screen.findByRole('button', { name: '展开侧栏' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '展开侧栏' }));
    expect(localStorage.getItem(SIDEBAR_STORAGE_KEY)).toBe('expanded');
  });

  it('AC-5 值不合法或读取失败时按展开处理', async () => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, 'weird');
    expect(readSidebarCollapsed()).toBe(false);
    renderAdmin();
    expect(await screen.findByRole('button', { name: '收起侧栏' })).toBeInTheDocument();

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(readSidebarCollapsed()).toBe(false);
  });
});
