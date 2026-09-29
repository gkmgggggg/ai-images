import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';

import { publicApi } from '@/api/endpoints';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';

import { GalleryHeader } from './GalleryHeader';
import { useGalleryOrder } from './galleryContext';
import { GridSkeleton, MasonryGrid } from './MasonryGrid';
import { ResultBar } from './ResultBar';
import { useGalleryParams } from './useGalleryParams';
import { useKeywordSync } from './useKeywordSync';

export function GalleryPage() {
  const { filters, update } = useGalleryParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { setIds } = useGalleryOrder();
  const [keyword, setKeyword] = useKeywordSync(filters.q, (q) => update({ q }, { replace: true }));

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

  const clearFilters = () => {
    setKeyword('');
    update({ q: undefined, category: undefined, tag: undefined });
  };

  return (
    <>
      <h1 className="sr-only">AI 图集：AI 图片案例与提示词</h1>
      <GalleryHeader
        keyword={keyword}
        onKeywordChange={setKeyword}
        onHome={() => setKeyword('')}
        onRandom={openRandom}
        filters={filters}
        onUpdate={update}
        categories={categories.data}
        tags={tags.data}
      />
      <main className="mx-auto flex max-w-[1480px] flex-col gap-4 px-3 pt-4 pb-16 sm:px-8 sm:pt-5">
        <ResultBar
          total={firstPage?.total}
          degraded={firstPage?.search_engine === 'database' && Boolean(filters.q)}
          filters={filters}
          categories={categories.data}
          tags={tags.data}
          meta={meta.data}
          onUpdate={update}
          onClear={clearFilters}
        />
        {cases.isError ? (
          <EmptyState
            title="加载失败"
            description={(cases.error as Error).message}
            action={<Button onClick={() => cases.refetch()}>重试</Button>}
          />
        ) : !cases.data ? (
          <GridSkeleton />
        ) : items.length === 0 ? (
          <EmptyState
            title="没有匹配的案例"
            description={filters.hasImage ? '换个关键词，或在筛选里关闭「仅有图」看看。' : '换个关键词或分类试试。'}
          />
        ) : (
          <div className={cn('transition-opacity', cases.isPlaceholderData && 'opacity-60')}>
            <MasonryGrid
              items={items}
              hasMore={Boolean(hasNextPage)}
              loadingMore={isFetchingNextPage}
              onLoadMore={loadMore}
              showInfo={Boolean(filters.q)}
            />
            {!hasNextPage && items.length > 8 && <p className="pt-8 text-center text-sm text-muted">已经到底了</p>}
          </div>
        )}
      </main>
    </>
  );
}
