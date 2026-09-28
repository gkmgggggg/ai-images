import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

interface GalleryOrder {
  ids: number[];
  setIds: (ids: number[]) => void;
}

const GalleryOrderContext = createContext<GalleryOrder>({ ids: [], setIds: () => {} });

/** 记录图库当前的案例顺序，详情弹窗据此在「当前筛选结果」中切换上一条/下一条。 */
export function GalleryOrderProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<number[]>([]);
  const value = useMemo(() => ({ ids, setIds }), [ids]);
  return <GalleryOrderContext.Provider value={value}>{children}</GalleryOrderContext.Provider>;
}

export function useGalleryOrder(): GalleryOrder {
  return useContext(GalleryOrderContext);
}
