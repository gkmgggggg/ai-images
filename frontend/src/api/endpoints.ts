import { request } from '@/lib/api';

import type {
  AdminCaseDetail,
  AdminCasePage,
  AdminCategory,
  AdminMe,
  CaseCreate,
  CaseDetail,
  CasePage,
  CaseUpdate,
  CategoriesOut,
  CategoryCreate,
  CategoryUpdate,
  ImportRunDetail,
  ImportRunOut,
  MetaOut,
  RandomCase,
  TagCount,
  TagCreate,
  TagUpdate,
  TaskAccepted,
} from './generated';

export type * from './generated';

export interface GalleryFilters {
  category?: string;
  q?: string;
  tag?: number;
  hasImage: boolean;
}

// ---------- 前台 ----------

export const publicApi = {
  cases: (filters: GalleryFilters, cursor: string | null, signal?: AbortSignal) =>
    request<CasePage>('/cases', {
      query: {
        category: filters.category,
        q: filters.q,
        tag: filters.tag,
        has_image: filters.hasImage,
        cursor,
        limit: 24,
      },
      signal,
    }),
  randomCase: (filters: GalleryFilters) =>
    request<RandomCase>('/cases/random', {
      query: { category: filters.category, q: filters.q, tag: filters.tag },
    }),
  caseDetail: (id: number, signal?: AbortSignal) => request<CaseDetail>(`/cases/${id}`, { signal }),
  categories: (q: string | undefined, tag: number | undefined, signal?: AbortSignal) =>
    request<CategoriesOut>('/categories', { query: { q, tag }, signal }),
  tags: () => request<TagCount[]>('/tags'),
  meta: () => request<MetaOut>('/meta'),
};

// ---------- 鉴权 ----------

export const authApi = {
  me: () => request<AdminMe>('/auth/me'),
  login: (username: string, password: string) =>
    request<AdminMe>('/auth/login', { method: 'POST', json: { username, password } }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
};

// ---------- 管理后台 ----------

export interface AdminCaseQuery {
  q?: string;
  status?: string;
  category_id?: number;
  origin?: string;
  has_image?: boolean;
  page: number;
  page_size: number;
}

export const adminApi = {
  cases: (query: AdminCaseQuery) =>
    request<AdminCasePage>('/admin/cases', { query: { ...query } }),
  case: (id: number) => request<AdminCaseDetail>(`/admin/cases/${id}`),
  createCase: (data: CaseCreate) =>
    request<AdminCaseDetail>('/admin/cases', { method: 'POST', json: data }),
  updateCase: (id: number, data: CaseUpdate) =>
    request<AdminCaseDetail>(`/admin/cases/${id}`, { method: 'PATCH', json: data }),
  deleteCase: (id: number) => request<void>(`/admin/cases/${id}`, { method: 'DELETE' }),
  uploadImage: (id: number, file: File) => {
    const body = new FormData();
    body.append('file', file);
    return request<AdminCaseDetail>(`/admin/cases/${id}/images`, { method: 'POST', body });
  },
  deleteImage: (id: number, imageId: number) =>
    request<AdminCaseDetail>(`/admin/cases/${id}/images/${imageId}`, { method: 'DELETE' }),
  setCover: (id: number, imageId: number) =>
    request<AdminCaseDetail>(`/admin/cases/${id}/images/${imageId}/cover`, { method: 'POST' }),

  categories: () => request<AdminCategory[]>('/admin/categories'),
  createCategory: (data: CategoryCreate) =>
    request<AdminCategory>('/admin/categories', { method: 'POST', json: data }),
  updateCategory: (id: number, data: CategoryUpdate) =>
    request<void>(`/admin/categories/${id}`, { method: 'PATCH', json: data }),
  deleteCategory: (id: number) => request<void>(`/admin/categories/${id}`, { method: 'DELETE' }),
  reorderCategories: (ids: number[]) =>
    request<void>('/admin/categories/order', { method: 'PUT', json: { ids } }),

  tags: () => request<TagCount[]>('/admin/tags'),
  createTag: (data: TagCreate) => request<TagCount>('/admin/tags', { method: 'POST', json: data }),
  updateTag: (id: number, data: TagUpdate) =>
    request<void>(`/admin/tags/${id}`, { method: 'PATCH', json: data }),
  deleteTag: (id: number) => request<void>(`/admin/tags/${id}`, { method: 'DELETE' }),

  imports: () => request<ImportRunOut[]>('/admin/imports'),
  importDetail: (id: number) => request<ImportRunDetail>(`/admin/imports/${id}`),
  triggerImport: () => request<TaskAccepted>('/admin/imports', { method: 'POST' }),
  reindex: () => request<TaskAccepted>('/admin/search/reindex', { method: 'POST' }),
};
