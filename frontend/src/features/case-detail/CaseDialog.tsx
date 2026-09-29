import { useLocation, useNavigate, useParams, type Location } from 'react-router';

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

import { CaseDetailSkeleton, CaseDetailView } from './CaseDetailView';
import { useAdjacentCases, useArrowKeys, useCaseDetail } from './useCaseNavigation';

/** 从图库打开时以弹窗形式叠在图库上方，关闭后回到原来的滚动位置。 */
export function CaseDialog() {
  const { id } = useParams();
  const caseId = Number(id);
  const navigate = useNavigate();
  const location = useLocation();
  const background = (location.state as { background?: Location } | null)?.background;
  const detail = useCaseDetail(caseId);
  const { prevId, nextId } = useAdjacentCases(caseId, detail.data);

  // 切换案例用 replace，关闭弹窗只需要后退一步
  const goTo = (target: number) => navigate(`/cases/${target}`, { replace: true, state: { background } });
  const close = () => navigate(-1);
  useArrowKeys(prevId ? () => goTo(prevId) : null, nextId ? () => goTo(nextId) : null);

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      {/* 窄屏由弹窗自身滚动，底部操作栏相对它吸底；宽屏左右两栏各自滚动 */}
      <DialogContent className="max-md:overflow-y-auto md:inset-7 md:mx-auto md:max-h-[calc(100dvh-3.5rem)] md:max-w-[1220px]" aria-describedby={undefined}>
        {detail.data ? (
          <>
            <DialogTitle className="sr-only">{detail.data.title}</DialogTitle>
            <CaseDetailView item={detail.data} prevId={prevId} nextId={nextId} onNavigate={goTo} />
          </>
        ) : detail.isError ? (
          <div className="grid flex-1 place-content-center gap-2 p-10 text-center">
            <DialogTitle className="text-lg font-bold">案例不存在或已下线</DialogTitle>
            <DialogDescription className="text-sm text-muted">{(detail.error as Error).message}</DialogDescription>
          </div>
        ) : (
          <>
            <DialogTitle className="sr-only">加载中</DialogTitle>
            <CaseDetailSkeleton />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
