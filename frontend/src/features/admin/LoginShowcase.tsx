import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { publicApi, type ImageOut } from '@/api/endpoints';
import { cn } from '@/lib/utils';

const COLUMNS = 5;
const MIN_PER_COLUMN = 5;
const SAMPLE_CATEGORIES = 6;
const PER_CATEGORY = 4;
/** 各列滚完一轮的秒数，错开速度，看起来不那么机械 */
const DURATIONS = [96, 120, 108, 132, 114];

/** 各组轮流取一个交错排列，避免同一分类的图扎堆。 */
export function interleave<T>(groups: T[][]): T[] {
  const result: T[] = [];
  const longest = Math.max(0, ...groups.map((group) => group.length));
  for (let i = 0; i < longest; i++) {
    for (const group of groups) if (i < group.length) result.push(group[i]);
  }
  return result;
}

/** 按列轮流分配；数量不够时循环补齐到每列至少 minPerColumn 个，保证滚动时不露底。 */
export function toColumns<T>(items: T[], columns: number, minPerColumn: number): T[][] {
  const result: T[][] = Array.from({ length: columns }, () => []);
  if (items.length === 0) return result;
  const count = Math.max(items.length, columns * minPerColumn);
  for (let i = 0; i < count; i++) result[i % columns].push(items[i % items.length]);
  return result;
}

/** 从有图最多的几个分类里各取几张封面，交错成一组。 */
async function loadShowcase(signal: AbortSignal): Promise<ImageOut[]> {
  const { items } = await publicApi.categories(undefined, undefined, signal);
  const picked = items
    .filter((category) => category.with_image > 0)
    .sort((a, b) => b.with_image - a.with_image)
    .slice(0, SAMPLE_CATEGORIES);
  const pages = await Promise.allSettled(picked.map((category) => publicApi.categorySample(category.slug, PER_CATEGORY, signal)));
  return interleave(
    pages.map((page) => (page.status === 'fulfilled' ? page.value.items.flatMap((item) => (item.cover ? [item.cover] : [])) : [])),
  );
}

/**
 * 登录页的图片墙：图库里的真实作品排成倾斜的几列，相邻两列反向缓慢滚动。
 * 纯装饰，对读屏隐藏；取图失败时什么也不画，只剩背景。
 */
export function LoginShowcase() {
  const showcase = useQuery({
    queryKey: ['login-showcase'],
    queryFn: ({ signal }) => loadShowcase(signal),
    staleTime: Infinity,
    retry: false,
  });
  const columns = toColumns(showcase.data ?? [], COLUMNS, MIN_PER_COLUMN);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -inset-x-[20%] -inset-y-[30%] flex -rotate-[9deg] gap-3">
        {columns.map((column, index) => (
          <div key={index} className="min-w-0 flex-1">
            {/* 内容重复两遍，滚动半程正好接上；pb-3 补上两段之间的间距 */}
            <div
              className="wall-scroll flex flex-col gap-3 pb-3"
              style={{ animationDuration: `${DURATIONS[index % DURATIONS.length]}s`, animationDirection: index % 2 ? 'reverse' : 'normal' }}
            >
              {[...column, ...column].map((image, i) => (
                <WallImage key={i} image={image} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WallImage({ image }: { image: ImageOut }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div
      className="relative overflow-hidden rounded-card"
      style={{ aspectRatio: `${image.thumb.width} / ${image.thumb.height}`, backgroundColor: image.color }}
    >
      <img
        src={image.thumb.url}
        alt=""
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={cn('absolute inset-0 size-full object-cover transition-opacity duration-700', loaded ? 'opacity-100' : 'opacity-0')}
      />
    </div>
  );
}
