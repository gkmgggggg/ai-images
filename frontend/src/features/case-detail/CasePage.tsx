import { ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { ThemeToggle } from '@/components/ThemeToggle';

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
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6">
      <div className="flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold hover:underline">
          <ArrowLeft className="size-4" /> 返回图库
        </Link>
        <ThemeToggle />
      </div>
      <div className="flex min-h-[70vh] flex-col overflow-hidden rounded-xl border border-ink bg-panel md:h-[calc(100dvh-7rem)]">
        {detail.data ? (
          <CaseDetailView item={detail.data} prevId={prevId} nextId={nextId} onNavigate={goTo} titleAs="h1" />
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
