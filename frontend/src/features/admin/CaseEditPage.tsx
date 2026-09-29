import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, RotateCcw, Save, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';

import { adminApi, type AdminCaseDetail, type CaseCreate, type CaseUpdate } from '@/api/endpoints';
import { Button, buttonVariants } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils';

import { CaseForm } from './CaseForm';
import { caseSchema, EMPTY_CASE, toFormValues, type CaseFormValues } from './caseSchema';
import { CaseImageManager } from './CaseImageManager';
import { FIELD_LABELS, PageHeader, Panel, StatusBadge, useAdminMutation } from './shared';

export function CaseEditPage() {
  const { id } = useParams();
  const isNew = id === undefined;
  const caseId = Number(id);
  const detail = useQuery({
    queryKey: ['admin', 'case', caseId],
    queryFn: () => adminApi.case(caseId),
    enabled: !isNew,
  });

  if (!isNew && detail.isPending) return <p className="text-sm text-muted">加载中…</p>;
  if (!isNew && detail.isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p>{(detail.error as Error).message}</p>
        <Link to="/admin/cases" className={buttonVariants()}>
          返回列表
        </Link>
      </div>
    );
  }
  return <CaseEditor key={detail.data?.id ?? 'new'} item={detail.data} />;
}

/** 新建或编辑一个案例：只提交改动过的字段，未改动的字段不会被标记为「手工修改」。 */
function CaseEditor({ item }: { item?: AdminCaseDetail }) {
  const navigate = useNavigate();
  const categories = useQuery({ queryKey: ['admin', 'categories'], queryFn: adminApi.categories });
  const form = useForm<CaseFormValues>({
    resolver: zodResolver(caseSchema),
    defaultValues: item ? toFormValues(item) : EMPTY_CASE,
  });
  const {
    handleSubmit,
    reset,
    formState: { dirtyFields, isDirty, isSubmitting },
  } = form;

  useEffect(() => {
    if (!isDirty) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const create = useAdminMutation((data: CaseCreate) => adminApi.createCase(data), {
    success: '案例已创建，现在可以上传图片',
    onSuccess: (created) => navigate(`/admin/cases/${created.id}`, { replace: true }),
  });
  const update = useAdminMutation((data: CaseUpdate) => adminApi.updateCase(item!.id, data), {
    success: '已保存',
    onSuccess: (updated) => reset(toFormValues(updated)),
  });
  const remove = useAdminMutation(() => adminApi.deleteCase(item!.id), {
    success: '案例已删除',
    onSuccess: () => navigate('/admin/cases', { replace: true }),
  });
  const clearOverrides = useAdminMutation(() => adminApi.updateCase(item!.id, { clear_overrides: true }), {
    success: '已恢复上游同步，下次导入时会用上游内容覆盖',
  });

  const onSubmit = handleSubmit(async (values) => {
    const payload = { ...values, source_url: values.source_url || null };
    if (!item) {
      await create.mutateAsync(payload).catch(() => undefined);
      return;
    }
    const changed = Object.fromEntries(
      Object.keys(dirtyFields).map((key) => [key, payload[key as keyof typeof payload]]),
    ) as CaseUpdate;
    if (Object.keys(changed).length === 0) {
      toast('没有需要保存的修改');
      return;
    }
    await update.mutateAsync(changed).catch(() => undefined);
  });

  const overridden = item?.overridden_fields ?? [];

  return (
    <>
      <div>
        <Link to="/admin/cases" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
          <ArrowLeft className="size-4" /> 返回列表
        </Link>
      </div>
      <PageHeader
        title={item ? `编辑案例 #${item.id}` : '新建案例'}
        description={
          item
            ? `${item.origin === 'upstream' ? `上游导入（例 ${item.upstream_no}）` : '手工创建'} · 更新于 ${formatDateTime(item.updated_at)}`
            : '保存后即可上传图片'
        }
        actions={
          item && (
            <>
              <StatusBadge status={item.status} />
              {item.status === 'published' && (
                <a href={`/cases/${item.id}`} target="_blank" rel="noreferrer" className={buttonVariants({ size: 'sm' })}>
                  <ExternalLink /> 前台查看
                </a>
              )}
            </>
          )
        }
      />

      {overridden.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-warning/40 bg-warning/10 p-4 text-sm">
          <p>
            以下内容已手工修改，重新导入上游时不会覆盖：
            <strong className="text-warning">{overridden.map((f) => FIELD_LABELS[f] ?? f).join('、')}</strong>
          </p>
          <Button
            size="sm"
            disabled={clearOverrides.isPending}
            onClick={() => {
              if (confirm('恢复后，下次导入会用上游内容覆盖这些字段。确定吗？')) clearOverrides.mutate(undefined);
            }}
          >
            <RotateCcw /> 恢复上游同步
          </Button>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          <CaseForm form={form} categories={categories.data} />

          <div className="glass sticky bottom-0 z-10 -mx-3 flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-3 sm:mx-0 sm:rounded-[14px] sm:border sm:px-4">
            {item ? (
              <Button
                variant="danger"
                disabled={remove.isPending}
                onClick={() => {
                  if (confirm(`确定删除案例「${item.title}」吗？此操作不可恢复。`)) remove.mutate(undefined);
                }}
              >
                <Trash2 /> 删除案例
              </Button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-3">
              {isDirty && <span className="text-xs text-muted">有未保存的修改</span>}
              <Button type="submit" variant="accent" disabled={isSubmitting || create.isPending || update.isPending}>
                <Save /> {item ? '保存修改' : '创建案例'}
              </Button>
            </div>
          </div>
        </form>

        <aside className="flex flex-col gap-5">
          {item ? (
            <CaseImageManager item={item} />
          ) : (
            <Panel className="p-5 text-sm text-muted">创建案例后可以在这里上传图片。</Panel>
          )}
        </aside>
      </div>
    </>
  );
}
