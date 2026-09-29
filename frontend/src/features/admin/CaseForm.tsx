import { Controller, type UseFormRegisterReturn, type UseFormReturn } from 'react-hook-form';

import type { AdminCategory } from '@/api/endpoints';
import { FieldError, Input, Label, Select, Textarea } from '@/components/ui/form-controls';
import { cn } from '@/lib/utils';

import type { CaseFormValues } from './caseSchema';
import { Panel } from './shared';
import { TagPicker } from './TagPicker';

/** 案例编辑表单的字段区：基本信息、提示词、标签。提交与操作按钮由外层负责。 */
export function CaseForm({ form, categories }: { form: UseFormReturn<CaseFormValues>; categories: AdminCategory[] | undefined }) {
  const {
    register,
    control,
    formState: { errors },
  } = form;

  return (
    <>
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
            {categories?.map((c) => (
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
        <Controller control={control} name="tag_ids" render={({ field }) => <TagPicker value={field.value} onChange={field.onChange} />} />
      </Panel>
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
  register: UseFormRegisterReturn;
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
