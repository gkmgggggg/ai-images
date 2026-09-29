import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DatabaseZap, FolderTree, Images, LogOut, SquareArrowOutUpRight, Tags } from 'lucide-react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router';

import { authApi } from '@/api/endpoints';
import { ThemeCycleButton, ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

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

/** 后台布局，同时负责登录校验：未登录跳转到登录页，并记住原本要去的地址。 */
export function AdminLayout() {
  const session = useAdminSession();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
    <div className="min-h-screen md:grid md:grid-cols-[236px_minmax(0,1fr)]">
      <aside className="z-10 flex flex-col gap-3 border-b border-border bg-surface px-3 pt-3 pb-2 max-md:sticky max-md:top-0 md:sticky md:top-0 md:h-screen md:gap-6 md:border-r md:border-b-0 md:px-3.5 md:py-[22px]">
        <div className="flex items-center justify-between gap-2 md:px-2">
          <Link to="/admin/cases" className="flex items-center gap-2.5">
            <span aria-hidden className="logo-orb" />
            <strong className="text-base font-semibold">AI 图集</strong>
            <small className="rounded-full border border-border px-2 text-[11px] text-muted">后台</small>
          </Link>
          <ThemeCycleButton className="md:hidden" />
        </div>
        <nav className="flex gap-0.5 overflow-x-auto md:flex-col" aria-label="后台导航">
          {NAV.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex h-9 shrink-0 items-center gap-2.5 rounded-full px-3 text-sm transition-colors md:h-[38px]',
                  isActive
                    ? 'bg-fg/[0.08] font-semibold text-fg md:shadow-[inset_2px_0_0_var(--accent)]'
                    : 'text-muted hover:bg-fg/[0.05] hover:text-fg',
                )
              }
            >
              <Icon className="size-4" /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto hidden flex-col items-start gap-3.5 md:flex">
          <ThemeToggle />
          <a href="/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2 text-[13px] text-muted hover:text-fg">
            查看前台 <SquareArrowOutUpRight className="size-3.5" />
          </a>
          <div className="flex items-center gap-2.5 self-stretch border-t border-border px-2 pt-3.5 text-sm">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-accent-fg">
              {session.data.username.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 truncate">{session.data.username}</span>
            <Button variant="ghost" size="icon-sm" onClick={logout} aria-label="退出" title="退出">
              <LogOut />
            </Button>
          </div>
        </div>
      </aside>
      <main className="flex min-w-0 flex-col gap-5 px-3 py-5 sm:px-6 lg:px-10 lg:py-8">
        <Outlet />
        <div className="flex justify-end md:hidden">
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut /> 退出（{session.data.username}）
          </Button>
        </div>
      </main>
    </div>
  );
}
