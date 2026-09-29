import { Search, Shuffle, X } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';

import type { CategoriesOut, GalleryFilters, TagCount } from '@/api/endpoints';
import { BrandMark } from '@/components/BrandMark';
import { ThemeCycleButton, ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTitle, DialogTrigger, SheetContent } from '@/components/ui/dialog';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useMediaQuery, useSlashFocus } from '@/lib/hooks';

import { CategoryBar } from './CategoryBar';
import { activeFilterCount, FilterButton, FilterPanelBody } from './FilterPanel';

interface GalleryHeaderProps {
  keyword: string;
  onKeywordChange: (keyword: string) => void;
  onHome: () => void;
  onRandom: () => void;
  filters: GalleryFilters;
  onUpdate: (patch: Partial<GalleryFilters>) => void;
  categories: CategoriesOut | undefined;
  tags: TagCount[] | undefined;
}

/**
 * 吸顶栏（规格 0002）：第一行 Logo、搜索、随机、主题；第二行筛选按钮与分类横向滚动。
 * 筛选面板宽屏时从吸顶栏下方弹出，窄屏（< 640 px）时改为底部抽屉。
 */
export function GalleryHeader({ keyword, onKeywordChange, onHome, onRandom, filters, onUpdate, categories, tags }: GalleryHeaderProps) {
  const narrow = useMediaQuery('(max-width: 639px)');
  const [filterOpen, setFilterOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useSlashFocus(inputRef);

  const trigger = <FilterButton count={activeFilterCount(filters)} />;
  const body = <FilterPanelBody tags={tags} filters={filters} onUpdate={onUpdate} onDone={() => setFilterOpen(false)} />;

  const bar = (filterTrigger: ReactNode) => (
    <div className="glass rounded-bar border border-border shadow-[0_16px_40px_-18px_rgba(0,0,0,.55)]">
      <div className="flex h-[58px] items-center gap-2 pr-2 pl-3 sm:h-[60px] sm:gap-5 sm:pr-2.5 sm:pl-[18px]">
        <Link to="/" onClick={onHome} aria-label="AI 图集首页" className="flex shrink-0 items-center gap-2.5">
          <BrandMark />
          <strong className="text-base font-semibold whitespace-nowrap max-[359px]:sr-only sm:text-[17px]">AI 图集</strong>
          <small className="hidden font-label text-[10px] tracking-[.3em] text-muted lg:inline">PROMPT ATLAS</small>
        </Link>
        <label className="flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-full border border-transparent bg-fg/[0.08] pr-2 pl-3.5 text-muted transition-[border-color,box-shadow] focus-within:border-accent/60 focus-within:shadow-[0_0_0_4px_color-mix(in_oklab,var(--accent)_14%,transparent)] sm:mx-auto sm:h-[42px] sm:max-w-[620px]">
          <Search className="size-[18px] shrink-0" />
          <input
            ref={inputRef}
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
            placeholder={narrow ? '搜索风格、题材或提示词' : '搜索风格、题材、作者或提示词'}
            aria-label="搜索"
            maxLength={100}
            autoComplete="off"
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-fg outline-none"
          />
          {keyword && (
            <button type="button" onClick={() => onKeywordChange('')} aria-label="清空搜索" className="grid place-items-center p-1 hover:text-fg">
              <X className="size-4" />
            </button>
          )}
          <kbd className="hidden rounded-[5px] border border-border px-1.5 font-sans text-[11px] text-muted sm:inline">/</kbd>
        </label>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          <Button variant="accent" size="icon" onClick={onRandom} title="随机打开一个案例" aria-label="随机打开一个案例">
            <Shuffle className="!size-[18px]" />
          </Button>
          <ThemeToggle className="max-sm:hidden" />
          <ThemeCycleButton className="sm:hidden" />
        </div>
      </div>
      <div className="flex h-[46px] items-center gap-2 border-t border-border pl-2.5 sm:h-auto sm:items-start sm:gap-3 sm:py-2 sm:pr-3.5 sm:pl-3.5">
        {filterTrigger}
        <CategoryBar data={categories} active={filters.category} hasImage={filters.hasImage} onSelect={(category) => onUpdate({ category })} />
      </div>
    </div>
  );

  return (
    <header className="sticky top-0 z-20 mx-auto max-w-[1480px] px-3 pt-2 sm:px-8 sm:pt-3">
      {narrow ? (
        <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
          {bar(<DialogTrigger asChild>{trigger}</DialogTrigger>)}
          <SheetContent aria-describedby={undefined}>
            <DialogTitle className="mb-4 text-[17px] font-semibold">筛选</DialogTitle>
            {body}
          </SheetContent>
        </Dialog>
      ) : (
        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverAnchor asChild>{bar(<PopoverTrigger asChild>{trigger}</PopoverTrigger>)}</PopoverAnchor>
          <PopoverContent
            aria-label="筛选"
            align="start"
            className="max-h-[var(--radix-popover-content-available-height)] w-[var(--radix-popover-trigger-width)] overflow-y-auto"
          >
            {body}
          </PopoverContent>
        </Popover>
      )}
    </header>
  );
}
