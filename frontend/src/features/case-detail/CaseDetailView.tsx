import { ArrowUpRight, ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import { useState } from 'react';

import type { CaseDetail } from '@/api/endpoints';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { CopyButton, PromptBlock, usePrompt, type PromptState } from './PromptBlock';

interface Props {
  item: CaseDetail;
  prevId: number | null;
  nextId: number | null;
  onNavigate: (id: number) => void;
  titleAs?: 'h1' | 'h2';
  /** 弹窗里可以按 Esc 关闭，独立页没有。 */
  hint?: string;
}

/**
 * 案例详情，弹窗与独立页共用（F05、F06）。
 * 宽屏（≥ 768 px）左右两栏；窄屏图片在上、信息在下，底部固定操作栏。
 */
export function CaseDetailView(props: Props) {
  // 切换案例时重置图片序号与提示词语言
  return <DetailBody key={props.item.id} {...props} />;
}

function DetailBody({ item, prevId, nextId, onNavigate, titleAs: Title = 'h2', hint = '← → 切换 · Esc 关闭' }: Props) {
  const [imageIndex, setImageIndex] = useState(0);
  const image = item.images[imageIndex] ?? item.images[0];
  const prompt = usePrompt(item);

  return (
    <div className="md:grid md:min-h-0 md:flex-1 md:grid-cols-[minmax(0,1.12fr)_minmax(380px,0.88fr)] md:grid-rows-[minmax(0,1fr)] md:overflow-hidden">
      <div className="relative flex h-[56dvh] min-h-[360px] flex-col items-center justify-center gap-3.5 overflow-hidden bg-black px-4 pt-14 pb-4 md:h-auto md:min-h-0 md:p-8">
        {image && (
          <img
            aria-hidden
            src={image.thumb.url}
            alt=""
            className="pointer-events-none absolute inset-0 size-full scale-125 object-cover opacity-90 blur-[60px] brightness-50 saturate-150"
          />
        )}
        {image ? (
          <a href={image.url} target="_blank" rel="noreferrer" title="查看原图" className="relative flex min-h-0 w-full flex-1 items-center justify-center">
            <img
              key={image.id}
              src={image.medium.url}
              srcSet={`${image.medium.url} ${image.medium.width}w, ${image.url} ${image.width}w`}
              sizes="(min-width: 768px) 55vw, 100vw"
              width={image.medium.width}
              height={image.medium.height}
              alt={item.title}
              className="max-h-full w-auto max-w-full rounded-md object-contain shadow-[0_30px_80px_-20px_rgba(0,0,0,.9)]"
            />
          </a>
        ) : (
          <div className="relative flex items-center gap-2 text-sm text-white/60">
            <ImageOff className="size-5" /> 这个案例暂未包含图片
          </div>
        )}
        {item.images.length > 1 && (
          <div className="relative flex gap-2" role="group" aria-label="切换图片">
            {item.images.map((img, index) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setImageIndex(index)}
                aria-label={`第 ${index + 1} 张图`}
                aria-pressed={index === imageIndex}
                className={cn(
                  'size-12 overflow-hidden rounded-lg border-2 transition-opacity',
                  index === imageIndex ? 'border-accent' : 'border-transparent opacity-55 hover:opacity-90',
                )}
              >
                <img src={img.thumb.url} alt="" className="size-full object-cover" />
              </button>
            ))}
          </div>
        )}
        {image && (
          <a
            href={image.url}
            target="_blank"
            rel="noreferrer"
            className="absolute bottom-3.5 left-4 inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-xs text-white/80 backdrop-blur transition-colors hover:text-white max-md:hidden"
          >
            查看原图 <ArrowUpRight className="size-3" />
          </a>
        )}
      </div>

      <div className="flex flex-col gap-4 px-4 pt-5 sm:px-6 md:min-h-0 md:px-8 md:pt-8 md:pb-5">
        <div className="flex flex-wrap items-center gap-1.5 md:pr-12">
          <Badge variant="accent">Case {item.id}</Badge>
          <Badge>{item.category.name}</Badge>
          {item.tags.map((tag) => (
            <Badge key={tag.id} variant="outline">
              {tag.name}
            </Badge>
          ))}
        </div>
        <Title className="text-[22px] leading-snug font-bold tracking-tight md:text-[26px]">{item.title}</Title>
        <p className="text-[13px] text-muted">
          来源：
          {item.source_url ? (
            <a href={item.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 break-all text-fg hover:underline">
              {item.source_text || item.source_url}
              <ArrowUpRight className="size-3.5 shrink-0" />
            </a>
          ) : (
            <span className="text-fg">{item.source_text || '未标注'}</span>
          )}
        </p>
        <PromptBlock prompt={prompt} />
        <div className="hidden items-center justify-between gap-2 border-t border-border pt-4 md:flex">
          <Button size="sm" disabled={!prevId} onClick={() => prevId && onNavigate(prevId)}>
            <ChevronLeft /> 上一条
          </Button>
          <span className="text-xs text-muted">{hint}</span>
          <Button size="sm" disabled={!nextId} onClick={() => nextId && onNavigate(nextId)}>
            下一条 <ChevronRight />
          </Button>
        </div>
        <DetailActionBar prompt={prompt} prevId={prevId} nextId={nextId} onNavigate={onNavigate} />
      </div>
    </div>
  );
}

/** 窄屏底部操作栏：固定在视口底部，任何滚动位置都能复制（AC-13）。 */
function DetailActionBar({
  prompt,
  prevId,
  nextId,
  onNavigate,
}: {
  prompt: PromptState;
  prevId: number | null;
  nextId: number | null;
  onNavigate: (id: number) => void;
}) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-1 flex items-center gap-2 border-t border-border bg-surface px-4 pt-2.5 pb-[max(14px,env(safe-area-inset-bottom))] sm:-mx-6 sm:px-6 md:hidden">
      <Button size="icon" aria-label="上一条" className="size-11" disabled={!prevId} onClick={() => prevId && onNavigate(prevId)}>
        <ChevronLeft />
      </Button>
      <CopyButton prompt={prompt} className="h-11 flex-1" />
      <Button size="icon" aria-label="下一条" className="size-11" disabled={!nextId} onClick={() => nextId && onNavigate(nextId)}>
        <ChevronRight />
      </Button>
    </div>
  );
}

export function CaseDetailSkeleton() {
  return (
    <div className="flex-1 md:grid md:grid-cols-[minmax(0,1.12fr)_minmax(380px,0.88fr)]" aria-label="加载中">
      <div className="skeleton h-[56dvh] min-h-[360px] md:h-auto" />
      <div className="flex flex-col gap-4 p-6 md:p-8">
        <div className="skeleton h-6 w-40 rounded-full" />
        <div className="skeleton h-8 w-3/4 rounded" />
        <div className="skeleton h-4 w-1/3 rounded" />
        <div className="skeleton h-64 w-full rounded-card" />
      </div>
    </div>
  );
}
