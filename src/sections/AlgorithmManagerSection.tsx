import { useState } from 'react';
import { trpc } from '@/providers/trpc';
import {
  RefreshCw,
  Plus, Play, Database
} from 'lucide-react';

const ALGO_TYPES = [
  { id: 'general', name: '通用文生图', color: 'bg-blue-100 text-blue-700' },
  { id: 'product_fidelity', name: '商品保真', color: 'bg-green-100 text-green-700' },
  { id: 'controlnet', name: '结构约束', color: 'bg-purple-100 text-purple-700' },
  { id: 'lora', name: '领域LoRA', color: 'bg-orange-100 text-orange-700' },
  { id: 'upscaler', name: '超分增强', color: 'bg-pink-100 text-pink-700' },
  { id: 'compliance', name: '合规净化', color: 'bg-gray-100 text-gray-700' },
];

export default function AlgorithmManagerSection() {
  const [seeding, setSeeding] = useState(false);
  const [testCategory, setTestCategory] = useState('3c');
  const [testScene, setTestScene] = useState('white');
  const [testMode, setTestMode] = useState<'single' | 'parallel'>('single');

  // tRPC queries
  const algorithms = trpc.algorithm.list.useQuery();
  const testMatch = trpc.algorithm.testMatch.useQuery(
    { category: testCategory, sceneType: testScene, colorTone: 'cool', lightMode: 'soft', mode: testMode },
    { enabled: false }
  );
  const seedMutation = trpc.algorithm.seed.useMutation({
    onSuccess: () => algorithms.refetch(),
  });

  const handleSeed = async () => {
    setSeeding(true);
    await seedMutation.mutateAsync();
    setSeeding(false);
  };

  const handleTest = () => {
    testMatch.refetch();
  };

  return (
    <section className="bg-[#F3F4F2] py-32" id="algorithms">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold text-[#131415] mb-4">
            算法模型管理
          </h2>
          <p className="text-base text-[#666C74] max-w-2xl mx-auto">
            多算法组合调度架构。按品类/用途/风格自动路由匹配最佳生图算法，支持单算法、并行择优、自适应三种模式。
          </p>
        </div>

        {/* Algorithm Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-[#DDDDDD] p-4 text-center">
            <div className="text-2xl font-bold text-[#131415]">{algorithms.data?.length || 0}</div>
            <div className="text-xs text-[#666C74]">算法数量</div>
          </div>
          <div className="bg-white rounded-lg border border-[#DDDDDD] p-4 text-center">
            <div className="text-2xl font-bold text-[#22c55e]">
              {algorithms.data?.filter(a => a.enabled).length || 0}
            </div>
            <div className="text-xs text-[#666C74]">已启用</div>
          </div>
          <div className="bg-white rounded-lg border border-[#DDDDDD] p-4 text-center">
            <div className="text-2xl font-bold text-[#FF003C]">
              {new Set(algorithms.data?.map(a => a.type)).size || 0}
            </div>
            <div className="text-xs text-[#666C74]">算法类型</div>
          </div>
          <div className="bg-white rounded-lg border border-[#DDDDDD] p-4 text-center">
            <div className="text-2xl font-bold text-[#666C74]">
              {algorithms.data?.filter(a => a.avgScore && a.avgScore >= 85).length || 0}
            </div>
            <div className="text-xs text-[#666C74]">高分算法(≥85)</div>
          </div>
        </div>

        {/* Seed Button */}
        {(!algorithms.data || algorithms.data.length === 0) && (
          <div className="bg-white rounded-lg border border-[#DDDDDD] p-8 text-center mb-8">
            <Database size={32} className="mx-auto mb-3 text-[#666C74]" />
            <p className="text-sm text-[#666C74] mb-4">算法库为空，请先初始化默认算法数据</p>
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="gradient-btn px-6 py-2 text-white rounded font-medium flex items-center gap-2 mx-auto disabled:opacity-50"
            >
              {seeding ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
              初始化默认算法库
            </button>
          </div>
        )}

        {/* Algorithm List */}
        {algorithms.data && algorithms.data.length > 0 && (
          <div className="bg-white rounded-lg border border-[#DDDDDD] overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-[#DDDDDD] flex items-center justify-between">
              <h3 className="font-bold text-[#131415]">算法库列表</h3>
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="text-xs text-[#FF003C] hover:underline flex items-center gap-1 disabled:opacity-50"
              >
                <RefreshCw size={12} className={seeding ? 'animate-spin' : ''} />
                重置默认数据
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#E7E9E6]">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-[#666C74]">名称</th>
                    <th className="text-left px-4 py-3 font-medium text-[#666C74]">类型</th>
                    <th className="text-left px-4 py-3 font-medium text-[#666C74]">适配品类</th>
                    <th className="text-left px-4 py-3 font-medium text-[#666C74]">用途</th>
                    <th className="text-left px-4 py-3 font-medium text-[#666C74]">优先级</th>
                    <th className="text-left px-4 py-3 font-medium text-[#666C74]">成功率</th>
                    <th className="text-left px-4 py-3 font-medium text-[#666C74]">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {algorithms.data.map((algo) => {
                    const typeInfo = ALGO_TYPES.find(t => t.id === algo.type);
                    const cats = (algo.categories || []) as string[];
                    const scenes = (algo.scenes || []) as string[];
                    return (
                      <tr key={algo.id} className="border-t border-[#DDDDDD] hover:bg-[#F3F4F2]">
                        <td className="px-4 py-3">
                          <div className="font-medium text-[#131415]">{algo.name}</div>
                          <div className="text-xs text-[#666C74]">{algo.description?.slice(0, 40)}...</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs ${typeInfo?.color || 'bg-gray-100'}`}>
                            {typeInfo?.name || algo.type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {cats.slice(0, 3).map(c => (
                              <span key={c} className="text-[10px] px-1.5 py-0.5 bg-[#E7E9E6] rounded text-[#666C74]">
                                {c === '*' ? '全部' : c}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {scenes.slice(0, 3).map(s => (
                              <span key={s} className="text-[10px] px-1.5 py-0.5 bg-[#E7E9E6] rounded text-[#666C74]">
                                {s === '*' ? '全部' : s}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#131415]">{algo.priority}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-[#E7E9E6] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[#22c55e]"
                                style={{ width: `${algo.successRate || 0}%` }}
                              />
                            </div>
                            <span className="text-xs text-[#666C74]">{algo.successRate || 0}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded ${
                            algo.enabled ? 'bg-[#22c55e]/10 text-[#22c55e]' : 'bg-[#ef4444]/10 text-[#ef4444]'
                          }`}>
                            {algo.enabled ? '启用' : '禁用'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Algorithm Router Test */}
        <div className="bg-white rounded-lg border border-[#DDDDDD] p-6">
          <h3 className="font-bold text-[#131415] mb-4 flex items-center gap-2">
            <Play size={16} /> 算法路由匹配测试
          </h3>
          <p className="text-sm text-[#666C74] mb-4">
            输入商品参数，测试后端算法路由引擎的匹配结果
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-xs text-[#666C74] block mb-1">品类</label>
              <select
                value={testCategory}
                onChange={(e) => setTestCategory(e.target.value)}
                className="w-full px-3 py-2 border border-[#DDDDDD] rounded text-sm"
              >
                <option value="3c">3C数码</option>
                <option value="fashion">服饰鞋包</option>
                <option value="home">家居日用</option>
                <option value="beauty">美妆个护</option>
                <option value="appliance">家电</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[#666C74] block mb-1">用途</label>
              <select
                value={testScene}
                onChange={(e) => setTestScene(e.target.value)}
                className="w-full px-3 py-2 border border-[#DDDDDD] rounded text-sm"
              >
                <option value="white">白底图</option>
                <option value="scene">场景图</option>
                <option value="detail">细节图</option>
                <option value="banner">Banner</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[#666C74] block mb-1">模式</label>
              <select
                value={testMode}
                onChange={(e) => setTestMode(e.target.value as any)}
                className="w-full px-3 py-2 border border-[#DDDDDD] rounded text-sm"
              >
                <option value="single">单算法</option>
                <option value="parallel">并行择优</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleTest}
            disabled={testMatch.isFetching}
            className="gradient-btn px-6 py-2 text-white rounded font-medium flex items-center gap-2 disabled:opacity-50"
          >
            {testMatch.isFetching ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
            测试路由匹配
          </button>

          {/* Test Results */}
          {testMatch.data && testMatch.data.length > 0 && (
            <div className="mt-4 space-y-3">
              <h4 className="text-sm font-medium text-[#131415]">匹配结果（按适配度排序）</h4>
              {testMatch.data.map((match: any, i: number) => (
                <div
                  key={match.id}
                  className={`p-4 rounded-lg border ${
                    i === 0 ? 'border-[#FF003C] bg-[#FFF0F3]' : 'border-[#DDDDDD]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#131415]">{match.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        ALGO_TYPES.find(t => t.id === match.type)?.color || 'bg-gray-100'
                      }`}>
                        {ALGO_TYPES.find(t => t.id === match.type)?.name || match.type}
                      </span>
                      {i === 0 && (
                        <span className="text-xs px-2 py-0.5 bg-[#FF003C] text-white rounded">
                          主算法
                        </span>
                      )}
                    </div>
                    <div className="text-lg font-bold text-[#131415]">{match.score}分</div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {match.reasons.map((r: string) => (
                      <span key={r} className="text-[10px] px-1.5 py-0.5 bg-white rounded text-[#666C74] border border-[#DDDDDD]">
                        {r}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 text-xs text-[#666C74]">
                    优先级: {match.priority} | 历史成功率: {match.successRate || 0}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
