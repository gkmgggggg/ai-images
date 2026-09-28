import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Grid3X3, Image as ImageIcon, Search, Shuffle, Sparkles, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';

import { publicApi, type CategoriesOut, type TagCount } from '@/api/endpoints';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { useDebouncedValue } from '@/lib/hooks';
import { cn, formatNumber } from '@/lib/utils';

import { useGalleryOrder } from './galleryContext';
import { useGalleryParams } from './useGalleryParams';
import { GridSkeleton, VirtualGrid } from './VirtualGrid';

export function GalleryPage() {
  const { filters, update } = useGalleryParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { setIds } = useGalleryOrder();

  // 输入框是本地状态，停止输入 300ms 后才写入 URL 并发起搜索
  const [keyword, setKeyword] = useState(filters.q ?? '');
  const debouncedKeyword = useDebouncedValue(keyword, 300);
  useEffect(() => {
    if ((debouncedKeyword.trim() || undefined) !== filters.q) update({ q: debouncedKeyword }, { replace: true });
  }, [debouncedKeyword]);
  useEffect(() => {
    // 浏览器前进/后退改变了 URL 时同步回输入框
    setKeyword((current) => ((current.trim() || undefined) === filters.q ? current : (filters.q ?? '')));
  }, [filters.q]);

  const meta = useQuery({ queryKey: ['meta'], queryFn: publicApi.meta, staleTime: 60_000 });
  const tags = useQuery({ queryKey: ['tags'], queryFn: publicApi.tags, staleTime: 60_000 });
  const categories = useQuery({
    queryKey: ['categories', filters.q ?? '', filters.tag ?? null],
    queryFn: ({ signal }) => publicApi.categories(filters.q, filters.tag, signal),
    placeholderData: keepPreviousData,
  });

  const cases = useInfiniteQuery({
    queryKey: ['cases', filters],
    queryFn: ({ pageParam, signal }) => publicApi.cases(filters, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor,
    placeholderData: keepPreviousData,
  });

  const items = useMemo(() => cases.data?.pages.flatMap((page) => page.items) ?? [], [cases.data]);
  const firstPage = cases.data?.pages[0];

  useEffect(() => setIds(items.map((item) => item.id)), [items, setIds]);

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = cases;
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const openRandom = async () => {
    try {
      const result = await publicApi.randomCase(filters);
      if (result.id) navigate(`/cases/${result.id}`, { state: { background: location } });
      else toast('当前筛选下没有带图片的案例');
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const hasFilters = Boolean(filters.q || filters.category || filters.tag);

  return (
    <main className="mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="border-ink px-4 pt-5 sm:px-6 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:gap-6 lg:border-r lg:px-5 lg:py-7">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-3" aria-label="AI 图集首页" onClick={() => setKeyword('')}>
            <span className="grid size-11 place-items-center rounded-lg border border-ink bg-acid text-acid-ink shadow-hard">
              <Sparkles className="size-5" />
            </span>
            <span>
              <strong className="block text-xl leading-tight">AI 图集</strong>
              <small className="block text-xs text-muted">Prompt Atlas</small>
            </span>
          </Link>
          <ThemeToggle className="lg:hidden" />
        </div>

        <dl className="hidden gap-1 lg:grid" aria-label="图集统计">
          <Stat value={meta.data?.with_image} label="有图案例" />
          <Stat value={meta.data?.total} label="提示词" />
          <Stat value={meta.data?.categories} label="分类" />
        </dl>

        <div className="mt-auto hidden flex-col gap-4 lg:flex">
          <ThemeToggle className="self-start" />
          <div className="flex flex-col gap-1 rounded-lg border border-line bg-panel p-3 text-sm">
            <span className="text-xs text-muted">素材来源</span>
            <a
              href={meta.data?.upstream.url ?? 'https://github.com/wukongnotnull/image-inspirer'}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold hover:underline"
            >
              image-inspirer <ArrowUpRight className="size-3.5" />
            </a>
            <small className="text-xs text-muted">
              {meta.data?.upstream.license ?? 'Apache-2.0'} · {meta.data?.upstream.commit || 'main'}
            </small>
          </div>
        </div>
      </aside>

      <section className="flex min-w-0 flex-col gap-5 px-4 pt-5 pb-16 sm:px-6 lg:px-8 lg:pt-7">
        <header className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-muted">从图片反查提示词</p>
            <h1 className="mt-1 max-w-3xl font-serif text-2xl leading-tight font-bold text-balance sm:text-3xl lg:text-4xl">
              把好看的 AI 图片案例，整理成可搜索的灵感墙。
            </h1>
          </div>
          <Button variant="accent" size="icon" onClick={openRandom} title="随机打开一个案例" aria-label="随机打开一个案例">
            <Shuffle />
          </Button>
        </header>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex h-12 min-w-0 flex-1 basis-72 items-center gap-2 rounded-xl border border-ink bg-panel px-4 shadow-hard-sm focus-within:shadow-hard">
            <Search className="size-5 shrink-0 text-muted" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索风格、题材、作者或提示词"
              aria-label="搜索"
              className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted"
              maxLength={100}
            />
            {keyword && (
              <button type="button" onClick={() => setKeyword('')} aria-label="清空搜索" className="text-muted hover:text-ink">
                <X className="size-4" />
              </button>
            )}
          </label>
          <Button
            variant={filters.hasImage ? 'default' : 'outline'}
            size="lg"
            aria-pressed={filters.hasImage}
            onClick={() => update({ hasImage: !filters.hasImage })}
          >
            <ImageIcon /> 仅有图
          </Button>
        </div>

        <CategoryStrip
          data={categories.data}
          active={filters.category}
          hasImage={filters.hasImage}
          onSelect={(category) => update({ category })}
        />
        {tags.data && tags.data.length > 0 && (
          <TagStrip tags={tags.data} active={filters.tag} onSelect={(tag) => update({ tag })} />
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted" aria-live="polite">
          <span className="inline-flex items-center gap-2">
            <Grid3X3 className="size-4" />
            {firstPage ? `${formatNumber(firstPage.total)} 个结果` : '加载中…'}
            {firstPage?.search_engine === 'database' && filters.q && (
              <span className="text-xs">（搜索服务暂不可用，已切换为基础匹配）</span>
            )}
          </span>
          {hasFilters && (
            <button
              type="button"
              className="underline-offset-4 hover:text-ink hover:underline"
              onClick={() => {
                setKeyword('');
                update({ q: undefined, category: undefined, tag: undefined });
              }}
            >
              清除筛选
            </button>
          )}
        </div>

        {cases.isError ? (
          <EmptyState title="加载失败" description={(cases.error as Error).message} onRetry={() => cases.refetch()} />
        ) : !cases.data ? (
          <GridSkeleton />
        ) : items.length === 0 ? (
          <EmptyState
            title="没有匹配的案例"
            description={filters.hasImage ? '换个关键词，或关闭「仅有图」看看。' : '换个关键词或分类试试。'}
          />
        ) : (
          <div className={cn('transition-opacity', cases.isPlaceholderData && 'opacity-60')}>
            <VirtualGrid items={items} hasMore={Boolean(hasNextPage)} loadingMore={isFetchingNextPage} onLoadMore={loadMore} />
            {!hasNextPage && items.length > 8 && <p className="pt-6 text-center text-sm text-muted">已经到底了</p>}
          </div>
        )}
      </section>
    </main>
  );
}

function Stat({ value, label }: { value: number | undefined; label: string }) {
  return (
    <div className="flex items-end justify-between border-b border-line py-3">
      <dd className="font-serif text-4xl leading-none">{value === undefined ? '…' : formatNumber(value)}</dd>
      <dt className="text-sm text-muted">{label}</dt>
    </div>
  );
}

function CategoryStrip({
  data,
  active,
  hasImage,
  onSelect,
}: {
  data: CategoriesOut | undefined;
  active: string | undefined;
  hasImage: boolean;
  onSelect: (slug: string | undefined) => void;
}) {
  const count = (item: { total: number; with_image: number }) => (hasImage ? item.with_image : item.total);
  return (
    <nav aria-label="分类" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
      <Chip active={!active} onClick={() => onSelect(undefined)} label="全部" count={data ? count(data) : undefined} />
      {data?.items.map((item) => (
        <Chip
          key={item.slug}
          active={active === item.slug}
          onClick={() => onSelect(item.slug)}
          label={item.name}
          count={count(item)}
          dim={count(item) === 0}
        />
      ))}
    </nav>
  );
}

function TagStrip({
  tags,
  active,
  onSelect,
}: {
  tags: TagCount[];
  active: number | undefined;
  onSelect: (id: number | undefined) => void;
}) {
  const kindLabel: Record<string, string> = { ratio: '比例', style: '风格', model: '模型', other: '其他' };
  const groups = Object.entries(Object.groupBy(tags, (tag) => tag.kind));
  return (
    <div className="flex flex-col gap-2">
      {groups.map(([kind, list]) => (
        <div key={kind} className="flex items-center gap-2 overflow-x-auto pb-1" role="group" aria-label={`${kindLabel[kind] ?? kind}标签`}>
          <span className="shrink-0 text-xs font-semibold text-muted">{kindLabel[kind] ?? kind}</span>
          {list?.map((tag) => (
            <button
              key={tag.id}
              type="button"
              aria-pressed={active === tag.id}
              onClick={() => onSelect(active === tag.id ? undefined : tag.id)}
              className={cn(
                'shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors',
                active === tag.id ? 'border-ink bg-acid text-acid-ink' : 'border-line bg-panel text-muted hover:border-ink hover:text-ink',
              )}
            >
              {tag.name} <span className="font-normal opacity-70">{tag.count}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function Chip({
  active,
  onClick,
  label,
  count,
  dim,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number | undefined;
  dim?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors',
        active ? 'border-ink bg-ink text-paper' : 'border-line bg-panel hover:border-ink',
        dim && !active && 'opacity-50',
      )}
    >
      <span>{label}</span>
      <span className={cn('text-xs', active ? 'text-paper/70' : 'text-muted')}>{count ?? '·'}</span>
    </button>
  );
}

function EmptyState({ title, description, onRetry }: { title: string; description: string; onRetry?: () => void }) {
  return (
    <div className="grid place-items-center gap-2 rounded-xl border border-dashed border-line bg-panel/60 px-6 py-20 text-center">
      <Search className="size-8 text-muted" />
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="text-sm text-muted">{description}</p>
      {onRetry && (
        <Button className="mt-2" onClick={onRetry}>
          重试
        </Button>
      )}
    </div>
  );
}
