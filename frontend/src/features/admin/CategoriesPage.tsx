import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { adminApi, type AdminCategory } from '@/api/endpoints';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form-controls';

import { PageHeader, Panel, useAdminMutation } from './shared';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function CategoriesPage() {
  const categories = useQuery({ queryKey: ['admin', 'categories'], queryFn: adminApi.categories });
  const reorder = useAdminMutation((ids: number[]) => adminApi.reorderCategories(ids));
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const create = useAdminMutation(() => adminApi.createCategory({ name: name.trim(), slug }), {
    success: '分类已创建',
    onSuccess: () => {
      setName('');
      setSlug('');
    },
  });

  const list = categories.data ?? [];
  const move = (index: number, delta: number) => {
    const ids = list.map((c) => c.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(index + delta, 0, moved);
    reorder.mutate(ids);
  };

  const onCreate = (event: FormEvent) => {
    event.preventDefault();
    if (name.trim() && SLUG_PATTERN.test(slug)) create.mutate(undefined);
  };

  return (
    <>
      <PageHeader title="分类" description="排序决定前台分类栏的显示顺序；slug 用于网址中的分类参数。" />
      <Panel className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-line text-xs text-muted">
            <tr>
              <th className="w-24 px-4 py-3 font-semibold">排序</th>
              <th className="px-4 py-3 font-semibold">名称</th>
              <th className="px-4 py-3 font-semibold">slug</th>
              <th className="px-4 py-3 font-semibold">案例数</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {list.map((category, index) => (
              <CategoryRow
                key={category.id}
                category={category}
                first={index === 0}
                last={index === list.length - 1}
                onMove={(delta) => move(index, delta)}
                busy={reorder.isPending}
              />
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel className="p-5">
        <form onSubmit={onCreate} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm font-semibold">
            名称
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={64} className="w-48" />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            slug
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              placeholder="如 food-drink"
              maxLength={64}
              className="w-48"
              aria-invalid={slug !== '' && !SLUG_PATTERN.test(slug)}
            />
          </label>
          <Button type="submit" variant="accent" disabled={!name.trim() || !SLUG_PATTERN.test(slug) || create.isPending}>
            <Plus /> 新建分类
          </Button>
          {slug !== '' && !SLUG_PATTERN.test(slug) && (
            <p className="w-full text-xs text-coral">slug 只能包含小写字母、数字和连字符</p>
          )}
        </form>
      </Panel>
    </>
  );
}

function CategoryRow({
  category,
  first,
  last,
  onMove,
  busy,
}: {
  category: AdminCategory;
  first: boolean;
  last: boolean;
  onMove: (delta: number) => void;
  busy: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [slug, setSlug] = useState(category.slug);
  const save = useAdminMutation(() => adminApi.updateCategory(category.id, { name: name.trim(), slug }), {
    success: '已保存',
    onSuccess: () => setEditing(false),
  });
  const remove = useAdminMutation(() => adminApi.deleteCategory(category.id), { success: '分类已删除' });
  const valid = name.trim() && SLUG_PATTERN.test(slug);

  return (
    <tr className="border-b border-line last:border-0">
      <td className="px-4 py-2">
        <div className="flex gap-1">
          <Button size="icon-sm" variant="ghost" aria-label="上移" disabled={first || busy} onClick={() => onMove(-1)}>
            <ArrowUp />
          </Button>
          <Button size="icon-sm" variant="ghost" aria-label="下移" disabled={last || busy} onClick={() => onMove(1)}>
            <ArrowDown />
          </Button>
        </div>
      </td>
      <td className="px-4 py-2">
        {editing ? <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8" aria-label="名称" /> : category.name}
      </td>
      <td className="px-4 py-2 font-mono text-xs">
        {editing ? (
          <Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} className="h-8" aria-label="slug" />
        ) : (
          category.slug
        )}
      </td>
      <td className="px-4 py-2">{category.case_count}</td>
      <td className="px-4 py-2 text-right whitespace-nowrap">
        {editing ? (
          <>
            <Button size="icon-sm" variant="ghost" aria-label="保存" disabled={!valid || save.isPending} onClick={() => save.mutate(undefined)}>
              <Check />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="取消"
              onClick={() => {
                setEditing(false);
                setName(category.name);
                setSlug(category.slug);
              }}
            >
              <X />
            </Button>
          </>
        ) : (
          <>
            <Button size="icon-sm" variant="ghost" aria-label="编辑" onClick={() => setEditing(true)}>
              <Pencil />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="删除"
              disabled={category.case_count > 0 || remove.isPending}
              title={category.case_count > 0 ? '分类下还有案例，不能删除' : undefined}
              onClick={() => confirm(`确定删除分类「${category.name}」吗？`) && remove.mutate(undefined)}
            >
              <Trash2 className="text-coral" />
            </Button>
          </>
        )}
      </td>
    </tr>
  );
}
