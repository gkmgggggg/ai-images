import { useEffect, useState } from 'react';

import { useDebouncedValue } from '@/lib/hooks';

/**
 * 搜索框是本地状态，停止输入 300 ms 后才提交（写入 URL 并发起搜索）；
 * 浏览器前进、后退改变了 URL 中的关键词时，反向同步回输入框。
 */
export function useKeywordSync(committed: string | undefined, commit: (keyword: string) => void) {
  const [keyword, setKeyword] = useState(committed ?? '');
  const debounced = useDebouncedValue(keyword, 300);

  useEffect(() => {
    if ((debounced.trim() || undefined) !== committed) commit(debounced);
    // 只在防抖后的值变化时提交
  }, [debounced]);

  useEffect(() => {
    setKeyword((current) => ((current.trim() || undefined) === committed ? current : (committed ?? '')));
  }, [committed]);

  return [keyword, setKeyword] as const;
}
