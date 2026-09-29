import { useCallback, useState } from 'react';

export const SIDEBAR_STORAGE_KEY = 'atlas-admin-sidebar';

/** 读取侧栏是否收起（规格 0003 AC-5）；读取失败或值不合法时按展开处理。 */
export function readSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'collapsed';
  } catch {
    return false;
  }
}

/** 宽屏侧栏的收起状态，保存在本机；localStorage 不可用时只在内存里生效。 */
export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(readSidebarCollapsed);
  const toggle = useCallback(() => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? 'collapsed' : 'expanded');
    } catch {
      // 隐私模式等场景写不进去，忽略即可
    }
  }, [collapsed]);
  return [collapsed, toggle] as const;
}
