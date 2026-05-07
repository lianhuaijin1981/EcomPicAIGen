/**
 * 任务历史页面
 * 路由: /history
 */
import { useState } from 'react';
import { Link } from 'react-router';
import { trpc } from '@/providers/trpc';
import GradientButton from '@/components/GradientButton';
import { RefreshCw, Trash2, Download, Clock, Image, Star, AlertTriangle } from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: '等待中', color: 'text-[#666C74]', bg: 'bg-[#E7E9E6]' },
  generating: { label: '生成中', color: 'text-[#FF003C]', bg: 'bg-[#FFF0F3]' },
  completed: { label: '已完成', color: 'text-[#22c55e]', bg: 'bg-[#22c55e]/10' },
  failed: { label: '失败', color: 'text-[#ef4444]', bg: 'bg-[#ef4444]/10' },
};

export default function HistoryPage() {
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  const tasksQuery = trpc.history.listTasks.useQuery(
    { limit: PAGE_SIZE, offset: page * PAGE_SIZE },
    { refetchOnWindowFocus: false }
  );

  const statsQuery = trpc.history.stats.useQuery(undefined, {
    enabled: false,
  });

  const deleteMutation = trpc.history.deleteTask.useMutation({
    onSuccess: () => {
      tasksQuery.refetch();
    },
  });

  const tasks = tasksQuery.data ?? [];
  const isLoading = tasksQuery.isFetching;

  return (
    <div className="min-h-screen bg-[#F3F4F2]">
      {/* Header */}
      <div className="bg-white border-b border-[#DDDDDD] px-6 py-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-[#131415]">任务历史</h1>
              <p className="text-sm text-[#666C74] mt-0.5">查看所有生成任务记录</p>
            </div>
            <Link to="/#generator">
              <GradientButton className="text-xs">新建任务</GradientButton>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: '总任务数', value: statsQuery.data?.totalTasks ?? '—', icon: Clock },
            { label: '生成图片', value: statsQuery.data?.totalImages ?? '—', icon: Image },
            { label: '合格图片', value: statsQuery.data?.passImages ?? '—', icon: Star },
            { label: '平均得分', value: statsQuery.data?.avgScore ?? '—', icon: Star },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-white rounded-lg border border-[#DDDDDD] p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#FFF0F3] flex items-center justify-center">
                  <Icon size={18} className="text-[#FF003C]" />
                </div>
                <div>
                  <div className="text-xl font-bold text-[#131415]">{s.value}</div>
                  <div className="text-xs text-[#666C74]">{s.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Task List */}
        <div className="bg-white rounded-lg border border-[#DDDDDD] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#DDDDDD] flex items-center justify-between">
            <h2 className="font-bold text-[#131415]">任务列表</h2>
            <span className="text-sm text-[#666C74]">共 {tasks.length} 条</span>
          </div>

          {isLoading ? (
            <div className="p-12 text-center">
              <RefreshCw size={24} className="mx-auto text-[#666C74] animate-spin" />
              <p className="mt-2 text-sm text-[#666C74]">加载中...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-12 text-center">
              <Image size={32} className="mx-auto text-[#DDDDDD] mb-3" />
              <p className="text-[#666C74] mb-4">暂无生成任务</p>
              <Link to="/#generator">
                <GradientButton className="text-xs">开始生成</GradientButton>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#DDDDDD]">
              {tasks.map((task) => {
                const config = task.config as Record<string, string>;
                const statusCfg = STATUS_CONFIG[task.status ?? 'pending'];
                const passRate = task.totalCount && task.totalCount > 0
                  ? Math.round((task.passCount ?? 0) / task.totalCount * 100)
                  : 0;

                return (
                  <div key={task.id} className="px-6 py-4 hover:bg-[#F3F4F2] transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Task Info */}
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-sm font-medium text-[#131415]">
                            任务 #{task.id}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded ${statusCfg.color} ${statusCfg.bg}`}>
                            {statusCfg.label}
                          </span>
                          <span className="text-xs text-[#666C74]">
                            {config.category ?? '—'} · {config.sceneType ?? '—'} · {config.ratio ?? '1:1'}
                          </span>
                        </div>

                        {/* Sub Info */}
                        <div className="flex items-center gap-4 mt-1.5 text-xs text-[#666C74]">
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {task.createdAt ? new Date(task.createdAt).toLocaleString('zh-CN') : '—'}
                          </span>
                          {task.totalCount !== null && (
                            <span className="flex items-center gap-1">
                              <Image size={12} />
                              {task.totalCount} 张
                            </span>
                          )}
                          {task.avgScore !== null && (
                            <span className="flex items-center gap-1 text-[#FF003C]">
                              <Star size={12} />
                              平均 {task.avgScore} 分
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {task.status === 'completed' && (
                          <Link
                            to={`/?taskId=${task.id}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#DDDDDD] rounded text-xs text-[#666C74] hover:border-[#FF003C] hover:text-[#FF003C] transition-colors"
                          >
                            <Download size={12} />
                            查看
                          </Link>
                        )}
                        <button
                          onClick={() => deleteMutation.mutate({ taskId: task.id })}
                          disabled={deleteMutation.isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-[#DDDDDD] rounded text-xs text-[#666C74] hover:border-[#ef4444] hover:text-[#ef4444] transition-colors disabled:opacity-50"
                        >
                          <Trash2 size={12} />
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {tasks.length > 0 && (
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-2 border border-[#DDDDDD] rounded text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#FF003C] transition-colors"
            >
              上一页
            </button>
            <span className="text-sm text-[#666C74]">第 {page + 1} 页</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={tasks.length < PAGE_SIZE}
              className="px-4 py-2 border border-[#DDDDDD] rounded text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#FF003C] transition-colors"
            >
              下一页
            </button>
          </div>
        )}

        {/* Login Prompt */}
        <div className="mt-6 p-4 bg-[#fff8e1] border border-[#f59e0b] rounded-lg flex items-start gap-3">
          <AlertTriangle size={16} className="text-[#92400e] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-[#92400e]">登录后查看专属任务历史</p>
            <Link to="/auth" className="text-xs text-[#FF003C] hover:underline mt-0.5 inline-block">
              登录 / 注册 →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
