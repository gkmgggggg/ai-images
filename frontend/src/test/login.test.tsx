import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CasePage, CategoriesOut, ImageOut, MetaOut } from '@/api/endpoints';
import { LoginPage } from '@/features/admin/LoginPage';
import { interleave, toColumns } from '@/features/admin/LoginShowcase';
import { ThemeProvider } from '@/lib/theme';

function cover(id: number): ImageOut {
  const variant = { url: `/media/${id}.webp`, width: 360, height: 480 };
  return { id, url: `/media/${id}.jpg`, width: 1080, height: 1440, color: '#222', thumb: variant, medium: variant };
}

const CATEGORIES: CategoriesOut = {
  total: 30,
  with_image: 5,
  items: [
    { id: 1, slug: 'ui', name: 'UI与界面', total: 10, with_image: 3 },
    { id: 2, slug: 'posters', name: '海报与排版', total: 10, with_image: 2 },
    { id: 3, slug: 'empty', name: '没有图', total: 10, with_image: 0 },
  ],
};

const META: MetaOut = {
  total: 668,
  with_image: 336,
  categories: 13,
  search_available: true,
  upstream: { name: 'image-inspirer', url: 'https://github.com/wukongnotnull/image-inspirer', commit: 'abc1234', license: 'Apache-2.0' },
};

function page(ids: number[]): CasePage {
  return { items: ids.map((id) => ({ id, cover: cover(id) })), next_cursor: null } as unknown as CasePage;
}

function json(data: unknown) {
  return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

function renderLogin() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <MemoryRouter initialEntries={['/admin/login']}>
          <LoginPage />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('F10 登录页图片墙 interleave / toColumns', () => {
  it('各分类轮流取一张交错排列，短的分类取完就跳过', () => {
    expect(interleave([[1, 2, 3], [4], [5, 6]])).toEqual([1, 4, 5, 2, 6, 3]);
    expect(interleave([])).toEqual([]);
  });

  it('按列轮流分配，不够时循环补齐到每列最少张数', () => {
    expect(toColumns([1, 2, 3, 4, 5], 2, 1)).toEqual([
      [1, 3, 5],
      [2, 4],
    ]);
    expect(toColumns([1, 2], 2, 3)).toEqual([
      [1, 1, 1],
      [2, 2, 2],
    ]);
    expect(toColumns([], 3, 5)).toEqual([[], [], []]);
  });
});

describe('F10 登录页', () => {
  it('表单字段可按标签找到；图片墙只从有图的分类取图，并显示收录数字', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('/api/v1/categories')) return json(CATEGORIES);
      if (url.startsWith('/api/v1/meta')) return json(META);
      if (url.includes('category=ui')) return json(page([1, 2, 3]));
      if (url.includes('category=posters')) return json(page([4, 5]));
      throw new Error(`意外的请求：${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const { container } = renderLogin();

    expect(screen.getByLabelText('用户名')).toHaveAttribute('autocomplete', 'username');
    expect(screen.getByLabelText('密码')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: '登录' })).toBeEnabled();
    expect(screen.getByRole('link', { name: '返回图库' })).toHaveAttribute('href', '/');

    await waitFor(() => expect(container.querySelectorAll('img').length).toBeGreaterThan(0));
    const requested = fetchMock.mock.calls.map(([input]) => String(input));
    expect(requested.some((url) => url.includes('category=empty'))).toBe(false);
    expect(requested.filter((url) => url.startsWith('/api/v1/cases')).every((url) => url.includes('has_image=true'))).toBe(true);
    // 图片墙是纯装饰：图片没有替代文字，整块对读屏隐藏
    for (const img of container.querySelectorAll('img')) {
      expect(img).toHaveAttribute('alt', '');
      expect(img.closest('[aria-hidden="true"]')).not.toBeNull();
    }
    expect(await screen.findByText('668')).toBeInTheDocument();
    expect(screen.getByText('有图案例')).toBeInTheDocument();
  });

  it('取图失败时图片墙留空，表单照常可用', async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    vi.stubGlobal('fetch', fetchMock);
    const { container } = renderLogin();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container.querySelectorAll('img')).toHaveLength(0);
    expect(screen.getByLabelText('用户名')).toBeEnabled();
    expect(screen.getByRole('button', { name: '登录' })).toBeEnabled();
  });
});
