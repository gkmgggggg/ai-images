import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, ImagePlus, RotateCcw, Save, Star, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { z } from 'zod';

import { adminApi, type AdminCaseDetail, type CaseCreate, type CaseUpdate } from '@/api/endpoints';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { FieldError, Input, Label, Select, Textarea } from '@/components/ui/form-controls';
import { cn, formatDateTime } from '@/lib/utils';

import { FIELD_LABELS, PageHeader, Panel, StatusBadge, useAdminMutation } from './shared';
import { TagPicker } from './TagPicker';

function isValidJson(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

const schema = z
  .object({
    title: z.string().trim().min(1, '请填写标题').max(200, '标题最多 200 字'),
    category_id: z.number({ error: '请选择分类' }).int().positive('请选择分类'),
    status: z.enum(['draft', 'published', 'hidden']),
    source_text: z.string().trim().max(300, '最多 300 字'),
    source_url: z.union([z.literal(''), z.url({ protocol: /^https?$/, error: '请输入以 http:// 或 https:// 开头的链接' })]),
    prompt_format: z.enum(['text', 'json']),
    prompt: z.string(),
    prompt_zh: z.string(),
    prompt_en: z.string(),
    tag_ids: z.array(z.number()),
  })
  .refine((v) => v.prompt.trim() || v.prompt_zh.trim() || v.prompt_en.trim(), {
    message: '至少填写一种提示词',
    path: ['prompt'],
  })
  .refine((v) => v.prompt_format !== 'json' || !v.prompt.trim() || isValidJson(v.prompt), {
    message: '格式选择了 JSON，但原文不是合法的 JSON',
    path: ['prompt'],
  });

type FormValues = z.infer<typeof schema>;

const EMPTY: FormValues = {
  title: '',
  category_id: 0,
  status: 'draft',
  source_text: '',
  source_url: '',
  prompt_format: 'text',
  prompt: '',
  prompt_zh: '',
  prompt_en: '',
  tag_ids: [],
};

function toFormValues(item: AdminCaseDetail): FormValues {
  return {
    title: item.title,
    category_id: item.category_id,
    status: item.status,
    source_text: item.source_text,
    source_url: item.source_url ?? '',
    prompt_format: item.prompt_format,
    prompt: item.prompt,
    prompt_zh: item.prompt_zh,
    prompt_en: item.prompt_en,
    tag_ids: item.tags.map((t) => t.id),
  };
}

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

function CaseEditor({ item }: { item?: AdminCaseDetail }) {
  const navigate = useNavigate();
  const categories = useQuery({ queryKey: ['admin', 'categories'], queryFn: adminApi.categories });
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: item ? toFormValues(item) : EMPTY,
  });
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, dirtyFields, isDirty, isSubmitting },
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
    // 只提交改动过的字段，未改动的字段不会被标记为「手工修改」
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
        <Link to="/admin/cases" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
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
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
          <p>
            以下内容已手工修改，重新导入上游时不会覆盖：
            <strong>{overridden.map((f) => FIELD_LABELS[f] ?? f).join('、')}</strong>
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
          <Panel className="grid gap-4 p-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="title">标题</Label>
              <Input id="title" aria-invalid={!!errors.title} {...register('title')} />
              <FieldError message={errors.title?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category_id">分类</Label>
              <Select id="category_id" aria-invalid={!!errors.category_id} {...register('category_id', { valueAsNumber: true })}>
                <option value={0} disabled>
                  请选择分类
                </option>
                {categories.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <FieldError message={errors.category_id?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="status">状态</Label>
              <Select id="status" {...register('status')}>
                <option value="draft">草稿（前台不可见）</option>
                <option value="published">已发布</option>
                <option value="hidden">已隐藏（前台不可见）</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="source_text">来源</Label>
              <Input id="source_text" placeholder="如：小红书号 123、@作者" {...register('source_text')} />
              <FieldError message={errors.source_text?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="source_url">来源链接</Label>
              <Input id="source_url" placeholder="https://" aria-invalid={!!errors.source_url} {...register('source_url')} />
              <FieldError message={errors.source_url?.message} />
            </div>
          </Panel>

          <Panel className="flex flex-col gap-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold">提示词</h2>
              <label className="flex items-center gap-2 text-sm">
                原文格式
                <Select className="h-8 w-auto" {...register('prompt_format')}>
                  <option value="text">纯文本</option>
                  <option value="json">JSON</option>
                </Select>
              </label>
            </div>
            <PromptField id="prompt_zh" label="中文提示词" register={register('prompt_zh')} />
            <PromptField id="prompt_en" label="英文提示词" register={register('prompt_en')} />
            <PromptField
              id="prompt"
              label="原文（上游原始内容，可能是中英双语或 JSON）"
              register={register('prompt')}
              error={errors.prompt?.message}
              mono
            />
          </Panel>

          <Panel className="flex flex-col gap-3 p-5">
            <h2 className="font-bold">标签</h2>
            <Controller
              control={control}
              name="tag_ids"
              render={({ field }) => <TagPicker value={field.value} onChange={field.onChange} />}
            />
          </Panel>

          <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-2 border-t border-line bg-paper/90 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
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
              <Button type="submit" variant="default" disabled={isSubmitting || create.isPending || update.isPending}>
                <Save /> {item ? '保存修改' : '创建案例'}
              </Button>
            </div>
          </div>
        </form>

        <aside className="flex flex-col gap-5">
          {item ? (
            <ImagesPanel item={item} />
          ) : (
            <Panel className="p-5 text-sm text-muted">创建案例后可以在这里上传图片。</Panel>
          )}
        </aside>
      </div>
    </>
  );
}

function PromptField({
  id,
  label,
  register,
  error,
  mono,
}: {
  id: string;
  label: string;
  register: ReturnType<ReturnType<typeof useForm<FormValues>>['register']>;
  error?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Textarea id={id} rows={6} aria-invalid={!!error} className={cn(mono && 'font-mono text-[13px]')} {...register} />
      <FieldError message={error} />
    </div>
  );
}

function ImagesPanel({ item }: { item: AdminCaseDetail }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const upload = useAdminMutation((file: File) => adminApi.uploadImage(item.id, file));
  const remove = useAdminMutation((imageId: number) => adminApi.deleteImage(item.id, imageId), { success: '图片已删除' });
  const cover = useAdminMutation((imageId: number) => adminApi.setCover(item.id, imageId), { success: '已设为封面' });

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files);
    setUploading(list.length);
    let ok = 0;
    for (const file of list) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} 超过 10 MB`);
      } else if (await upload.mutateAsync(file).then(() => true, () => false)) {
        ok += 1;
      }
      setUploading((n) => n - 1);
    }
    if (ok) toast.success(`已上传 ${ok} 张图片`);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <Panel className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">图片</h2>
        <Button size="sm" variant="accent" disabled={uploading > 0} onClick={() => inputRef.current?.click()}>
          <ImagePlus /> {uploading > 0 ? `上传中（剩 ${uploading} 张）` : '上传图片'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={(e) => void onFiles(e.target.files)}
        />
      </div>
      <p className="text-xs text-muted">支持 JPEG / PNG / WebP，单张不超过 10 MB。第一张为封面。</p>
      {item.images.length === 0 ? (
        <div className="grid h-40 place-items-center rounded-lg border border-dashed border-line text-sm text-muted">暂无图片</div>
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {item.images.map((image, index) => (
            <li key={image.id} className="overflow-hidden rounded-lg border border-line">
              <a href={image.url} target="_blank" rel="noreferrer" className="block aspect-[4/5]" style={{ backgroundColor: image.color }}>
                <img src={image.thumb.url} alt="" className="size-full object-cover" loading="lazy" />
              </a>
              <div className="flex items-center justify-between gap-1 p-1.5">
                {index === 0 ? (
                  <Badge variant="accent">
                    <Star className="size-3" /> 封面
                  </Badge>
                ) : (
                  <Button size="sm" variant="ghost" disabled={cover.isPending} onClick={() => cover.mutate(image.id)}>
                    设为封面
                  </Button>
                )}
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="删除图片"
                  disabled={remove.isPending}
                  onClick={() => confirm('确定删除这张图片吗？') && remove.mutate(image.id)}
                >
                  <Trash2 className="text-coral" />
                </Button>
              </div>
              <p className="px-2 pb-2 text-[11px] text-muted">
                {image.width}×{image.height}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
