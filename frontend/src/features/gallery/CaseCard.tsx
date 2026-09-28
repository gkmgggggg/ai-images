import { ImageOff } from 'lucide-react';
import { memo, useState } from 'react';
import { Link, useLocation } from 'react-router';

import type { CaseSummary } from '@/api/endpoints';
import { Highlighted } from '@/components/Highlighted';
import { cn } from '@/lib/utils';

export const CARD_BODY_HEIGHT = 124;

export const CaseCard = memo(function CaseCard({ item, eager }: { item: CaseSummary; eager: boolean }) {
  const location = useLocation();
  const [loaded, setLoaded] = useState(false);
  const cover = item.cover;

  return (
    <Link
      to={`/cases/${item.id}`}
      state={{ background: location }}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-ink bg-panel transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-hard focus-visible:shadow-hard"
      aria-label={`打开案例 ${item.id}：${item.title}`}
    >
      <div
        className="relative aspect-[4/5] overflow-hidden border-b border-ink"
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
              'size-full object-cover transition-[opacity,transform] duration-500 group-hover:scale-[1.03]',
              loaded ? 'opacity-100' : 'opacity-0',
            )}
          />
        ) : (
          <div className="grid size-full place-items-center bg-paper text-sm text-muted">
            <span className="flex items-center gap-2">
              <ImageOff className="size-5" /> 暂无图片
            </span>
          </div>
        )}
        {item.tags.length > 0 && (
          <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
            {item.tags.slice(0, 3).map((tag) => (
              <span key={tag.id} className="rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1.5 p-3.5" style={{ height: CARD_BODY_HEIGHT }}>
        <span className="text-xs font-semibold text-muted">{item.category.name}</span>
        <h2 className="line-clamp-1 text-[15px] leading-snug font-bold">
          <Highlighted text={item.highlight?.title ?? item.title} />
        </h2>
        <p className="line-clamp-2 text-[13px] leading-relaxed text-muted">
          <Highlighted text={item.highlight?.excerpt ?? item.excerpt} />
        </p>
      </div>
    </Link>
  );
});

export function CaseCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-line bg-panel" aria-hidden>
      <div className="skeleton aspect-[4/5]" />
      <div className="flex flex-col gap-2 p-3.5" style={{ height: CARD_BODY_HEIGHT }}>
        <div className="skeleton h-3 w-16 rounded" />
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-3 w-full rounded" />
      </div>
    </div>
  );
}
