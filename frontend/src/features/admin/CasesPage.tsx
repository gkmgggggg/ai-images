import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, ImageOff, PenLine, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';

import { adminApi } from '@/api/endpoints';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/form-controls';
import { useDebouncedValue } from '@/lib/hooks';
import { formatDateTime, formatNumber } from '@/lib/utils';

import { FIELD_LABELS, PageHeader, Panel, StatusBadge } from './shared';

const PAGE_SIZE = 20;

export function CasesPage() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const status = params.get('status') ?? '';
  const categoryId = Number(params.get('category')) || undefined;
  const origin = params.get('origin') ?? '';
  const image = params.get('image') ?? '';
  const [keyword, setKeyword] = useState(params.get('q') ?? '');
  const q = useDebouncedValue(keyword.trim(), 300);

  const setParam = (key: string, value: string | undefined) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== 'page') next.delete('page');
      return next;
    });

  useEffect(() => {
    if ((params.get('q') ?? '') !== q) setParam('q', q || undefined);
  }, [q]);

  const categories = useQuery({ queryKey: ['admin', 'categories'], queryFn: adminApi.categories });
  const cases = useQuery({
    queryKey: ['admin', 'cases', { page, status, categoryId, origin, image, q }],
    queryFn: () =>
      adminApi.cases({
        page,
        page_size: PAGE_SIZE,
        q: q || undefined,
        status: status || undefined,
        category_id: categoryId,
        origin: origin || undefined,
        has_image: image === '' ? undefined : image === 'yes',
      }),
    placeholderData: keepPreviousData,
  });

  const totalPages = cases.data ? Math.max(1, Math.ceil(cases.data.total / PAGE_SIZE)) : 1;

  return (
    <>
      <PageHeader
        title="案例"
        description={cases.data ? `共 ${formatNumber(cases.data.total)} 条` : undefined}
        actions={
          <Link to="/admin/cases/new" className={buttonVariants({ variant: 'accent' })}>
            <Plus /> 新建案例
          </Link>
        }
      />

      <Panel className="flex flex-wrap gap-2 p-3">
        <label className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="标题、提示词、来源或 ID"
            className="pl-9"
            aria-label="搜索案例"
          />
        </label>
        <Select value={status} onChange={(e) => setParam('status', e.target.value)} aria-label="状态" className="w-auto">
          <option value="">全部状态</option>
          <option value="published">已发布</option>
          <option value="draft">草稿</option>
          <option value="hidden">已隐藏</option>
        </Select>
        <Select
          value={categoryId ?? ''}
          onChange={(e) => setParam('category', e.target.value)}
          aria-label="分类"
          className="w-auto"
        >
          <option value="">全部分类</option>
          {categories.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select value={origin} onChange={(e) => setParam('origin', e.target.value)} aria-label="来源" className="w-auto">
          <option value="">全部来源</option>
          <option value="upstream">上游导入</option>
          <option value="manual">手工创建</option>
        </Select>
        <Select value={image} onChange={(e) => setParam('image', e.target.value)} aria-label="图片" className="w-auto">
          <option value="">有无图片</option>
          <option value="yes">有图</option>
          <option value="no">无图</option>
        </Select>
      </Panel>

      <Panel className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-line text-xs text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">案例</th>
              <th className="px-4 py-3 font-semibold">分类</th>
              <th className="px-4 py-3 font-semibold">状态</th>
              <th className="px-4 py-3 font-semibold">来源</th>
              <th className="px-4 py-3 font-semibold">更新时间</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {cases.data?.items.map((item) => (
              <tr key={item.id} className="border-b border-line last:border-0 hover:bg-paper/60">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="size-12 shrink-0 overflow-hidden rounded-md border border-line" style={{ backgroundColor: item.cover?.color }}>
                      {item.cover ? (
                        <img src={item.cover.thumb.url} alt="" className="size-full object-cover" loading="lazy" />
                      ) : (
                        <ImageOff className="m-3.5 size-5 text-muted" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <Link to={`/admin/cases/${item.id}`} className="line-clamp-1 font-semibold hover:underline">
                        {item.title}
                      </Link>
                      <div className="mt-0.5 flex flex-wrap gap-1 text-xs text-muted">
                        #{item.id}
                        {item.tags.map((tag) => (
                          <Badge key={tag.id}>{tag.name}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap">{item.category.name}</td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={item.status} />
                </td>
                <td className="px-4 py-2.5 text-xs">
                  {item.origin === 'upstream' ? `上游 例${item.upstream_no}` : '手工'}
                  {item.overridden_fields.length > 0 && (
                    <div
                      className="mt-0.5 text-amber-700 dark:text-amber-300"
                      title={`已手工修改：${item.overridden_fields.map((f) => FIELD_LABELS[f] ?? f).join('、')}`}
                    >
                      已手工修改 {item.overridden_fields.length} 项
                    </div>
                  )}
                </td>
                <td className="px-4 py-2.5 text-xs whitespace-nowrap text-muted">{formatDateTime(item.updated_at)}</td>
                <td className="px-4 py-2.5 text-right">
                  <Link to={`/admin/cases/${item.id}`} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                    <PenLine /> 编辑
                  </Link>
                </td>
              </tr>
            ))}
            {cases.data?.items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted">
                  没有符合条件的案例
                </td>
              </tr>
            )}
            {cases.isPending && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted">
                  加载中…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Panel>

      <div className="flex items-center justify-end gap-2 text-sm">
        <Button size="sm" disabled={page <= 1} onClick={() => setParam('page', String(page - 1))}>
          <ChevronLeft /> 上一页
        </Button>
        <span className="text-muted">
          {page} / {totalPages}
        </span>
        <Button size="sm" disabled={page >= totalPages} onClick={() => setParam('page', String(page + 1))}>
          下一页 <ChevronRight />
        </Button>
      </div>
    </>
  );
}
