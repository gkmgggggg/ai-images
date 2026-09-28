import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';

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
export const TAG_KIND_LABELS: Record<string, string> = { style: '风格', ratio: '比例', model: '模型', other: '其他' };
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

export function StatusBadge({ status }: { status: string }) {
  const variant = status === 'published' ? 'success' : status === 'draft' ? 'warning' : 'default';
  return <Badge variant={variant}>{STATUS_LABELS[status] ?? status}</Badge>;
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-line bg-panel ${className}`}>{children}</section>;
}
