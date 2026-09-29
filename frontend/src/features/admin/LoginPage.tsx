import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { LogIn } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router';
import { z } from 'zod';

import { authApi } from '@/api/endpoints';
import { Button } from '@/components/ui/button';
import { FieldError, Input, Label } from '@/components/ui/form-controls';

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
    <main className="grid min-h-screen place-items-center px-4">
      <form
        onSubmit={onSubmit}
        noValidate
        className="flex w-full max-w-sm flex-col gap-4 rounded-modal border border-border bg-surface p-7 shadow-[0_40px_100px_-30px_rgba(0,0,0,.6)]"
      >
        <div className="flex items-center gap-3">
          <span aria-hidden className="logo-orb mx-1" />
          <div>
            <h1 className="text-lg font-bold">管理员登录</h1>
            <p className="text-xs text-muted">AI 图集后台</p>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="username">用户名</Label>
          <Input id="username" autoComplete="username" autoFocus aria-invalid={!!errors.username} {...register('username')} />
          <FieldError message={errors.username?.message} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">密码</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            {...register('password')}
          />
          <FieldError message={errors.password?.message} />
        </div>
        <FieldError message={serverError} />
        <Button type="submit" variant="accent" size="lg" disabled={isSubmitting}>
          <LogIn /> {isSubmitting ? '登录中…' : '登录'}
        </Button>
        <p className="text-xs text-muted">管理员账号通过命令行创建：uv run atlas create-admin &lt;用户名&gt;</p>
      </form>
    </main>
  );
}
