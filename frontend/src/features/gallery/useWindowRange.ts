import { useLayoutEffect, useState } from 'react';

import type { MasonryBox } from './masonry';

/** 视口上下各额外渲染半屏，兼顾滚动流畅与 DOM 数量（规格 0002 AC-4：少于 60 张）。 */
const OVERSCAN_SCREENS = 0.5;

interface WindowRange {
  /** 与视口（含预渲染区）相交的卡片下标，按顺序排列。 */
  indexes: number[];
  /** 视口底部距列表底部不足一屏，应加载下一页。 */
  nearEnd: boolean;
}

function sameIndexes(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((value, i) => value === b[i]);
}

/** 窗口化：监听页面滚动与尺寸变化（requestAnimationFrame 节流），算出需要渲染的卡片。 */
export function useWindowRange(container: HTMLElement | null, boxes: MasonryBox[], totalHeight: number): WindowRange {
  const [range, setRange] = useState<WindowRange>({ indexes: [], nearEnd: false });

  useLayoutEffect(() => {
    if (!container) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const viewport = window.innerHeight;
      const viewTop = -container.getBoundingClientRect().top;
      const top = viewTop - viewport * OVERSCAN_SCREENS;
      const bottom = viewTop + viewport * (1 + OVERSCAN_SCREENS);
      const indexes: number[] = [];
      boxes.forEach((box, i) => {
        if (box.top < bottom && box.top + box.height > top) indexes.push(i);
      });
      const nearEnd = viewTop + viewport * 2 >= totalHeight;
      setRange((current) =>
        current.nearEnd === nearEnd && sameIndexes(current.indexes, indexes) ? current : { indexes, nearEnd },
      );
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [container, boxes, totalHeight]);

  return range;
}
