import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export { TAG_KIND_LABELS } from '@/lib/labels';

/** 后台写操作：统一的错误提示，并刷新后台与前台的相关缓存。 */
export function useAdminMutation<TArgs, TResult>(
  mutationFn: (args: TArgs) => Promise<TResult>,
  options: { success?: string | ((result: TResult) => string); invalidate?: QueryKey[]; onSuccess?: (result: TResult) => void } = {},
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async (result) => {
      const message = typeof options.success === 'function' ? options.success(result) : options.success;
      if (message) toast.success(message);
      options.onSuccess?.(result);
      const keys = options.invalidate ?? [['admin']];
      await Promise.all([
        ...keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
        // 前台数据也可能受影响
        queryClient.invalidateQueries({ queryKey: ['cases'] }),
        queryClient.invalidateQueries({ queryKey: ['case'] }),
        queryClient.invalidateQueries({ queryKey: ['categories'] }),
        queryClient.invalidateQueries({ queryKey: ['tags'] }),
        queryClient.invalidateQueries({ queryKey: ['meta'] }),
      ]);
    },
    onError: (error) => toast.error((error as Error).message),
  });
}

export const STATUS_LABELS: Record<string, string> = { published: '已发布', draft: '草稿', hidden: '已隐藏' };
export const FIELD_LABELS: Record<string, string> = {
  category_id: '分类',
  title: '标题',
  source_text: '来源',
  source_url: '来源链接',
  prompt: '提示词原文',
  prompt_zh: '中文提示词',
  prompt_en: '英文提示词',
  prompt_format: '提示词格式',
  images: '图片',
  tags: '标签',
};

const STATUS_COLORS: Record<string, string> = { published: 'text-success', draft: 'text-warning', hidden: 'text-muted' };

/** 发布状态：圆点加文字。 */
export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap before:size-1.5 before:rounded-full before:bg-current',
        STATUS_COLORS[status] ?? 'text-muted',
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-[13px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('rounded-[14px] border border-border bg-surface', className)}>{children}</section>;
}

/** 后台表格：统一表头、行分隔与单元格内边距；加载中和空列表各占一行提示。 */
export function DataTable({
  columns,
  children,
  loading,
  empty,
  className,
}: {
  columns: { label?: ReactNode; className?: string }[];
  children: ReactNode;
  loading?: boolean;
  empty?: string | false;
  className?: string;
}) {
  const note = loading ? '加载中…' : empty;
  return (
    <Panel className="overflow-x-auto">
      <table className={cn('w-full text-left text-sm', className)}>
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th
                key={index}
                className={cn('border-b border-border bg-fg/[0.04] px-4 py-3 text-xs font-semibold whitespace-nowrap text-muted', column.className)}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_td]:px-4 [&_td]:py-2.5 [&>tr]:border-b [&>tr]:border-border [&>tr]:transition-colors [&>tr:hover]:bg-fg/[0.03] [&>tr:last-child]:border-0">
          {children}
          {note && (
            <tr>
              <td colSpan={columns.length} className="!py-12 text-center text-muted">
                {note}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Panel>
  );
}

export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  return (
    <div className="flex items-center justify-end gap-2 text-sm">
      <Button size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <ChevronLeft /> 上一页
      </Button>
      <span className="text-muted tabular-nums">
        {page} / {totalPages}
      </span>
      <Button size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        下一页 <ChevronRight />
      </Button>
    </div>
  );
}
