import { useQuery } from '@tanstack/react-query';
import { DatabaseZap, RefreshCw } from 'lucide-react';
import { useState } from 'react';

import { adminApi, publicApi, type ImportRunOut } from '@/api/endpoints';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { formatDateTime } from '@/lib/utils';

import { DataTable, PageHeader, Panel, useAdminMutation } from './shared';

const STATUS: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' }> = {
  succeeded: { label: '成功', variant: 'success' },
  running: { label: '进行中', variant: 'warning' },
  failed: { label: '失败', variant: 'danger' },
};

function duration(run: ImportRunOut): string {
  if (!run.finished_at) return '—';
  const seconds = (new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) / 1000;
  return seconds < 60 ? `${seconds.toFixed(1)} 秒` : `${(seconds / 60).toFixed(1)} 分钟`;
}

export function ImportsPage() {
  const [openId, setOpenId] = useState<number | null>(null);
  const runs = useQuery({
    queryKey: ['admin', 'imports'],
    queryFn: adminApi.imports,
    // 有任务在跑时每 2 秒刷新一次
    refetchInterval: (query) => (query.state.data?.some((run) => run.status === 'running') ? 2000 : false),
  });
  const meta = useQuery({ queryKey: ['meta'], queryFn: publicApi.meta });
  const running = runs.data?.some((run) => run.status === 'running');

  const trigger = useAdminMutation(adminApi.triggerImport, { success: '导入任务已开始，完成后会自动重建搜索索引' });
  const reindex = useAdminMutation(adminApi.reindex, { success: (result) => result.message });

  return (
    <>
      <PageHeader
        title="导入与索引"
        description="上游素材随仓库提交在 resources/image-inspirer。更新流程：替换快照并提交 → 部署 → 在这里重新导入。"
        actions={
          <>
            <Button variant="outline" disabled={reindex.isPending} onClick={() => reindex.mutate(undefined)}>
              <RefreshCw className={reindex.isPending ? 'animate-spin' : ''} /> 重建搜索索引
            </Button>
            <Button
              variant="accent"
              disabled={running || trigger.isPending}
              onClick={() => confirm('重新导入上游快照？已手工修改的字段不会被覆盖。') && trigger.mutate(undefined)}
            >
              <DatabaseZap /> {running ? '导入中…' : '重新导入上游快照'}
            </Button>
          </>
        }
      />

      <Panel className="flex flex-wrap gap-6 p-4 text-sm">
        <span>
          当前快照 commit：<code className="font-mono">{meta.data?.upstream.commit || '—'}</code>
        </span>
        <span>
          搜索服务：
          {meta.data ? (
            meta.data.search_available ? (
              <Badge variant="success">正常</Badge>
            ) : (
              <Badge variant="danger">不可用（前台已降级为数据库查询）</Badge>
            )
          ) : (
            '…'
          )}
        </span>
        <span>
          已发布：{meta.data?.total ?? '…'} 条（有图 {meta.data?.with_image ?? '…'}）
        </span>
      </Panel>

      <DataTable
        className="min-w-[720px]"
        columns={[
          { label: '#' },
          { label: '状态' },
          { label: '触发' },
          { label: '上游 commit' },
          { label: '开始时间' },
          { label: '耗时' },
          { label: '新增 / 更新 / 未变 / 失败' },
          { label: <span className="sr-only">操作</span> },
        ]}
        loading={runs.isPending}
        empty={runs.data?.length === 0 && '还没有导入记录'}
      >
            {runs.data?.map((run) => (
              <tr key={run.id}>
                <td>{run.id}</td>
                <td>
                  <Badge variant={STATUS[run.status]?.variant}>{STATUS[run.status]?.label ?? run.status}</Badge>
                </td>
                <td>{run.trigger === 'admin' ? '后台' : '命令行'}</td>
                <td className="font-mono text-xs">{run.upstream_commit.slice(0, 7) || '—'}</td>
                <td className="text-xs whitespace-nowrap">{formatDateTime(run.started_at)}</td>
                <td className="text-xs">{duration(run)}</td>
                <td>
                  {run.created} / {run.updated} / {run.skipped} /{' '}
                  <span className={run.failed ? 'font-bold text-danger' : ''}>{run.failed}</span>
                </td>
                <td className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => setOpenId(run.id)}>
                    查看日志
                  </Button>
                </td>
              </tr>
            ))}
      </DataTable>

      {openId !== null && <ImportLogDialog id={openId} onClose={() => setOpenId(null)} />}
    </>
  );
}

function ImportLogDialog({ id, onClose }: { id: number; onClose: () => void }) {
  const detail = useQuery({ queryKey: ['admin', 'imports', id], queryFn: () => adminApi.importDetail(id) });
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="h-fit max-w-3xl" aria-describedby={undefined}>
        <div className="flex max-h-[80vh] flex-col gap-3 p-6">
          <DialogTitle className="pr-12 text-lg font-bold">导入 #{id} 日志</DialogTitle>
          <pre className="min-h-40 overflow-auto rounded-card border border-border bg-fg/[0.04] p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">
            {detail.data?.log || (detail.isPending ? '加载中…' : '（无日志）')}
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  );
}
