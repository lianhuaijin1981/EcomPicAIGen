import { useState } from 'react';
import { trpc } from '@/providers/trpc';
import {
  RefreshCw,
  Plus, Database
} from 'lucide-react';

const ALGO_TYPES: Record<string, { name: string; color: string }> = {
  general: { name: '通用文生图', color: 'bg-blue-100 text-blue-700' },
  product_fidelity: { name: '商品保真', color: 'bg-green-100 text-green-700' },
  controlnet: { name: '结构约束', color: 'bg-purple-100 text-purple-700' },
  lora: { name: '领域LoRA', color: 'bg-orange-100 text-orange-700' },
  upscaler: { name: '超分增强', color: 'bg-pink-100 text-pink-700' },
  compliance: { name: '合规净化', color: 'bg-gray-100 text-gray-700' },
};

export default function AlgorithmManagerSection() {
  const [seeding, setSeeding] = useState(false);

  // tRPC queries
  const strategies = trpc.imageGen.listStrategies.useQuery();
  const seedMutation = trpc.algorithm.seed.useMutation({
    onSuccess: () => {
      // no refetch needed for listStrategies
    },
  });

  const handleSeed = async () => {
    setSeeding(true);
    await seedMutation.mutateAsync();
    setSeeding(false);
  };

  return (
    <section className="bg-[#F3F4F2] py-32" id="algorithms">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold text-[#131415] mb-4">
            算法策略引擎
          </h2>
          <p className="text-base text-[#666C74] max-w-2xl mx-auto">
            6大差异化算法策略，按品类/场景自动路由匹配。每个策略包含独立的 Prompt 构建器、评分权重和模拟延迟。
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-[#DDDDDD] p-4 text-center">
            <div className="text-2xl font-bold text-[#131415]">{strategies.data?.length || 0}</div>
            <div className="text-xs text-[#666C74]">内置策略</div>
          </div>
          <div className="bg-white rounded-lg border border-[#DDDDDD] p-4 text-center">
            <div className="text-2xl font-bold text-[#FF003C]">
              {new Set(strategies.data?.map(a => a.type)).size || 0}
            </div>
            <div className="text-xs text-[#666C74]">算法类型</div>
          </div>
          <div className="bg-white rounded-lg border border-[#DDDDDD] p-4 text-center">
            <div className="text-2xl font-bold text-[#22c55e]">3</div>
            <div className="text-xs text-[#666C74]">调度模式</div>
          </div>
        </div>

        {/* Strategy List */}
        <div className="bg-white rounded-lg border border-[#DDDDDD] overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-[#DDDDDD] flex items-center justify-between">
            <h3 className="font-bold text-[#131415]">算法策略列表</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#E7E9E6]">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-[#666C74]">策略名称</th>
                  <th className="text-left px-4 py-3 font-medium text-[#666C74]">类型</th>
                  <th className="text-left px-4 py-3 font-medium text-[#666C74]">适配品类</th>
                  <th className="text-left px-4 py-3 font-medium text-[#666C74]">适配场景</th>
                  <th className="text-left px-4 py-3 font-medium text-[#666C74]">优先级</th>
                  <th className="text-left px-4 py-3 font-medium text-[#666C74]">模拟延迟</th>
                </tr>
              </thead>
              <tbody>
                {strategies.data?.map((s) => {
                  const typeInfo = ALGO_TYPES[s.type];
                  return (
                    <tr key={s.id} className="border-t border-[#DDDDDD] hover:bg-[#F3F4F2]">
                      <td className="px-4 py-3">
                        <div className="font-medium text-[#131415]">{s.name}</div>
                        <div className="text-xs text-[#666C74]">{s.description}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${typeInfo?.color || 'bg-gray-100'}`}>
                          {typeInfo?.name || s.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {s.matchCategories.slice(0, 3).map(c => (
                            <span key={c} className="text-[10px] px-1.5 py-0.5 bg-[#E7E9E6] rounded text-[#666C74]">
                              {c === '*' ? '全部' : c}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {s.matchScenes.slice(0, 3).map(s => (
                            <span key={s} className="text-[10px] px-1.5 py-0.5 bg-[#E7E9E6] rounded text-[#666C74]">
                              {s === '*' ? '全部' : s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#131415]">{s.priority}</td>
                      <td className="px-4 py-3 text-[#666C74]">{s.simulateDelay}ms</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Algorithm Config (legacy table) */}
        <div className="bg-white rounded-lg border border-[#DDDDDD] overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-[#DDDDDD] flex items-center justify-between">
            <h3 className="font-bold text-[#131415]">数据库算法配置</h3>
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="gradient-btn px-4 py-2 text-white rounded text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {seeding ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
              初始化默认算法库
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#E7E9E6]">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-[#666C74]">名称</th>
                  <th className="text-left px-4 py-3 font-medium text-[#666C74]">类型</th>
                  <th className="text-left px-4 py-3 font-medium text-[#666C74]">状态</th>
                </tr>
              </thead>
              <tbody>
                {/* This section shows DB records, separate from in-memory strategies */}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info */}
        <div className="bg-white rounded-lg border border-[#DDDDDD] p-6">
          <h3 className="font-bold text-[#131415] mb-4 flex items-center gap-2">
            <Database size={16} /> 算法引擎架构说明
          </h3>
          <div className="space-y-3 text-sm text-[#666C74]">
            <p>每个算法策略包含以下独立组件：</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong className="text-[#131415]">匹配条件</strong>：品类标签、场景标签、风格标签，用于路由引擎筛选</li>
              <li><strong className="text-[#131415]">Prompt 构建器</strong>：根据输入参数（SKU名称/品类/场景/色调/光影）生成差异化英文 Prompt</li>
              <li><strong className="text-[#131415]">评分权重</strong>：算法在各维度的先天优势/劣势（如 ControlNet 决策引导力+4，通用模型视觉+2）</li>
              <li><strong className="text-[#131415]">模拟延迟</strong>：模拟真实 API 调用耗时（2.8s ~ 5s）</li>
            </ul>
            <p className="mt-2">路由匹配规则：品类匹配(+40) → 场景匹配(+30) → 优先级加成(+0~20) = 综合得分，按得分排序分配算法。</p>
          </div>
        </div>
      </div>
    </section>
  );
}
