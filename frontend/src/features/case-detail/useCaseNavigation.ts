import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { publicApi } from '@/api/endpoints';
import { useGalleryOrder } from '@/features/gallery/galleryContext';

export function useCaseDetail(id: number) {
  return useQuery({
    queryKey: ['case', id],
    queryFn: ({ signal }) => publicApi.caseDetail(id, signal),
    enabled: Number.isInteger(id) && id > 0,
    staleTime: 60_000,
    retry: (count, error) => (error as { status?: number }).status !== 404 && count < 2,
  });
}

/**
 * 上一条/下一条：从图库进入时在当前筛选结果里切换；直接打开链接时按全站顺序。
 * 同时预取相邻案例，切换时无需等待。
 */
export function useAdjacentCases(id: number, fallback: { prev_id?: number | null; next_id?: number | null } | undefined) {
  const { ids } = useGalleryOrder();
  const queryClient = useQueryClient();
  const index = ids.indexOf(id);
  const inGallery = index !== -1;
  const prevId = inGallery ? (ids[index - 1] ?? null) : (fallback?.prev_id ?? null);
  const nextId = inGallery ? (ids[index + 1] ?? null) : (fallback?.next_id ?? null);

  useEffect(() => {
    for (const adjacent of [prevId, nextId]) {
      if (adjacent) {
        void queryClient.prefetchQuery({
          queryKey: ['case', adjacent],
          queryFn: ({ signal }) => publicApi.caseDetail(adjacent, signal),
          staleTime: 60_000,
        });
      }
    }
  }, [prevId, nextId, queryClient]);

  return { prevId, nextId };
}

export function useArrowKeys(onPrev: (() => void) | null, onNext: (() => void) | null) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (event.key === 'ArrowLeft' && onPrev) onPrev();
      if (event.key === 'ArrowRight' && onNext) onNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onPrev, onNext]);
}
