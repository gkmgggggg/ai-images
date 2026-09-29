import { cn } from '@/lib/utils';

/**
 * 品牌标记：四角罗盘星，呼应「Prompt Atlas」。
 * 颜色取 --accent，随主题切换；每道光芒一半实色、一半半透明，形成罗盘的明暗面。
 * 深色主题下的光晕见 index.css 的 brand-mark。与 public/favicon.svg 保持同一图形。
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn('brand-mark size-5 shrink-0 text-accent', className)}>
      <path fill="currentColor" opacity=".45" d="M12 2 15 9l7 3-7 3-3 7-3-7-7-3 7-3z" />
      <path fill="currentColor" d="M12 12V2l3 7zm0 0h10l-7 3zm0 0v10l-3-7zm0 0H2l7-3z" />
    </svg>
  );
}
