import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, KeyRound, LogIn, SquareTerminal, UserRound, type LucideIcon } from 'lucide-react';
import { useState, type ComponentProps } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { z } from 'zod';

import { authApi, publicApi } from '@/api/endpoints';
import { BrandMark } from '@/components/BrandMark';
import { ThemeCycleButton } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { FieldError, Input, Label } from '@/components/ui/form-controls';
import { cn } from '@/lib/utils';

import { LoginShowcase } from './LoginShowcase';

const schema = z.object({
  username: z.string().trim().min(1, '请输入用户名'),
  password: z.string().min(1, '请输入密码'),
});
type FormValues = z.infer<typeof schema>;

function safeNext(value: string | null): string {
  // 只允许跳回站内后台地址，避免开放重定向
  return value && value.startsWith('/admin') && !value.startsWith('//') ? value : '/admin/cases';
}

export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string>();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async ({ username, password }) => {
    setServerError(undefined);
    try {
      const me = await authApi.login(username, password);
      queryClient.setQueryData(['admin', 'me'], me);
      navigate(safeNext(params.get('next')), { replace: true });
    } catch (error) {
      setServerError((error as Error).message);
    }
  });

  return (
    <main className="relative grid min-h-screen lg:grid-cols-[minmax(0,1.15fr)_minmax(460px,1fr)]">
      <aside className="relative flex flex-col justify-end overflow-hidden max-lg:absolute max-lg:inset-0 max-lg:opacity-50">
        <LoginShowcase />
        <div aria-hidden className="login-vignette absolute inset-0" />
        <BrandIntro />
      </aside>

      <section className="relative flex min-h-screen flex-col px-4 py-4 sm:px-8 sm:py-6 lg:border-l lg:border-border lg:bg-bg/75 lg:px-12">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 text-sm text-muted transition-colors hover:text-fg">
            <ArrowLeft className="size-4" /> 返回图库
          </Link>
          <ThemeCycleButton />
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[380px] max-lg:rounded-modal max-lg:bg-surface/80 max-lg:backdrop-blur-2xl max-lg:border max-lg:border-border max-lg:p-6 max-lg:shadow-[0_40px_100px_-30px_rgba(0,0,0,.6)]">
            <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
              <header>
                <p className="flex items-center gap-2 font-label text-[11px] font-semibold tracking-[.3em] text-accent">
                  <BrandMark className="size-4" /> ADMIN CONSOLE
                </p>
                <h1 className="mt-3 text-[28px] leading-tight font-semibold">管理员登录</h1>
                <p className="mt-1.5 text-sm text-muted">登录后维护案例、图片、分类与导入任务。</p>
              </header>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="username">用户名</Label>
                <IconInput
                  icon={UserRound}
                  id="username"
                  autoComplete="username"
                  autoFocus
                  aria-invalid={!!errors.username}
                  {...register('username')}
                />
                <FieldError message={errors.username?.message} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">密码</Label>
                <IconInput
                  icon={KeyRound}
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={!!errors.password}
                  {...register('password')}
                />
                <FieldError message={errors.password?.message} />
              </div>
              <FieldError message={serverError} />
              <Button type="submit" variant="accent" size="lg" disabled={isSubmitting} className="mt-1">
                <LogIn /> {isSubmitting ? '登录中…' : '登录'}
              </Button>
            </form>
            <div className="mt-8 flex gap-3 rounded-xl border border-dashed border-border px-4 py-3 text-xs leading-relaxed text-muted">
              <SquareTerminal className="mt-0.5 size-4 shrink-0" />
              <p>
                还没有账号？在服务器上运行
                <code className="mt-1 block font-mono text-[12px] text-fg">uv run atlas create-admin &lt;用户名&gt;</code>
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function IconInput({ icon: Icon, className, ...props }: ComponentProps<typeof Input> & { icon: LucideIcon }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
      <Input className={cn('h-11 pl-10', className)} {...props} />
    </div>
  );
}

/** 宽屏左栏底部的品牌介绍与收录数字；窄屏图片墙只作背景，不显示这一块。 */
function BrandIntro() {
  const meta = useQuery({ queryKey: ['meta'], queryFn: publicApi.meta, staleTime: 60_000 });
  const stats = meta.data && [
    { label: '案例', value: meta.data.total },
    { label: '有图案例', value: meta.data.with_image },
    { label: '分类', value: meta.data.categories },
  ];

  return (
    <div className="relative hidden max-w-[600px] p-12 lg:block xl:p-16">
      <div className="flex items-center gap-2.5">
        <BrandMark className="size-6" />
        <strong className="text-lg font-semibold">AI 图集</strong>
        <small className="font-label text-[10px] tracking-[.3em] text-muted">PROMPT ATLAS</small>
      </div>
      <p className="mt-6 text-[40px] leading-[1.2] font-semibold xl:text-[44px]">
        每一张好图，
        <br />
        都藏着一段<span className="text-accent">好提示词</span>
      </p>
      <p className="mt-4 text-[15px] text-muted">在这里整理案例、图片与分类，让图库保持新鲜。</p>
      {stats && (
        <dl className="mt-10 flex gap-10">
          {stats.map(({ label, value }) => (
            <div key={label} className="flex flex-col-reverse gap-1">
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="text-2xl font-semibold tabular-nums">{value.toLocaleString('zh-CN')}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
