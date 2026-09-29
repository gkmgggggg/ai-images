import { SlidersHorizontal } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

import type { GalleryFilters, TagCount } from '@/api/endpoints';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { TAG_KIND_LABELS, TAG_KIND_ORDER } from '@/lib/labels';
import { cn } from '@/lib/utils';

/** 与默认值不同的筛选条件数：选了标签算一个，关闭「仅有图」算一个。 */
export function activeFilterCount(filters: GalleryFilters): number {
  return (filters.tag ? 1 : 0) + (filters.hasImage ? 0 : 1);
}

export function FilterButton({ count, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { count: number }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-[34px] shrink-0 items-center gap-2 rounded-full bg-fg/[0.07] px-3.5 text-[13px] font-semibold text-fg transition-colors hover:bg-fg/[0.12] data-[state=open]:text-accent data-[state=open]:shadow-[inset_0_0_0_1px_var(--accent)]',
        className,
      )}
      {...props}
    >
      <SlidersHorizontal className="size-4" />
      筛选
      {count > 0 && (
        <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[11px] text-accent-fg">
          {count}
        </span>
      )}
    </button>
  );
}

interface FilterPanelBodyProps {
  tags: TagCount[] | undefined;
  filters: GalleryFilters;
  onUpdate: (patch: Partial<GalleryFilters>) => void;
  onDone: () => void;
}

/** 筛选面板内容：标签按类型分组（单选，再点一次取消），以及「仅有图」开关（F02、F12）。 */
export function FilterPanelBody({ tags, filters, onUpdate, onDone }: FilterPanelBodyProps) {
  const groups = TAG_KIND_ORDER.map((kind) => ({ kind, list: (tags ?? []).filter((tag) => tag.kind === kind) })).filter(
    (group) => group.list.length > 0,
  );

  return (
    <div className="flex flex-col gap-5">
      {groups.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {groups.map(({ kind, list }) => (
            <div key={kind} role="group" aria-label={`${TAG_KIND_LABELS[kind]}标签`}>
              <h3 className="mb-2.5 text-xs font-semibold tracking-wider text-muted">{TAG_KIND_LABELS[kind]}</h3>
              <div className="flex flex-wrap gap-1.5">
                {list.map((tag) => {
                  const active = filters.tag === tag.id;
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onUpdate({ tag: active ? undefined : tag.id })}
                      className={cn(
                        'inline-flex h-[30px] items-center gap-1.5 rounded-full border px-3 text-[13px] transition-colors',
                        active ? 'border-accent bg-accent font-semibold text-accent-fg' : 'border-border hover:border-fg',
                      )}
                    >
                      {tag.name}
                      <span className={cn('text-[11px] tabular-nums', active ? 'opacity-70' : 'text-muted')}>{tag.count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">还没有可用的标签。</p>
      )}
      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-between gap-4 border-t border-border bg-surface px-4 py-4 sm:static sm:mx-0 sm:px-0 sm:pb-0">
        <Switch
          checked={filters.hasImage}
          onChange={(hasImage) => onUpdate({ hasImage })}
          label="仅显示有图案例"
          description="关闭后也显示只有提示词、没有图片的案例"
        />
        <div className="flex flex-1 justify-end gap-2 max-sm:basis-full">
          <Button variant="ghost" className="max-sm:flex-1" onClick={() => onUpdate({ tag: undefined, hasImage: true })}>
            重置
          </Button>
          <Button variant="default" className="max-sm:flex-1" onClick={onDone}>
            完成
          </Button>
        </div>
      </div>
    </div>
  );
}
