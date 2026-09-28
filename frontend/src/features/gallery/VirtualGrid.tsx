import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useLayoutEffect, useState } from 'react';

import type { CaseSummary } from '@/api/endpoints';
import { useElementWidth } from '@/lib/hooks';

import { CARD_BODY_HEIGHT, CaseCard, CaseCardSkeleton } from './CaseCard';

const GAP = 16;

export function columnsFor(width: number): number {
  if (width >= 1180) return 4;
  if (width >= 840) return 3;
  if (width >= 340) return 2;
  return 1;
}

/** 容器顶部相对文档的位置；上方筛选区高度变化时需要同步给虚拟列表。 */
function useDocumentTop(element: HTMLElement | null): number {
  const [top, setTop] = useState(0);
  useLayoutEffect(() => {
    if (!element) return;
    const measure = () => {
      const next = Math.round(element.getBoundingClientRect().top + window.scrollY);
      setTop((current) => (current === next ? current : next));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    return () => observer.disconnect();
  }, [element]);
  return top;
}

interface VirtualGridProps {
  items: CaseSummary[];
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}

/** 按行虚拟化的网格：只渲染视口附近的行，滚动接近底部时加载下一页。 */
export function VirtualGrid({ items, hasMore, loadingMore, onLoadMore }: VirtualGridProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const width = useElementWidth(container);
  const scrollMargin = useDocumentTop(container);
  const columns = columnsFor(width || 1024);
  const cardWidth = width ? (width - GAP * (columns - 1)) / columns : 280;
  const rowHeight = Math.round(cardWidth * 1.25 + CARD_BODY_HEIGHT + 2 + GAP);
  const rowCount = Math.ceil(items.length / columns) + (hasMore ? 1 : 0);

  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => rowHeight,
    overscan: 3,
    scrollMargin,
  });

  useEffect(() => {
    virtualizer.measure();
  }, [rowHeight, columns, virtualizer]);

  const virtualRows = virtualizer.getVirtualItems();
  const lastRow = virtualRows.at(-1)?.index ?? 0;

  useEffect(() => {
    if (hasMore && !loadingMore && lastRow >= rowCount - 2) onLoadMore();
  }, [hasMore, loadingMore, lastRow, rowCount, onLoadMore]);

  return (
    <div ref={setContainer} className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
      {virtualRows.map((row) => {
        const start = row.index * columns;
        const rowItems = items.slice(start, start + columns);
        const isLoaderRow = start >= items.length;
        return (
          <div
            key={row.key}
            className="absolute top-0 left-0 grid w-full"
            style={{
              transform: `translateY(${row.start - scrollMargin}px)`,
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              gap: GAP,
              height: rowHeight - GAP,
            }}
          >
            {isLoaderRow
              ? Array.from({ length: columns }, (_, i) => <CaseCardSkeleton key={i} />)
              : rowItems.map((item, index) => <CaseCard key={item.id} item={item} eager={start + index < 8} />)}
          </div>
        );
      })}
    </div>
  );
}

export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4" aria-label="加载中">
      {Array.from({ length: count }, (_, i) => (
        <CaseCardSkeleton key={i} />
      ))}
    </div>
  );
}
