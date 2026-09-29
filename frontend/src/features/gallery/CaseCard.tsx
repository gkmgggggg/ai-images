import { ImageOff } from 'lucide-react';
import { memo, useState, type CSSProperties } from 'react';
import { Link, useLocation } from 'react-router';

import type { CaseSummary } from '@/api/endpoints';
import { Highlighted } from '@/components/Highlighted';
import { cn } from '@/lib/utils';

import type { MasonryBox } from './masonry';

interface CaseCardProps {
  item: CaseSummary;
  box: MasonryBox;
  eager: boolean;
  /** 有搜索词时常显标题与摘要（F01、F03），否则悬停或聚焦时显示。 */
  showInfo: boolean;
}

/** 瀑布流中的一张卡片：以图片为主，分类、标题、摘要叠在底部渐变层上。 */
export const CaseCard = memo(function CaseCard({ item, box, eager, showInfo }: CaseCardProps) {
  const location = useLocation();
  const [loaded, setLoaded] = useState(false);
  const cover = item.cover;
  const hoverOnly = !showInfo;

  return (
    <Link
      to={`/cases/${item.id}`}
      state={{ background: location }}
      aria-label={`打开案例 ${item.id}：${item.title}`}
      data-info={showInfo ? 'always' : 'hover'}
      className="group absolute block outline-none hover:z-10 focus-visible:z-10"
      style={{ left: box.left, top: box.top, width: box.width, height: box.height, '--c': cover?.color ?? '#888' } as CSSProperties}
    >
      <div
        className="card-glow relative size-full overflow-hidden rounded-card group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-accent"
        style={{ backgroundColor: cover?.color ?? undefined }}
      >
        {cover ? (
          <img
            src={cover.thumb.url}
            width={cover.thumb.width}
            height={cover.thumb.height}
            alt={item.title}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={eager ? 'high' : 'auto'}
            onLoad={() => setLoaded(true)}
            className={cn(
              'absolute inset-0 size-full object-cover object-top transition-[opacity,transform] duration-700 ease-out group-hover:scale-[1.035]',
              loaded ? 'opacity-100' : 'opacity-0',
            )}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-surface-2 text-xs text-muted">
            <span className="flex flex-col items-center gap-1.5">
              <ImageOff className="size-5" /> 暂无图片
            </span>
          </div>
        )}
        <div
          className={cn(
            'card-scrim pointer-events-none absolute inset-x-0 bottom-0 px-3.5 pt-12 pb-3.5 text-white transition-[opacity,transform] duration-300',
            hoverOnly &&
              'translate-y-1.5 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 touch:translate-y-0 touch:px-2.5 touch:pt-8 touch:pb-2 touch:opacity-100',
          )}
        >
          <span className={cn('font-label text-[11px] font-semibold tracking-[.16em] text-[#f5c46e]', hoverOnly && 'touch:hidden')}>
            {item.category.name}
          </span>
          <h2 className={cn('mt-0.5 line-clamp-2 text-[15px] leading-snug font-semibold', hoverOnly && 'touch:line-clamp-1 touch:text-xs')}>
            <Highlighted text={item.highlight?.title ?? item.title} />
          </h2>
          <p className={cn('mt-1 line-clamp-2 text-xs leading-relaxed text-white/75', hoverOnly && 'touch:hidden')}>
            <Highlighted text={item.highlight?.excerpt ?? item.excerpt} />
          </p>
        </div>
      </div>
    </Link>
  );
});
