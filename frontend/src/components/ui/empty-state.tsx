import type { LucideIcon } from 'lucide-react';
import { Search } from 'lucide-react';
import type { ReactNode } from 'react';

export function EmptyState({
  title,
  description,
  icon: Icon = Search,
  action,
}: {
  title: string;
  description?: ReactNode;
  icon?: LucideIcon;
  action?: ReactNode;
}) {
  return (
    <div className="grid place-items-center gap-2 rounded-modal border border-dashed border-border px-6 py-20 text-center">
      <Icon className="size-8 text-muted" />
      <h2 className="mt-1 text-lg font-bold">{title}</h2>
      {description && <p className="text-sm text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
