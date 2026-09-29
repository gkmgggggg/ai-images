import { useQuery } from '@tanstack/react-query';
import { Check, Plus } from 'lucide-react';
import { useState } from 'react';

import { adminApi, type TagCount, type TagCreate } from '@/api/endpoints';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/form-controls';
import { cn } from '@/lib/utils';

import { TAG_KIND_LABELS, useAdminMutation } from './shared';

export function TagPicker({ value, onChange }: { value: number[]; onChange: (ids: number[]) => void }) {
  const tags = useQuery({ queryKey: ['admin', 'tags'], queryFn: adminApi.tags });
  const [name, setName] = useState('');
  const [kind, setKind] = useState<TagCreate['kind']>('style');
  const create = useAdminMutation((data: TagCreate) => adminApi.createTag(data), {
    invalidate: [['admin', 'tags']],
    onSuccess: (tag: TagCount) => {
      onChange([...value, tag.id]);
      setName('');
    },
  });

  const toggle = (id: number) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  const groups = Object.entries(Object.groupBy(tags.data ?? [], (tag) => tag.kind));

  return (
    <div className="flex flex-col gap-3">
      {groups.length === 0 && <p className="text-sm text-muted">还没有标签，可以在下方新建。</p>}
      {groups.map(([groupKind, list]) => (
        <div key={groupKind} className="flex flex-wrap items-center gap-1.5">
          <span className="w-10 text-xs text-muted">{TAG_KIND_LABELS[groupKind as TagCount['kind']] ?? groupKind}</span>
          {list?.map((tag) => {
            const selected = value.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                aria-pressed={selected}
                onClick={() => toggle(tag.id)}
                className={cn(
                  'inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs font-semibold transition-colors',
                  selected ? 'border-accent bg-accent text-accent-fg' : 'border-border text-muted hover:border-fg hover:text-fg',
                )}
              >
                {selected && <Check className="size-3" />}
                {tag.name}
              </button>
            );
          })}
        </div>
      ))}
      <div className="flex flex-wrap gap-2 border-t border-border pt-3">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="新标签名称"
          className="h-9 w-40"
          maxLength={64}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (name.trim()) create.mutate({ name: name.trim(), kind });
            }
          }}
        />
        <Select value={kind} onChange={(e) => setKind(e.target.value as TagCreate['kind'])} className="h-9 w-auto">
          {Object.entries(TAG_KIND_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Select>
        <Button size="sm" className="h-9" disabled={!name.trim() || create.isPending} onClick={() => create.mutate({ name: name.trim(), kind })}>
          <Plus /> 新建并选中
        </Button>
      </div>
    </div>
  );
}
