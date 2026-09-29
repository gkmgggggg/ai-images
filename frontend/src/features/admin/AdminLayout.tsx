import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DatabaseZap, FolderTree, Images, PanelLeftClose, PanelLeftOpen, Tags } from 'lucide-react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router';

import { authApi } from '@/api/endpoints';
import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

import { AccountMenu } from './AccountMenu';
import { useSidebarCollapsed } from './useSidebarCollapsed';

const NAV = [
  { to: '/admin/cases', label: '案例', Icon: Images },
  { to: '/admin/categories', label: '分类', Icon: FolderTree },
  { to: '/admin/tags', label: '标签', Icon: Tags },
  { to: '/admin/imports', label: '导入与索引', Icon: DatabaseZap },
];

export function useAdminSession() {
  return useQuery({
    queryKey: ['admin', 'me'],
    queryFn: authApi.me,
    retry: false,
    staleTime: 5 * 60_000,
  });
}

/**
 * 后台布局，同时负责登录校验：未登录跳转到登录页，并记住原本要去的地址。
 * 宽屏侧栏可收起为图标栏（规格 0003）；主题、查看前台、退出都在账号菜单里。
 */
export function AdminLayout() {
  const session = useAdminSession();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();

  if (session.isPending) {
    return <div className="grid min-h-screen place-items-center text-sm text-muted">正在验证登录状态…</div>;
  }
  if (session.error instanceof ApiError && session.error.status === 401) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/admin/login?next=${next}`} replace />;
  }
  if (session.isError) {
    return (
      <div className="grid min-h-screen place-items-center text-center text-sm">
        <div>
          <p>无法连接后台服务：{(session.error as Error).message}</p>
          <Button className="mt-3" onClick={() => session.refetch()}>
            重试
          </Button>
        </div>
      </div>
    );
  }

  const logout = async () => {
    await authApi.logout().catch(() => undefined);
    queryClient.removeQueries({ queryKey: ['admin'] });
    navigate('/admin/login', { replace: true });
  };

  return (
    <div
      className={cn(
        'min-h-screen md:grid md:transition-[grid-template-columns] md:duration-200 md:ease-out',
        collapsed ? 'md:grid-cols-[64px_minmax(0,1fr)]' : 'md:grid-cols-[236px_minmax(0,1fr)]',
      )}
    >
      {/* 展开时裁掉过渡中还没放下的文字；收起时不裁，导航提示要伸到侧栏外面 */}
      <aside
        className={cn(
          'z-10 flex flex-col gap-3 border-b border-border bg-surface px-3 pt-3 pb-2 max-md:sticky max-md:top-0 md:sticky md:top-0 md:h-screen md:gap-6 md:border-r md:border-b-0 md:py-[22px]',
          collapsed ? 'md:px-2.5' : 'md:overflow-hidden md:px-3.5',
        )}
      >
        <div className={cn('flex items-center justify-between gap-2', collapsed ? 'md:flex-col md:gap-3' : 'md:px-2')}>
          <Link to="/admin/cases" aria-label="AI 图集后台" className="flex items-center gap-2.5">
            <BrandMark />
            <strong className={cn('text-base font-semibold whitespace-nowrap', collapsed && 'md:hidden')}>AI 图集</strong>
            <small className={cn('rounded-full border border-border px-2 text-[11px] text-muted', collapsed && 'md:hidden')}>后台</small>
          </Link>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleCollapsed}
            aria-label={collapsed ? '展开侧栏' : '收起侧栏'}
            title={collapsed ? '展开侧栏' : '收起侧栏'}
            className="text-muted hover:text-fg max-md:hidden"
          >
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </Button>
          <AccountMenu username={session.data.username} onLogout={logout} variant="avatar" side="bottom" align="end" className="md:hidden" />
        </div>
        <nav className={cn('flex gap-0.5 max-md:overflow-x-auto md:flex-col', collapsed && 'md:items-center')} aria-label="后台导航">
          {NAV.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'group relative flex h-9 shrink-0 items-center gap-2.5 rounded-full px-3 text-sm transition-colors md:h-[38px]',
                  collapsed && 'md:w-[38px] md:justify-center md:px-0',
                  isActive
                    ? cn('bg-fg/[0.08] font-semibold text-fg', collapsed ? 'md:text-accent' : 'md:shadow-[inset_2px_0_0_var(--accent)]')
                    : 'text-muted hover:bg-fg/[0.05] hover:text-fg',
                )
              }
            >
              <Icon className="size-4 shrink-0" />
              <span className={cn('whitespace-nowrap', collapsed && 'md:sr-only')}>{label}</span>
              {collapsed && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-[calc(100%+10px)] -translate-x-1 -translate-y-1/2 rounded-lg bg-fg px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-bg opacity-0 shadow-lg transition-[opacity,translate] group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 max-md:hidden"
                >
                  {label}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className={cn('mt-auto hidden border-t border-border pt-3 md:block', collapsed && 'md:flex md:justify-center')}>
          <AccountMenu
            username={session.data.username}
            onLogout={logout}
            variant={collapsed ? 'avatar' : 'row'}
            side={collapsed ? 'right' : 'top'}
            align={collapsed ? 'end' : 'start'}
          />
        </div>
      </aside>
      <main className="flex min-w-0 flex-col gap-5 px-3 py-5 sm:px-6 lg:px-10 lg:py-8">
        <Outlet />
      </main>
    </div>
  );
}
