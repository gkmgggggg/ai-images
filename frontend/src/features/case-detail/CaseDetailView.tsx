import { ArrowUpRight, ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import { useState } from 'react';

import type { CaseDetail } from '@/api/endpoints';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { PromptBlock } from './PromptBlock';

interface Props {
  item: CaseDetail;
  prevId: number | null;
  nextId: number | null;
  onNavigate: (id: number) => void;
  titleAs?: 'h1' | 'h2';
}

export function CaseDetailView({ item, prevId, nextId, onNavigate, titleAs: Title = 'h2' }: Props) {
  const [imageIndex, setImageIndex] = useState(0);
  const image = item.images[imageIndex] ?? item.images[0];

  return (
    <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] overflow-y-auto md:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] md:grid-rows-1 md:overflow-hidden">
      <div
        className="relative flex min-h-[40vh] flex-col items-center justify-center gap-3 bg-paper p-4 md:min-h-0 md:border-r md:border-ink"
        style={{ backgroundColor: image?.color }}
      >
        {image ? (
          <a href={image.url} target="_blank" rel="noreferrer" className="flex min-h-0 flex-1 items-center justify-center" title="查看原图">
            <img
              key={image.id}
              src={image.medium.url}
              srcSet={`${image.medium.url} ${image.medium.width}w, ${image.url} ${image.width}w`}
              sizes="(min-width: 768px) 55vw, 100vw"
              width={image.medium.width}
              height={image.medium.height}
              alt={item.title}
              className="max-h-[70vh] w-auto rounded-lg object-contain shadow-2xl md:max-h-full"
            />
          </a>
        ) : (
          <div className="flex items-center gap-2 text-muted">
            <ImageOff className="size-6" /> 这个案例暂未包含图片
          </div>
        )}
        {item.images.length > 1 && (
          <div className="flex gap-2" role="group" aria-label="切换图片">
            {item.images.map((img, index) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setImageIndex(index)}
                aria-label={`第 ${index + 1} 张图`}
                aria-pressed={index === imageIndex}
                className={cn('size-12 overflow-hidden rounded-md border-2', index === imageIndex ? 'border-acid' : 'border-transparent opacity-70')}
              >
                <img src={img.thumb.url} alt="" className="size-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-col gap-4 p-5 sm:p-6 md:overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 pr-12 text-xs">
          <Badge variant="ink">Case {item.id}</Badge>
          <Badge>{item.category.name}</Badge>
          {item.tags.map((tag) => (
            <Badge key={tag.id} variant="accent">
              {tag.name}
            </Badge>
          ))}
        </div>
        <Title className="font-serif text-2xl leading-snug font-bold">{item.title}</Title>
        <p className="text-sm text-muted">
          来源：
          {item.source_url ? (
            <a href={item.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-ink hover:underline">
              {item.source_text || item.source_url}
              <ArrowUpRight className="size-3.5" />
            </a>
          ) : (
            item.source_text || '未标注'
          )}
        </p>
        <PromptBlock key={item.id} item={item} />
        <div className="flex items-center justify-between gap-2 border-t border-line pt-4">
          <Button variant="outline" size="sm" disabled={!prevId} onClick={() => prevId && onNavigate(prevId)}>
            <ChevronLeft /> 上一条
          </Button>
          <span className="hidden text-xs text-muted sm:inline">← → 键切换</span>
          <Button variant="outline" size="sm" disabled={!nextId} onClick={() => nextId && onNavigate(nextId)}>
            下一条 <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CaseDetailSkeleton() {
  return (
    <div className="grid flex-1 md:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]" aria-label="加载中">
      <div className="skeleton min-h-[40vh]" />
      <div className="flex flex-col gap-4 p-6">
        <div className="skeleton h-5 w-40 rounded" />
        <div className="skeleton h-8 w-3/4 rounded" />
        <div className="skeleton h-4 w-1/3 rounded" />
        <div className="skeleton h-64 w-full rounded-lg" />
      </div>
    </div>
  );
}
