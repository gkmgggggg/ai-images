import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

import type { GalleryFilters } from '@/api/endpoints';

/**
 * 筛选状态保存在 URL 查询参数里，刷新和分享都能还原：
 * c=分类 slug，q=关键词，tag=标签 id，all=1 表示包含没有图片的案例。
 */
export function useGalleryParams() {
  const [params, setParams] = useSearchParams();

  const filters: GalleryFilters = useMemo(() => {
    const tag = Number(params.get('tag'));
    return {
      category: params.get('c') || undefined,
      q: params.get('q')?.trim() || undefined,
      tag: Number.isInteger(tag) && tag > 0 ? tag : undefined,
      hasImage: params.get('all') !== '1',
    };
  }, [params]);

  const update = useCallback(
    (patch: Partial<GalleryFilters>, options: { replace?: boolean } = {}) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          const set = (key: string, value: string | undefined) => (value ? next.set(key, value) : next.delete(key));
          if ('category' in patch) set('c', patch.category);
          if ('q' in patch) set('q', patch.q?.trim() || undefined);
          if ('tag' in patch) set('tag', patch.tag ? String(patch.tag) : undefined);
          if ('hasImage' in patch) set('all', patch.hasImage ? undefined : '1');
          return next;
        },
        { replace: options.replace },
      );
    },
    [setParams],
  );

  return { filters, update };
}
