/**
 * 导出 ZIP 打包工具（前端实现）
 * 使用 JSZip 在浏览器端打包多张图片
 * 路由：/export
 */
import { useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router';
import { trpc } from '@/providers/trpc';
import GradientButton from '@/components/GradientButton';
import { Download, Package, Image, RefreshCw, CheckCircle, X } from 'lucide-react';

export default function ExportPage() {
  const [searchParams] = useSearchParams();
  const taskId = Number(searchParams.get('taskId') ?? 0);
  const [packaging, setPackaging] = useState(false);
  const [packaged, setPackaged] = useState(false);

  const exportListQuery = trpc.export.getExportList.useQuery(
    { taskId },
    { enabled: !!taskId }
  );

  const items = exportListQuery.data ?? [];
  const passCount = items.length;

  // 使用 JSZip 打包下载（动态 import 避免 SSR 问题）
  const handleBatchDownload = useCallback(async () => {
    if (items.length === 0) return;
    setPackaging(true);

    try {
      // 动态加载 JSZip（通过 CDN 或本地 bundle）
      const JSZip = (await import('jszip')).default;

      const zip = new JSZip();
      const folder = zip.folder('EcomPicAIGen_exports');

      // 并行下载所有图片并添加到 ZIP
      const downloadTasks = items.map(async (item) => {
        try {
          if (!item.generatedImage) return;
          const url = item.generatedImage.startsWith('/')
            ? window.location.origin + item.generatedImage
            : item.generatedImage;

          const response = await fetch(url);
          const blob = await response.blob();
          folder?.file(item.filename ?? `${item.skuName}.jpg`, blob);
        } catch (e) {
          console.warn(`Failed to download ${item.skuName}:`, e);
        }
      });

      await Promise.all(downloadTasks);

      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `EcomPicAIGen_task_${taskId}_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setPackaged(true);
    } catch (err) {
      console.error('Packaging failed:', err);
      alert('打包失败，请稍后重试');
    } finally {
      setPackaging(false);
    }
  }, [items, taskId]);

  if (!taskId) {
    return (
      <div className="min-h-screen bg-[#F3F4F2] flex items-center justify-center">
        <div className="text-center">
          <X size={48} className="mx-auto text-[#DDDDDD] mb-4" />
          <p className="text-[#666C74] mb-4">无效的任务 ID</p>
          <Link to="/" className="text-[#FF003C] hover:underline">返回首页</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F4F2]">
      {/* Header */}
      <div className="bg-white border-b border-[#DDDDDD] px-6 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-[#131415]">批量导出</h1>
              <p className="text-sm text-[#666C74] mt-0.5">任务 #{taskId} · {passCount} 张合格图片</p>
            </div>
            <Link to="/" className="text-sm text-[#666C74] hover:text-[#131415]">
              ← 返回首页
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Batch Download Card */}
        <div className="bg-white rounded-xl border border-[#DDDDDD] p-8 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-[#FFF0F3] flex items-center justify-center">
              <Package size={24} className="text-[#FF003C]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#131415]">打包 ZIP 下载</h2>
              <p className="text-sm text-[#666C74]">
                一键将 {passCount} 张合格图片打包为 ZIP 文件
              </p>
            </div>
          </div>

          {exportListQuery.isLoading ? (
            <div className="flex items-center gap-3 text-sm text-[#666C74]">
              <RefreshCw size={16} className="animate-spin" />
              加载导出列表...
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8">
              <Image size={32} className="mx-auto text-[#DDDDDD] mb-3" />
              <p className="text-[#666C74]">暂无合格图片可导出</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
                {items.map((item) => (
                  <div key={item.id} className="rounded overflow-hidden border border-[#DDDDDD]">
                    {item.generatedImage && (
                      <img
                        src={item.generatedImage}
                        alt={item.skuName}
                        className="w-full aspect-square object-cover"
                      />
                    )}
                    <div className="p-2 text-center">
                      <p className="text-xs text-[#131415] truncate">{item.skuName}</p>
                      <p className="text-xs text-[#22c55e]">{item.totalScore}分</p>
                    </div>
                  </div>
                ))}
              </div>

              <GradientButton
                onClick={handleBatchDownload}
                disabled={packaging || packaged}
                className="w-full justify-center"
              >
                {packaging ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw size={16} className="animate-spin" />
                    打包中...
                  </span>
                ) : packaged ? (
                  <span className="flex items-center gap-2">
                    <CheckCircle size={16} />
                    下载完成
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Download size={16} />
                    下载 ZIP（{passCount} 张）
                  </span>
                )}
              </GradientButton>

              <p className="text-xs text-[#666C74] mt-3 text-center">
                打包过程完全在本地浏览器完成，不经过服务器，图片不会泄露
              </p>
            </>
          )}
        </div>

        {/* Link back */}
        <p className="text-center text-sm text-[#666C74]">
          <Link to="/history" className="text-[#FF003C] hover:underline">
            查看任务历史 →
          </Link>
        </p>
      </div>
    </div>
  );
}
