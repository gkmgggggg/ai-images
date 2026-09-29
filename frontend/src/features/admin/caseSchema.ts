import { z } from 'zod';

import type { AdminCaseDetail } from '@/api/endpoints';

function isValidJson(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

/** 案例编辑表单的校验规则（F10）。 */
export const caseSchema = z
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

export type CaseFormValues = z.infer<typeof caseSchema>;

export const EMPTY_CASE: CaseFormValues = {
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

export function toFormValues(item: AdminCaseDetail): CaseFormValues {
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
