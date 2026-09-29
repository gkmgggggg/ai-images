import { useEffect, useMemo, useState } from 'react';

import type { CaseSummary } from '@/api/endpoints';
import { useElementWidth } from '@/lib/hooks';

import { CaseCard } from './CaseCard';
import { columnsFor, computeMasonryLayout, gapFor, type MasonryBox } from './masonry';
import { useWindowRange } from './useWindowRange';

interface MasonryGridProps {
  items: CaseSummary[];
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  showInfo: boolean;
}

const NO_BOXES: MasonryBox[] = [];

/** 瀑布流：按缩略图宽高排版，只渲染视口附近的卡片，接近底部时加载下一页。 */
export function MasonryGrid({ items, hasMore, loadingMore, onLoadMore, showInfo }: MasonryGridProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const width = useElementWidth(container);
  const gap = gapFor(width);
  const columns = columnsFor(width, gap);
  const layout = useMemo(
    () => (width ? computeMasonryLayout(items.map((item) => item.cover?.thumb), columns, width, gap) : null),
    [items, columns, width, gap],
  );
  const boxes = layout?.boxes ?? NO_BOXES;
  const { indexes, nearEnd } = useWindowRange(container, boxes, layout?.height ?? 0);

  useEffect(() => {
    if (nearEnd && hasMore && !loadingMore) onLoadMore();
  }, [nearEnd, hasMore, loadingMore, onLoadMore]);

  return (
    <>
      <div ref={setContainer} className="relative w-full" style={{ height: layout?.height ?? 0 }}>
        {indexes.map((index) =>
          items[index] ? (
            <CaseCard key={items[index].id} item={items[index]} box={boxes[index]} eager={index < 8} showInfo={showInfo} />
          ) : null,
        )}
      </div>
      {loadingMore && (
        <div className="grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap, marginTop: gap }} aria-label="正在加载更多">
          {Array.from({ length: columns }, (_, i) => (
            <div key={i} className="skeleton h-48 rounded-card" />
          ))}
        </div>
      )}
    </>
  );
}

const SKELETON_HEIGHTS = [280, 200, 340, 240, 300, 220, 260, 320, 210, 290, 250, 330];

/** 首屏骨架：高度错落，贴近瀑布流的样子。 */
export function GridSkeleton() {
  return (
    <div className="columns-2 gap-1 sm:columns-4 sm:gap-1.5 lg:columns-6" aria-label="加载中">
      {SKELETON_HEIGHTS.map((height, i) => (
        <div key={i} className="skeleton mb-1 break-inside-avoid rounded-card sm:mb-1.5" style={{ height }} />
      ))}
    </div>
  );
}
