import type { TagCount } from '@/api/endpoints';

/** 标签类型的中文名与展示顺序，前台筛选面板与后台共用。 */
export const TAG_KIND_LABELS: Record<TagCount['kind'], string> = { ratio: '比例', style: '风格', model: '模型', other: '其他' };
export const TAG_KIND_ORDER: TagCount['kind'][] = ['ratio', 'style', 'model', 'other'];
