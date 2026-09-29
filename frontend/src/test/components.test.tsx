import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import type { CaseDetail } from '@/api/endpoints';
import { Highlighted, stripMarks } from '@/components/Highlighted';
import { JsonText, PromptBlock, usePrompt } from '@/features/case-detail/PromptBlock';
import { useGalleryParams } from '@/features/gallery/useGalleryParams';

vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

describe('F03 Highlighted 高亮渲染', () => {
  it('把 \\u0002…\\u0003 包裹的命中词渲染成 mark，且不解析 HTML', () => {
    const { container } = render(<Highlighted text={'<b>x</b> \u0002赛博朋克\u0003 风格'} />);
    expect(container.querySelector('mark')?.textContent).toBe('赛博朋克');
    expect(container.querySelector('b')).toBeNull();
    expect(container.textContent).toBe('<b>x</b> 赛博朋克 风格');
  });

  it('stripMarks 去掉标记', () => {
    expect(stripMarks('\u0002a\u0003b')).toBe('ab');
  });
});

describe('F05 JsonText JSON 着色', () => {
  it('格式化并给键、字符串着色', () => {
    const { container } = render(<JsonText text='{"type":"poster","size":3,"ok":true}' />);
    expect(container.textContent).toContain('"type": "poster"');
    expect(container.querySelectorAll('span').length).toBeGreaterThanOrEqual(5);
  });

  it('非法 JSON 原样输出', () => {
    const { container } = render(<JsonText text="{oops" />);
    expect(container.textContent).toBe('{oops');
  });
});

function ParamsProbe() {
  const { filters } = useGalleryParams();
  return <pre data-testid="filters">{JSON.stringify(filters)}</pre>;
}

describe('F04 useGalleryParams URL 状态', () => {
  it('从 URL 解析筛选条件，非法 tag 被忽略', () => {
    render(
      <MemoryRouter initialEntries={['/?c=posters&q=%20猫%20&tag=abc&all=1']}>
        <ParamsProbe />
      </MemoryRouter>,
    );
    expect(JSON.parse(screen.getByTestId('filters').textContent!)).toEqual({
      category: 'posters',
      q: '猫',
      hasImage: false,
    });
  });
});

const detail: CaseDetail = {
  id: 1,
  title: '双语案例',
  category: { id: 1, slug: 'posters', name: '海报与排版' },
  source_text: '',
  source_url: null,
  prompt: '[中文]\n一只猫\n[English]\nA cat',
  prompt_zh: '一只猫',
  prompt_en: 'A cat',
  prompt_format: 'text',
  images: [],
  tags: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

function PromptHarness({ item }: { item: CaseDetail }) {
  return <PromptBlock prompt={usePrompt(item)} />;
}

describe('F05 F06 PromptBlock 语言切换与复制', () => {
  it('双语提示词可以切换语言，并复制当前语言', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    render(<PromptHarness item={detail} />);
    expect(screen.getByRole('tab', { name: '中文' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('一只猫')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'English' }));
    expect(screen.getByText('A cat')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /复制English/ }));
    expect(writeText).toHaveBeenCalledWith('A cat');

    // 原文和中英文都不同，额外提供「原文」
    expect(screen.getByRole('tab', { name: '原文' })).toBeInTheDocument();
  });
});
