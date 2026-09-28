import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DatabaseZap, FolderTree, Images, LogOut, SquareArrowOutUpRight, Tags } from 'lucide-react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router';

import { authApi } from '@/api/endpoints';
import { ThemeToggle } from '@/components/ThemeToggle';
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
    <div className="min-h-screen md:grid md:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="flex flex-col gap-4 border-b border-ink bg-panel/80 p-4 backdrop-blur md:sticky md:top-0 md:h-screen md:border-r md:border-b-0">
        <div className="flex items-center justify-between">
          <Link to="/admin/cases" className="text-lg font-bold">
            AI 图集 · 后台
          </Link>
          <ThemeToggle className="md:hidden" />
        </div>
        <nav className="flex gap-1 overflow-x-auto md:flex-col" aria-label="后台导航">
          {NAV.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                  isActive ? 'bg-ink text-paper' : 'text-muted hover:bg-line/60 hover:text-ink',
                )
              }
            >
              <Icon className="size-4" /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto hidden flex-col gap-3 md:flex">
          <ThemeToggle />
          <a href="/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
            查看前台 <SquareArrowOutUpRight className="size-3.5" />
          </a>
          <div className="flex items-center justify-between border-t border-line pt-3 text-sm">
            <span className="truncate">{session.data.username}</span>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut /> 退出
            </Button>
          </div>
        </div>
      </aside>
      <main className="flex min-w-0 flex-col gap-5 p-4 sm:p-6 lg:p-8">
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
