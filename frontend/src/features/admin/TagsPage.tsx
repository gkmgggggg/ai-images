import { useQuery } from '@tanstack/react-query';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';

import { adminApi, type TagCount, type TagCreate } from '@/api/endpoints';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/form-controls';

import { DataTable, PageHeader, Panel, TAG_KIND_LABELS, useAdminMutation } from './shared';

type Kind = TagCreate['kind'];

function KindSelect({ value, onChange, className }: { value: Kind; onChange: (kind: Kind) => void; className?: string }) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value as Kind)} className={className} aria-label="类型">
      {Object.entries(TAG_KIND_LABELS).map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </Select>
  );
}

export function TagsPage() {
  const tags = useQuery({ queryKey: ['admin', 'tags'], queryFn: adminApi.tags });
  const [name, setName] = useState('');
  const [kind, setKind] = useState<Kind>('style');
  const create = useAdminMutation(() => adminApi.createTag({ name: name.trim(), kind }), {
    success: '标签已创建',
    onSuccess: () => setName(''),
  });

  const onCreate = (event: FormEvent) => {
    event.preventDefault();
    if (name.trim()) create.mutate(undefined);
  };

  return (
    <>
      <PageHeader title="标签" description="比例标签由导入时从提示词自动识别（如 3:4、16:9），也可以手工新建风格、模型等标签。" />
      <Panel className="p-5">
        <form onSubmit={onCreate} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm font-semibold">
            名称
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={64} className="w-48" />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            类型
            <KindSelect value={kind} onChange={setKind} className="w-32" />
          </label>
          <Button type="submit" variant="accent" disabled={!name.trim() || create.isPending}>
            <Plus /> 新建标签
          </Button>
        </form>
      </Panel>
      <DataTable
        className="min-w-[560px]"
        columns={[{ label: '名称' }, { label: '类型' }, { label: '案例数' }, { label: <span className="sr-only">操作</span> }]}
        loading={tags.isPending}
        empty={tags.data?.length === 0 && '还没有标签'}
      >
        {tags.data?.map((tag) => <TagRow key={tag.id} tag={tag} />)}
      </DataTable>
    </>
  );
}

function TagRow({ tag }: { tag: TagCount }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tag.name);
  const [kind, setKind] = useState<Kind>(tag.kind);
  const save = useAdminMutation(() => adminApi.updateTag(tag.id, { name: name.trim(), kind }), {
    success: '已保存',
    onSuccess: () => setEditing(false),
  });
  const remove = useAdminMutation(() => adminApi.deleteTag(tag.id), { success: '标签已删除' });

  return (
    <tr>
      <td>
        {editing ? <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8" aria-label="名称" /> : tag.name}
      </td>
      <td>
        {editing ? <KindSelect value={kind} onChange={setKind} className="h-8 w-28" /> : TAG_KIND_LABELS[tag.kind]}
      </td>
      <td>
        <Link to={`/?tag=${tag.id}&all=1`} target="_blank" className="hover:underline">
          {tag.count}
        </Link>
      </td>
      <td className="text-right whitespace-nowrap">
        {editing ? (
          <>
            <Button size="icon-sm" variant="ghost" aria-label="保存" disabled={!name.trim() || save.isPending} onClick={() => save.mutate(undefined)}>
              <Check />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="取消"
              onClick={() => {
                setEditing(false);
                setName(tag.name);
                setKind(tag.kind);
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
              disabled={remove.isPending}
              onClick={() =>
                confirm(`确定删除标签「${tag.name}」吗？${tag.count ? `它会从 ${tag.count} 个案例上移除。` : ''}`) &&
                remove.mutate(undefined)
              }
            >
              <Trash2 className="text-danger" />
            </Button>
          </>
        )}
      </td>
    </tr>
  );
}
