import { ChevronsUpDown, LogOut, SquareArrowOutUpRight, SunMoon } from 'lucide-react';

import { ThemeToggle } from '@/components/ThemeToggle';
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface AccountMenuProps {
  username: string;
  onLogout: () => void;
  /** row：头像 + 用户名一整行（展开的侧栏）；avatar：只有头像（收起的侧栏、窄屏顶栏） */
  variant: 'row' | 'avatar';
  side: 'top' | 'right' | 'bottom';
  align: 'start' | 'end';
  className?: string;
}

const item = 'flex h-9 w-full items-center gap-2.5 rounded-[10px] px-2.5 text-sm transition-colors [&_svg]:size-4 [&_svg]:shrink-0';

/**
 * 账号菜单（规格 0003）：主题切换、查看前台、退出登录都收在这里，宽屏与窄屏共用。
 * 选择主题后菜单保持打开，方便对比效果；Esc 或点击外部关闭，焦点回到触发按钮。
 */
export function AccountMenu({ username, onLogout, variant, side, align, className }: AccountMenuProps) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label={`账号菜单：${username}`}
        title={variant === 'avatar' ? username : undefined}
        className={cn(
          'shrink-0 transition-colors hover:bg-fg/[0.06] data-[state=open]:bg-fg/[0.08]',
          variant === 'row' ? 'flex w-full items-center gap-2.5 rounded-[12px] px-2 py-1.5 text-left text-sm' : 'grid size-9 place-items-center rounded-full',
          className,
        )}
      >
        <Avatar username={username} />
        {variant === 'row' && (
          <>
            <span className="min-w-0 flex-1 truncate">{username}</span>
            <ChevronsUpDown className="size-4 shrink-0 text-muted" />
          </>
        )}
      </PopoverTrigger>
      <PopoverContent side={side} align={align} aria-label="账号菜单" className="w-64 rounded-[14px] p-1.5">
        <div className="flex items-center gap-2.5 px-2.5 py-2">
          <Avatar username={username} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{username}</p>
            <p className="text-xs text-muted">管理员</p>
          </div>
        </div>
        <div className="my-1 h-px bg-border" />
        <PopoverClose asChild>
          <a href="/" target="_blank" rel="noreferrer" className={cn(item, 'text-fg hover:bg-fg/[0.06]')}>
            <SquareArrowOutUpRight className="text-muted" /> 查看前台
          </a>
        </PopoverClose>
        <div className="flex items-center justify-between gap-3 py-1 pr-1 pl-2.5 text-sm">
          <span className="flex items-center gap-2.5">
            <SunMoon className="size-4 text-muted" /> 主题
          </span>
          <ThemeToggle />
        </div>
        <div className="my-1 h-px bg-border" />
        <button type="button" onClick={onLogout} className={cn(item, 'text-danger hover:bg-danger/10')}>
          <LogOut /> 退出登录
        </button>
      </PopoverContent>
    </Popover>
  );
}

function Avatar({ username }: { username: string }) {
  return (
    <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-accent-fg">
      {username.slice(0, 1).toUpperCase()}
    </span>
  );
}
