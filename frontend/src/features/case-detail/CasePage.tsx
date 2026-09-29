import { ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { ThemeCycleButton, ThemeToggle } from '@/components/ThemeToggle';

import { CaseDetailSkeleton, CaseDetailView } from './CaseDetailView';
import { useAdjacentCases, useArrowKeys, useCaseDetail } from './useCaseNavigation';

/** 直接打开 /cases/:id（分享链接、刷新）时的独立页面。 */
export function CasePage() {
  const { id } = useParams();
  const caseId = Number(id);
  const navigate = useNavigate();
  const detail = useCaseDetail(caseId);
  const { prevId, nextId } = useAdjacentCases(caseId, detail.data);
  const goTo = (target: number) => navigate(`/cases/${target}`);
  useArrowKeys(prevId ? () => goTo(prevId) : null, nextId ? () => goTo(nextId) : null);

  useEffect(() => {
    document.title = detail.data ? `${detail.data.title} · AI 图集` : 'AI 图集';
    return () => {
      document.title = 'AI 图集';
    };
  }, [detail.data]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-[1280px] flex-col gap-3 sm:gap-4 sm:px-6 sm:py-5 md:h-dvh md:min-h-0">
      <div className="flex items-center justify-between px-4 pt-3 sm:px-0 sm:pt-0">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold transition-colors hover:text-accent">
          <ArrowLeft className="size-4" /> 返回图库
        </Link>
        <ThemeToggle className="max-sm:hidden" />
        <ThemeCycleButton className="sm:hidden" />
      </div>
      {/* 窄屏不能用 overflow-hidden，否则底部操作栏无法相对视口吸底 */}
      <div className="flex flex-1 flex-col overflow-clip bg-surface sm:rounded-modal sm:border sm:border-border md:min-h-0 md:overflow-hidden">
        {detail.data ? (
          <CaseDetailView item={detail.data} prevId={prevId} nextId={nextId} onNavigate={goTo} titleAs="h1" hint="← → 切换" />
        ) : detail.isError ? (
          <div className="grid flex-1 place-items-center p-10 text-center">
            <div>
              <h1 className="text-lg font-bold">案例不存在或已下线</h1>
              <Link to="/" className="mt-3 inline-block text-sm underline">
                去图库看看
              </Link>
            </div>
          </div>
        ) : (
          <CaseDetailSkeleton />
        )}
      </div>
    </main>
  );
}
