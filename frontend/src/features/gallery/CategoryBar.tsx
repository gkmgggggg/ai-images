import { useEffect, useRef } from 'react';

import type { CategoriesOut } from '@/api/endpoints';
import { Chip } from '@/components/ui/chip';
import { cn, formatNumber } from '@/lib/utils';

interface CategoryBarProps {
  data: CategoriesOut | undefined;
  active: string | undefined;
  hasImage: boolean;
  onSelect: (slug: string | undefined) => void;
}

/**
 * 分类栏；计数随「仅有图」开关与搜索词联动（F02）。
 * 宽屏（≥ 640 px）换行显示全部分类；窄屏单行横向滑动，右侧渐隐提示还有更多。
 */
export function CategoryBar({ data, active, hasImage, onSelect }: CategoryBarProps) {
  const navRef = useRef<HTMLElement>(null);
  const count = (item: { total: number; with_image: number }) => (hasImage ? item.with_image : item.total);

  // 窄屏从分享链接进入时，把选中的分类滚进可见区域
  useEffect(() => {
    const nav = navRef.current;
    const chip = nav?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!nav || !chip || nav.scrollWidth <= nav.clientWidth) return;
    const outside = chip.offsetLeft < nav.scrollLeft || chip.offsetLeft + chip.offsetWidth > nav.scrollLeft + nav.clientWidth;
    // 只滚动分类栏自身，不带动整页
    if (outside) nav.scrollLeft = chip.offsetLeft - 12;
  }, [active, data]);

  return (
    <nav
      ref={navRef}
      aria-label="分类"
      className="scroll-fade-x relative flex h-full min-w-0 flex-1 items-center gap-0.5 overflow-x-auto pr-10 sm:h-auto sm:flex-wrap sm:gap-y-1 sm:overflow-visible sm:pr-0 sm:[-webkit-mask-image:none] sm:[mask-image:none]"
    >
      <Chip active={!active} onClick={() => onSelect(undefined)} count={data ? formatNumber(count(data)) : '·'}>
        全部
      </Chip>
      {data?.items.map((item) => (
        <Chip
          key={item.slug}
          active={active === item.slug}
          onClick={() => onSelect(item.slug)}
          count={formatNumber(count(item))}
          className={cn(count(item) === 0 && active !== item.slug && 'opacity-50')}
        >
          {item.name}
        </Chip>
      ))}
    </nav>
  );
}
