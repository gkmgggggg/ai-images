import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import type { CategoriesOut, CaseSummary, GalleryFilters, MetaOut, TagCount } from '@/api/endpoints';
import { CaseCard } from '@/features/gallery/CaseCard';
import { GalleryHeader } from '@/features/gallery/GalleryHeader';
import { columnsFor, computeMasonryLayout, gapFor } from '@/features/gallery/masonry';
import { ResultBar } from '@/features/gallery/ResultBar';
import { useGalleryParams } from '@/features/gallery/useGalleryParams';
import { ThemeProvider } from '@/lib/theme';

const TAGS: TagCount[] = [
  { id: 1, name: '3:4', kind: 'ratio', count: 108 },
  { id: 2, name: '写实', kind: 'style', count: 50 },
];

const CATEGORIES: CategoriesOut = {
  total: 668,
  with_image: 348,
  items: [
    { id: 1, slug: 'posters', name: '海报与排版', total: 91, with_image: 56 },
    { id: 2, slug: 'ui', name: 'UI与界面', total: 122, with_image: 58 },
  ],
};

const META: MetaOut = {
  total: 668,
  with_image: 348,
  categories: 13,
  search_available: true,
  upstream: { name: 'image-inspirer', url: 'https://github.com/wukongnotnull/image-inspirer', commit: 'abc1234', license: 'Apache-2.0' },
};

describe('F01 computeMasonryLayout 瀑布流布局', () => {
  it('每张卡片放进当前最短的一列，高度相同时取最左，没有封面按 4:5 占位', () => {
    // 两列、容器 206 px、间距 6 px → 列宽 100 px
    const { boxes, height } = computeMasonryLayout(
      [{ width: 100, height: 100 }, { width: 100, height: 200 }, { width: 100, height: 50 }, null],
      2,
      206,
      6,
    );
    expect(boxes).toEqual([
      { left: 0, top: 0, width: 100, height: 100 },
      { left: 106, top: 0, width: 100, height: 200 },
      { left: 0, top: 106, width: 100, height: 50 },
      { left: 0, top: 162, width: 100, height: 125 },
    ]);
    expect(height).toBe(287);
  });

  it('高宽比限制在 0.5–2 之间', () => {
    const { boxes } = computeMasonryLayout([{ width: 100, height: 1000 }, { width: 1000, height: 100 }], 2, 206, 6);
    expect(boxes.map((b) => b.height)).toEqual([200, 50]);
  });

  it('追加下一页时，已有卡片的位置和尺寸不变', () => {
    const sizes = Array.from({ length: 48 }, (_, i) => ({ width: 480, height: 300 + ((i * 97) % 700) }));
    const firstPage = computeMasonryLayout(sizes.slice(0, 24), 5, 1200, 6);
    const twoPages = computeMasonryLayout(sizes, 5, 1200, 6);
    expect(twoPages.boxes.slice(0, 24)).toEqual(firstPage.boxes);
  });
});

describe('F01 columnsFor 瀑布流列数', () => {
  it('320 px 与 375 px 视口为 2 列，内容区 1416 px 为 6 列，列数在 2–6 之间', () => {
    expect(columnsFor(296)).toBe(2);
    expect(columnsFor(351)).toBe(2);
    expect(columnsFor(900)).toBe(4);
    expect(columnsFor(1416)).toBe(6);
    expect(columnsFor(3000)).toBe(6);
    expect(columnsFor(100)).toBe(2);
  });

  it('内容区宽度 ≥ 576 px 时间距 6 px，否则 4 px', () => {
    expect(gapFor(575)).toBe(4);
    expect(gapFor(576)).toBe(6);
  });
});

const summary: CaseSummary = {
  id: 7,
  title: '赛博朋克海报',
  category: { id: 1, slug: 'posters', name: '海报与排版' },
  source: '',
  excerpt: '霓虹雨夜的赛博朋克街景',
  cover: {
    id: 1,
    url: '/media/a.webp',
    width: 900,
    height: 1200,
    color: '#223344',
    thumb: { url: '/media/a-480.webp', width: 480, height: 640 },
    medium: { url: '/media/a-1080.webp', width: 1080, height: 1440 },
  },
  tags: [],
  highlight: { title: '\u0002赛博朋克\u0003海报', excerpt: '霓虹雨夜的\u0002赛博朋克\u0003街景' },
} as CaseSummary;

const box = { left: 0, top: 0, width: 200, height: 266 };

describe('F01 F03 CaseCard 卡片信息层', () => {
  it('有搜索词时常显标题与摘要，命中词高亮', () => {
    render(
      <MemoryRouter>
        <CaseCard item={summary} box={box} eager showInfo />
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: '打开案例 7：赛博朋克海报' });
    expect(link).toHaveAttribute('data-info', 'always');
    expect(within(link).getAllByText('赛博朋克')[0].tagName).toBe('MARK');
    expect(within(link).getByText('海报与排版')).toBeInTheDocument();
  });

  it('没有搜索词时信息层只在悬停或聚焦时显示', () => {
    render(
      <MemoryRouter>
        <CaseCard item={{ ...summary, highlight: null }} box={box} eager={false} showInfo={false} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link')).toHaveAttribute('data-info', 'hover');
    expect(screen.getByRole('img', { name: '赛博朋克海报' })).toHaveAttribute('loading', 'lazy');
  });
});

function HeaderHarness() {
  const { filters, update } = useGalleryParams();
  const location = useLocation();
  const [keyword, setKeyword] = useState('');
  return (
    <ThemeProvider>
      <GalleryHeader
        keyword={keyword}
        onKeywordChange={setKeyword}
        onHome={() => {}}
        onRandom={() => {}}
        filters={filters}
        onUpdate={update}
        categories={CATEGORIES}
        tags={TAGS}
      />
      <output data-testid="search">{location.search}</output>
    </ThemeProvider>
  );
}

function renderHeader() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <HeaderHarness />
    </MemoryRouter>,
  );
}

describe('F02 F12 筛选面板', () => {
  it('选标签、关闭仅有图会写入 URL 并显示条件数，Esc 关闭后焦点回到筛选按钮', async () => {
    const user = userEvent.setup();
    renderHeader();
    const trigger = screen.getByRole('button', { name: /^筛选/ });
    await user.click(trigger);
    const panel = screen.getByRole('dialog', { name: '筛选' });

    await user.click(within(panel).getByRole('button', { name: /写实/ }));
    expect(screen.getByTestId('search').textContent).toContain('tag=2');
    expect(screen.getByRole('button', { name: /^筛选\s*1$/ })).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: /写实/ })).toHaveAttribute('aria-pressed', 'true');

    await user.click(within(panel).getByRole('switch', { name: /仅显示有图案例/ }));
    expect(screen.getByTestId('search').textContent).toContain('all=1');
    expect(screen.getByRole('button', { name: /^筛选\s*2$/ })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: '筛选' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^筛选/ })).toHaveFocus();
  });

  it('分类按钮写入 URL 并带计数', async () => {
    const user = userEvent.setup();
    renderHeader();
    const nav = screen.getByRole('navigation', { name: '分类' });
    expect(within(nav).getByRole('button', { name: /^全部/ })).toHaveAttribute('aria-pressed', 'true');
    await user.click(within(nav).getByRole('button', { name: /海报与排版\s*56/ }));
    expect(screen.getByTestId('search').textContent).toContain('c=posters');
  });
});

describe('F03 按 / 聚焦搜索框', () => {
  it('焦点不在输入框时按 / 聚焦搜索框；在输入框里按 / 正常输入', async () => {
    const user = userEvent.setup();
    renderHeader();
    const input = screen.getByRole('textbox', { name: '搜索' });
    expect(input).not.toHaveFocus();
    await user.keyboard('/');
    expect(input).toHaveFocus();
    expect(input).toHaveValue('');
    await user.keyboard('/');
    expect(input).toHaveValue('/');
  });
});

const baseFilters: GalleryFilters = { category: 'posters', tag: 2, q: '猫', hasImage: false };

describe('F02 F12 ResultBar 已选条件', () => {
  it('分类、标签、含无图案例显示为可移除的条件，并可一键清除', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    const onClear = vi.fn();
    render(
      <ResultBar
        total={1234}
        degraded
        filters={baseFilters}
        categories={CATEGORIES}
        tags={TAGS}
        meta={META}
        onUpdate={onUpdate}
        onClear={onClear}
      />,
    );
    expect(screen.getByText('1,234 个结果')).toBeInTheDocument();
    expect(screen.getByText(/搜索服务暂不可用/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '移除条件：海报与排版' }));
    expect(onUpdate).toHaveBeenLastCalledWith({ category: undefined });
    await user.click(screen.getByRole('button', { name: '移除条件：写实' }));
    expect(onUpdate).toHaveBeenLastCalledWith({ tag: undefined });
    await user.click(screen.getByRole('button', { name: '移除条件：含无图案例' }));
    expect(onUpdate).toHaveBeenLastCalledWith({ hasImage: true });
    await user.click(screen.getByRole('button', { name: '清除筛选' }));
    expect(onClear).toHaveBeenCalled();
  });
});

describe('N08 结果栏显示素材来源与许可', () => {
  it('元信息未加载时也显示 image-inspirer 链接与 Apache-2.0', () => {
    render(
      <ResultBar
        total={undefined}
        degraded={false}
        filters={{ hasImage: true }}
        categories={undefined}
        tags={undefined}
        meta={undefined}
        onUpdate={() => {}}
        onClear={() => {}}
      />,
    );
    expect(screen.getByRole('link', { name: 'image-inspirer' })).toHaveAttribute('href', 'https://github.com/wukongnotnull/image-inspirer');
    expect(screen.getByText(/Apache-2\.0/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '清除筛选' })).not.toBeInTheDocument();
  });
});
