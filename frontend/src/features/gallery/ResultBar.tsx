import { X } from 'lucide-react';

import type { CategoriesOut, GalleryFilters, MetaOut, TagCount } from '@/api/endpoints';
import { formatNumber } from '@/lib/utils';

const UPSTREAM_URL = 'https://github.com/wukongnotnull/image-inspirer';

interface ResultBarProps {
  total: number | undefined;
  degraded: boolean;
  filters: GalleryFilters;
  categories: CategoriesOut | undefined;
  tags: TagCount[] | undefined;
  meta: MetaOut | undefined;
  onUpdate: (patch: Partial<GalleryFilters>) => void;
  onClear: () => void;
}

function ConditionChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`移除条件：${label}`}
      className="inline-flex h-[26px] items-center gap-1 rounded-full bg-fg/[0.07] pr-1.5 pl-2.5 text-xs text-fg transition-colors hover:bg-fg/[0.12]"
    >
      {label}
      <X className="size-3.5 text-muted" />
    </button>
  );
}

/** 结果栏：结果数、已选条件（可单独移除）、清除筛选、降级提示，以及素材来源与许可（N08）。 */
export function ResultBar({ total, degraded, filters, categories, tags, meta, onUpdate, onClear }: ResultBarProps) {
  const categoryName = filters.category
    ? (categories?.items.find((c) => c.slug === filters.category)?.name ?? filters.category)
    : undefined;
  const tagName = filters.tag ? (tags?.find((t) => t.id === filters.tag)?.name ?? `标签 ${filters.tag}`) : undefined;
  const hasFilters = Boolean(filters.q || filters.category || filters.tag);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-muted" aria-live="polite">
      <span className="font-semibold text-fg tabular-nums">{total === undefined ? '加载中…' : `${formatNumber(total)} 个结果`}</span>
      {degraded && <span className="text-xs">（搜索服务暂不可用，已切换为基础匹配）</span>}
      {categoryName && <ConditionChip label={categoryName} onRemove={() => onUpdate({ category: undefined })} />}
      {tagName && <ConditionChip label={tagName} onRemove={() => onUpdate({ tag: undefined })} />}
      {!filters.hasImage && <ConditionChip label="含无图案例" onRemove={() => onUpdate({ hasImage: true })} />}
      {hasFilters && (
        <button type="button" onClick={onClear} className="underline-offset-4 hover:text-fg hover:underline">
          清除筛选
        </button>
      )}
      <span className="ml-auto text-xs max-sm:ml-0 max-sm:basis-full">
        素材来自{' '}
        <a
          href={meta?.upstream.url || UPSTREAM_URL}
          target="_blank"
          rel="noreferrer"
          className="border-b border-border text-fg/80 transition-colors hover:border-fg hover:text-fg"
        >
          image-inspirer
        </a>
        {' · '}
        {meta?.upstream.license || 'Apache-2.0'}
        {meta && ` · ${formatNumber(meta.total)} 条提示词`}
      </span>
    </div>
  );
}
