import { useState, useRef, useCallback, useEffect } from 'react';
import { trpc } from '@/providers/trpc';
import {
  Upload, X, Image as ImageIcon,
  Wand2, CheckCircle, Download,
  ShoppingBag, ChevronRight, Trash2, RefreshCw,
  Smartphone, Shirt, Home, Sparkles, Zap,
  Package, Eye, MousePointer
} from 'lucide-react';

// ============== 类型定义 ==============
interface UploadedFile {
  id: string;
  name: string;
  preview: string;
  size: number;
}

interface GenConfig {
  category: string;
  sceneType: string;
  colorTone: string;
  lightMode: string;
  ratio: string;
  platform: string;
}

// ============== 示例素材 ==============
const SAMPLE_PRODUCTS = [
  { name: '无线耳机', image: '/images/products/02_earbuds.jpg' },
  { name: '机械键盘', image: '/images/products/07_keyboard.jpg' },
  { name: '智能手表', image: '/images/products/10_smartwatch.jpg' },
  { name: '运动鞋', image: '/images/products/15_sneakers.jpg' },
  { name: '背包', image: '/images/products/17_backpack.jpg' },
];

// ============== 配置选项 ==============
const CATEGORIES = [
  { id: '3c', name: '3C数码', icon: Smartphone },
  { id: 'fashion', name: '服饰鞋包', icon: Shirt },
  { id: 'home', name: '家居日用', icon: Home },
  { id: 'beauty', name: '美妆个护', icon: Sparkles },
  { id: 'appliance', name: '家电', icon: Zap },
];

const SCENE_TYPES = [
  { id: 'white', name: '白底图', desc: '纯白背景，突出产品' },
  { id: 'scene', name: '场景图', desc: '真实场景，增强代入感' },
  { id: 'detail', name: '细节图', desc: '微距特写，展示工艺' },
];

const COLOR_TONES = [
  { id: 'cool', name: '冷色', color: 'bg-blue-100 text-blue-600' },
  { id: 'warm', name: '暖色', color: 'bg-orange-100 text-orange-600' },
  { id: 'gray', name: '高级灰', color: 'bg-gray-200 text-gray-600' },
];

const LIGHT_MODES = [
  { id: 'soft', name: '柔和' },
  { id: 'realistic', name: '写实' },
  { id: '3d', name: '立体' },
];

const RATIOS = [
  { id: '1:1', name: '1:1', desc: '淘宝/京东主图' },
  { id: '3:4', name: '3:4', desc: '详情页竖图' },
  { id: '9:16', name: '9:16', desc: '抖音/快手' },
];

const PLATFORMS = [
  { id: 'taobao', name: '淘宝' },
  { id: 'jd', name: '京东' },
  { id: 'amazon', name: '亚马逊' },
  { id: 'douyin', name: '抖音电商' },
];

export default function WorkflowSection() {
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [config, setConfig] = useState<GenConfig>({
    category: '3c',
    sceneType: 'white',
    colorTone: 'cool',
    lightMode: 'soft',
    ratio: '1:1',
    platform: 'taobao',
  });
  const [progress, setProgress] = useState(0);
  const [taskId, setTaskId] = useState<number | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [selectedResult, setSelectedResult] = useState<number | null>(null);
  const [taskComplete, setTaskComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // tRPC mutations
  const createTask = trpc.imageGen.createTask.useMutation();
  const generate = trpc.imageGen.generate.useMutation();
  const regenerateOne = trpc.imageGen.regenerateOne.useMutation();

  // Query for results when on step 4
  const resultsQuery = trpc.imageGen.getResults.useQuery(
    { taskId: taskId! },
    { enabled: !!taskId && step === 4, refetchInterval: taskComplete ? false : 1000 }
  );

  // Update local results when query data changes
  useEffect(() => {
    if (resultsQuery.data && resultsQuery.data.length > 0) {
      setResults(resultsQuery.data);
      const completed = resultsQuery.data.every((r: any) => r.generatedImage);
      if (completed) setTaskComplete(true);
    }
  }, [resultsQuery.data]);

  // 拖拽上传
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter(
      f => f.type.startsWith('image/')
    );
    handleFiles(dropped);
  }, []);

  const handleFiles = (fileList: File[]) => {
    fileList.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFiles(prev => [...prev, {
          id: Math.random().toString(36).slice(2),
          name: file.name,
          preview: e.target?.result as string,
          size: file.size,
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const useSamples = () => {
    setFiles(SAMPLE_PRODUCTS.map((p, i) => ({
      id: `sample-${i}`,
      name: p.name,
      preview: p.image,
      size: 0,
    })));
  };

  // ===== 开始生成：先创建任务，再执行生成 =====
  const startGenerate = async () => {
    if (files.length === 0) return;

    try {
      // Step 1: 创建任务
      const task = await createTask.mutateAsync({
        config,
        files: files.map(f => ({ name: f.name, preview: f.preview, size: f.size })),
      });

      setTaskId(task.taskId);
      setStep(3);
      setProgress(0);
      setTaskComplete(false);

      // 模拟进度条动画
      const duration = 3000;
      const interval = 50;
      let current = 0;
      const timer = setInterval(() => {
        current += (interval / duration) * 100;
        if (current >= 100) {
          current = 100;
          clearInterval(timer);
        }
        setProgress(Math.min(current, 100));
      }, interval);

      // Step 2: 调用后端生成
      const genResult = await generate.mutateAsync({ taskId: task.taskId });

      clearInterval(timer);
      setProgress(100);
      setResults(genResult.results);
      setStep(4);
    } catch (err) {
      console.error('Generate failed:', err);
      alert('生成失败，请重试');
    }
  };

  // ===== 重新生成单张 =====
  const handleRegenerate = async (resultId: number) => {
    try {
      const updated = await regenerateOne.mutateAsync({ resultId });
      setResults(prev => prev.map(r => r.id === updated.id ? updated : r));
    } catch (err) {
      console.error('Regenerate failed:', err);
    }
  };

  const exportAll = () => {
    setStep(5);
  };

  const steps = [
    { num: 1, title: '素材上传' },
    { num: 2, title: '参数配置' },
    { num: 3, title: 'AI生成' },
    { num: 4, title: '质量校验' },
    { num: 5, title: '导出上架' },
  ];

  // 计算统计数据
  const avgScore = results.length > 0
    ? Math.round(results.reduce((a, r) => a + (r.totalScore || 0), 0) / results.length)
    : 0;
  const passCount = results.filter((r: any) => r.status === 'PASS').length;
  const failCount = results.filter((r: any) => r.status === 'FAIL').length;

  return (
    <section className="bg-[#F3F4F2] py-32" id="generator">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-[#131415] mb-4">
            体验 AI 主图生成工作流
          </h2>
          <p className="text-base text-[#666C74] max-w-2xl mx-auto">
            前端上传 → 后端 Prompt 工程 → AI 生成 → 质量评分 → 数据库存储。全栈实时演示。
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center gap-2 md:gap-4">
            {steps.map((s, i) => (
              <div key={s.num} className="flex items-center">
                <div className={`flex items-center gap-2 px-3 py-2 rounded ${
                  step === s.num
                    ? 'bg-[#131415] text-white'
                    : step > s.num
                    ? 'bg-[#E7E9E6] text-[#131415]'
                    : 'bg-white text-[#666C74] border border-[#DDDDDD]'
                }`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    step === s.num
                      ? 'bg-white text-[#131415]'
                      : step > s.num
                      ? 'bg-[#131415] text-white'
                      : 'bg-[#E7E9E6] text-[#666C74]'
                  }`}>
                    {step > s.num ? <CheckCircle size={14} /> : s.num}
                  </span>
                  <span className="text-sm font-medium hidden md:inline">{s.title}</span>
                </div>
                {i < steps.length - 1 && (
                  <ChevronRight size={16} className="text-[#DDDDDD] mx-1" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ====== Step 1: 素材上传 ====== */}
        {step === 1 && (
          <div className="max-w-3xl mx-auto">
            <div
              className="border-2 border-dashed border-[#DDDDDD] rounded-lg p-12 text-center hover:border-[#FF003C] transition-colors cursor-pointer bg-white"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFiles(Array.from(e.target.files || []))}
              />
              <Upload size={48} className="mx-auto mb-4 text-[#666C74]" />
              <p className="text-lg font-medium text-[#131415] mb-2">
                拖拽素材到此处，或点击上传
              </p>
              <p className="text-sm text-[#666C74] mb-4">
                支持 JPG、PNG、WEBP，单次最多 50 个 SKU
              </p>
              <button
                onClick={(e) => { e.stopPropagation(); useSamples(); }}
                className="text-sm text-[#FF003C] hover:underline"
              >
                使用示例素材体验
              </button>
            </div>

            {files.length > 0 && (
              <div className="mt-6 bg-white rounded-lg border border-[#DDDDDD] p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-[#131415]">
                    已上传 {files.length} 个 SKU
                  </span>
                  <button
                    onClick={() => setFiles([])}
                    className="text-xs text-[#666C74] hover:text-[#FF003C] flex items-center gap-1"
                  >
                    <Trash2 size={12} /> 清空
                  </button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-3">
                  {files.map(f => (
                    <div key={f.id} className="relative group">
                      <div className="aspect-square rounded border border-[#DDDDDD] overflow-hidden">
                        <img src={f.preview} alt={f.name} className="w-full h-full object-cover" />
                      </div>
                      <p className="text-xs text-[#666C74] mt-1 truncate">{f.name}</p>
                      <button
                        onClick={() => removeFile(f.id)}
                        className="absolute top-1 right-1 w-5 h-5 bg-[#131415] text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {files.length > 0 && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => setStep(2)}
                  className="gradient-btn px-8 py-3 text-white font-semibold rounded"
                >
                  下一步：配置参数
                </button>
              </div>
            )}
          </div>
        )}

        {/* ====== Step 2: 参数配置 ====== */}
        {step === 2 && (
          <div className="max-w-4xl mx-auto bg-white rounded-lg border border-[#DDDDDD] p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* 品类 */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-[#131415] mb-3">
                  <Package size={16} /> 产品品类
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORIES.map(c => {
                    const Icon = c.icon;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setConfig(prev => ({ ...prev, category: c.id }))}
                        className={`flex items-center gap-2 px-3 py-2 rounded border text-sm transition-all ${
                          config.category === c.id
                            ? 'border-[#FF003C] bg-[#FFF0F3] text-[#FF003C]'
                            : 'border-[#DDDDDD] text-[#666C74] hover:border-[#999]'
                        }`}
                      >
                        <Icon size={14} />
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 生成类型 */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-[#131415] mb-3">
                  <ImageIcon size={16} /> 生成类型
                </label>
                <div className="space-y-2">
                  {SCENE_TYPES.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setConfig(prev => ({ ...prev, sceneType: s.id }))}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded border text-left transition-all ${
                        config.sceneType === s.id
                          ? 'border-[#FF003C] bg-[#FFF0F3]'
                          : 'border-[#DDDDDD] hover:border-[#999]'
                      }`}
                    >
                      <div>
                        <span className={`text-sm font-medium ${config.sceneType === s.id ? 'text-[#FF003C]' : 'text-[#131415]'}`}>
                          {s.name}
                        </span>
                        <p className="text-xs text-[#666C74]">{s.desc}</p>
                      </div>
                      {config.sceneType === s.id && <CheckCircle size={16} className="text-[#FF003C]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* 色调 */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-[#131415] mb-3">
                  <Sparkles size={16} /> 色调风格
                </label>
                <div className="flex gap-2">
                  {COLOR_TONES.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setConfig(prev => ({ ...prev, colorTone: c.id }))}
                      className={`px-4 py-2 rounded text-sm font-medium border transition-all ${
                        config.colorTone === c.id
                          ? 'border-[#FF003C] ring-2 ring-[#FF003C]/20'
                          : 'border-[#DDDDDD]'
                      } ${c.color}`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 光影 */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-[#131415] mb-3">
                  <Eye size={16} /> 光影模式
                </label>
                <div className="flex gap-2">
                  {LIGHT_MODES.map(l => (
                    <button
                      key={l.id}
                      onClick={() => setConfig(prev => ({ ...prev, lightMode: l.id }))}
                      className={`px-4 py-2 rounded text-sm border transition-all ${
                        config.lightMode === l.id
                          ? 'border-[#FF003C] bg-[#FFF0F3] text-[#FF003C] font-medium'
                          : 'border-[#DDDDDD] text-[#666C74]'
                      }`}
                    >
                      {l.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 比例 */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-[#131415] mb-3">
                  <MousePointer size={16} /> 画面比例
                </label>
                <div className="flex gap-2">
                  {RATIOS.map(r => (
                    <button
                      key={r.id}
                      onClick={() => setConfig(prev => ({ ...prev, ratio: r.id }))}
                      className={`flex-1 px-3 py-2 rounded border text-center transition-all ${
                        config.ratio === r.id
                          ? 'border-[#FF003C] bg-[#FFF0F3] text-[#FF003C]'
                          : 'border-[#DDDDDD] text-[#666C74]'
                      }`}
                    >
                      <div className="text-sm font-medium">{r.name}</div>
                      <div className="text-xs">{r.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 目标平台 */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-[#131415] mb-3">
                  <ShoppingBag size={16} /> 目标平台
                </label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setConfig(prev => ({ ...prev, platform: p.id }))}
                      className={`px-4 py-2 rounded border text-sm transition-all ${
                        config.platform === p.id
                          ? 'border-[#FF003C] bg-[#FFF0F3] text-[#FF003C] font-medium'
                          : 'border-[#DDDDDD] text-[#666C74]'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 配置预览 */}
            <div className="mt-8 p-4 bg-[#E7E9E6] rounded">
              <h4 className="text-sm font-semibold text-[#131415] mb-2">当前配置（将被转化为 AI Prompt）</h4>
              <div className="flex flex-wrap gap-2">
                {[
                  CATEGORIES.find(c => c.id === config.category)?.name,
                  SCENE_TYPES.find(s => s.id === config.sceneType)?.name,
                  COLOR_TONES.find(c => c.id === config.colorTone)?.name,
                  LIGHT_MODES.find(l => l.id === config.lightMode)?.name,
                  config.ratio,
                  PLATFORMS.find(p => p.id === config.platform)?.name,
                ].filter(Boolean).map((tag, i) => (
                  <span key={i} className="px-2 py-1 bg-white rounded text-xs text-[#666C74] border border-[#DDDDDD]">
                    {tag}
                  </span>
                ))}
              </div>
              <p className="text-xs text-[#666C74] mt-2">
                后端将把这些参数转化为英文 Prompt，调用 AI 生图模型
              </p>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => setStep(1)}
                className="text-sm text-[#666C74] hover:text-[#131415]"
              >
                返回上一步
              </button>
              <button
                onClick={startGenerate}
                disabled={createTask.isPending || generate.isPending}
                className="gradient-btn px-8 py-3 text-white font-semibold rounded flex items-center gap-2 disabled:opacity-50"
              >
                {(createTask.isPending || generate.isPending) ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Wand2 size={16} />
                )}
                {createTask.isPending ? '创建任务中...' : generate.isPending ? 'AI生成中...' : `开始批量生成 (${files.length} SKU)`}
              </button>
            </div>
          </div>
        )}

        {/* ====== Step 3: AI生成 ====== */}
        {step === 3 && (
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-white rounded-lg border border-[#DDDDDD] p-8">
              <div className="mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#FFF0F3] flex items-center justify-center">
                  <Wand2 size={28} className="text-[#FF003C] animate-pulse" />
                </div>
                <h3 className="text-xl font-bold text-[#131415] mb-2">
                  后端正在执行 AI 生成
                </h3>
                <p className="text-sm text-[#666C74]">
                  数据流：Prompt 工程 → 调用 AI 模型 → 结果存储数据库
                </p>
                {taskId && (
                  <p className="text-xs text-[#666C74] mt-1">任务ID: {taskId}</p>
                )}
              </div>

              <div className="mb-6">
                <div className="h-3 bg-[#E7E9E6] rounded-full overflow-hidden">
                  <div
                    className="progress-gradient h-full rounded-full transition-all duration-100"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-[#666C74] mt-2">{Math.round(progress)}%</p>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {files.map((f, i) => {
                  const threshold = ((i + 1) / files.length) * 100;
                  const done = progress >= threshold;
                  const active = !done && progress >= (i / files.length) * 100;
                  return (
                    <div key={f.id} className="text-center">
                      <div className={`aspect-square rounded border-2 overflow-hidden mb-1 ${
                        done ? 'border-[#22c55e]' : active ? 'border-[#FF003C]' : 'border-[#DDDDDD]'
                      }`}>
                        <img src={f.preview} alt="" className="w-full h-full object-cover opacity-50" />
                      </div>
                      <div className="flex items-center justify-center gap-1">
                        {done ? (
                          <CheckCircle size={10} className="text-[#22c55e]" />
                        ) : active ? (
                          <RefreshCw size={10} className="text-[#FF003C] animate-spin" />
                        ) : null}
                        <span className="text-xs text-[#666C74] truncate">{f.name.slice(0, 4)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ====== Step 4: 质量校验 ====== */}
        {step === 4 && (
          <div className="max-w-6xl mx-auto">
            {/* 总览 */}
            <div className="bg-white rounded-lg border border-[#DDDDDD] p-6 mb-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-lg font-bold text-[#131415]">后端质量校验报告</h3>
                  <p className="text-sm text-[#666C74]">
                    共 {results.length} 张，数据库计算平均分 <span className="font-bold text-[#FF003C]">{avgScore}</span> 分
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#22c55e]">{passCount}</div>
                    <div className="text-xs text-[#666C74]">优秀(≥85)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#f59e0b]">
                      {results.filter((r: any) => r.status === 'MARGINAL').length}
                    </div>
                    <div className="text-xs text-[#666C74]">良好(70-84)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#ef4444]">{failCount}</div>
                    <div className="text-xs text-[#666C74]">不合格(&lt;70)</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 结果网格 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
              {results.map((r: any) => (
                <div
                  key={r.id}
                  className={`bg-white rounded-lg border-2 overflow-hidden cursor-pointer transition-all ${
                    selectedResult === r.id ? 'border-[#FF003C] ring-2 ring-[#FF003C]/20' : 'border-[#DDDDDD]'
                  } ${r.status === 'FAIL' ? 'ring-2 ring-[#ef4444]/30' : ''}`}
                  onClick={() => setSelectedResult(selectedResult === r.id ? null : r.id)}
                >
                  <div className="aspect-square overflow-hidden">
                    {r.generatedImage ? (
                      <img src={r.generatedImage} alt={r.skuName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[#E7E9E6] flex items-center justify-center">
                        <RefreshCw size={20} className="text-[#666C74] animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-[#131415] truncate">{r.skuName}</span>
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                        r.status === 'PASS' ? 'bg-[#22c55e]/10 text-[#22c55e]' :
                        r.status === 'MARGINAL' ? 'bg-[#f59e0b]/10 text-[#f59e0b]' :
                        'bg-[#ef4444]/10 text-[#ef4444]'
                      }`}>
                        {r.totalScore || 0}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {[
                        { label: '决策', val: r.decisionScore || 0, max: 30 },
                        { label: '信息', val: r.infoScore || 0, max: 25 },
                        { label: '信任', val: r.trustScore || 0, max: 25 },
                        { label: '视觉', val: r.visualScore || 0, max: 20 },
                      ].map((d: any) => (
                        <div key={d.label} className="flex items-center gap-1">
                          <span className="text-[10px] text-[#666C74] w-6">{d.label}</span>
                          <div className="flex-1 h-1.5 bg-[#E7E9E6] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                d.val / d.max >= 0.9 ? 'bg-[#22c55e]' :
                                d.val / d.max >= 0.8 ? 'bg-[#3b82f6]' :
                                'bg-[#f59e0b]'
                              }`}
                              style={{ width: `${(d.val / d.max) * 100}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-[#666C74] w-4">{d.val}</span>
                        </div>
                      ))}
                    </div>
                    {r.status !== 'PASS' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRegenerate(r.id); }}
                        disabled={regenerateOne.isPending}
                        className="mt-2 w-full flex items-center justify-center gap-1 text-xs text-[#FF003C] hover:bg-[#FFF0F3] py-1 rounded transition-colors disabled:opacity-50"
                      >
                        <RefreshCw size={10} className={regenerateOne.isPending ? 'animate-spin' : ''} />
                        重新生成
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 选中详情 */}
            {selectedResult && (() => {
              const r = results.find((x: any) => x.id === selectedResult);
              if (!r) return null;
              return (
                <div className="bg-white rounded-lg border border-[#DDDDDD] p-6 mb-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="w-full md:w-64 aspect-square rounded overflow-hidden border border-[#DDDDDD]">
                      {r.generatedImage ? (
                        <img src={r.generatedImage} alt={r.skuName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-[#E7E9E6] flex items-center justify-center text-[#666C74]">生成中...</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-[#131415] mb-2">{r.skuName} - 详细评分</h4>
                      {r.prompt && (
                        <div className="mb-4 p-3 bg-[#F3F4F2] rounded">
                          <p className="text-xs text-[#666C74] font-medium mb-1">后端使用的 AI Prompt：</p>
                          <p className="text-xs text-[#131415] italic">{r.prompt}</p>
                        </div>
                      )}
                      <div className="space-y-4">
                        {[
                          { name: '决策引导力', weight: '30%', score: r.decisionScore || 0, max: 30, desc: '产品主体突出、卖点直观' },
                          { name: '信息传递效率', weight: '25%', score: r.infoScore || 0, max: 25, desc: '构图专业、层级清晰' },
                          { name: '商品真实信任度', weight: '25%', score: r.trustScore || 0, max: 25, desc: '无色偏畸变、材质真实' },
                          { name: '视觉专业质感', weight: '20%', score: r.visualScore || 0, max: 20, desc: '高清、配色和谐、版式整洁' },
                        ].map(d => (
                          <div key={d.name}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-[#131415]">{d.name}</span>
                              <span className="text-sm text-[#666C74]">{d.score}/{d.max}分</span>
                            </div>
                            <div className="h-2 bg-[#E7E9E6] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  d.score / d.max >= 0.9 ? 'bg-[#22c55e]' :
                                  d.score / d.max >= 0.8 ? 'bg-[#3b82f6]' :
                                  d.score / d.max >= 0.7 ? 'bg-[#f59e0b]' :
                                  'bg-[#ef4444]'
                                }`}
                                style={{ width: `${(d.score / d.max) * 100}%` }}
                              />
                            </div>
                            <p className="text-xs text-[#666C74] mt-0.5">{d.desc}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 pt-4 border-t border-[#DDDDDD]">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-[#666C74]">总分:</span>
                          <span className={`text-2xl font-bold ${
                            r.status === 'PASS' ? 'text-[#22c55e]' :
                            r.status === 'MARGINAL' ? 'text-[#f59e0b]' :
                            'text-[#ef4444]'
                          }`}>{r.totalScore || 0}</span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            r.status === 'PASS' ? 'bg-[#22c55e]/10 text-[#22c55e]' :
                            r.status === 'MARGINAL' ? 'bg-[#f59e0b]/10 text-[#f59e0b]' :
                            'bg-[#ef4444]/10 text-[#ef4444]'
                          }`}>
                            {r.status === 'PASS' ? '优秀，可直接上架' : r.status === 'MARGINAL' ? '良好，轻微微调' : '不合格，需重新生成'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="flex items-center justify-between">
              <button
                onClick={() => { setStep(2); setResults([]); setTaskId(null); }}
                className="text-sm text-[#666C74] hover:text-[#131415]"
              >
                返回修改配置
              </button>
              <button
                onClick={exportAll}
                className="gradient-btn px-8 py-3 text-white font-semibold rounded flex items-center gap-2"
              >
                <CheckCircle size={16} />
                确认并导出 ({passCount} 张合格)
              </button>
            </div>
          </div>
        )}

        {/* ====== Step 5: 导出上架 ====== */}
        {step === 5 && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg border border-[#DDDDDD] p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#22c55e]/10 flex items-center justify-center">
                <CheckCircle size={28} className="text-[#22c55e]" />
              </div>
              <h3 className="text-xl font-bold text-[#131415] mb-2">
                批量生成完成
              </h3>
              <p className="text-sm text-[#666C74] mb-2">
                {passCount} 张主图已达标，可直接上架；
                {results.length - passCount} 张需微调
              </p>
              {taskId && (
                <p className="text-xs text-[#666C74] mb-6">
                  所有结果已持久化存储至数据库，任务ID: {taskId}
                </p>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {results.filter((r: any) => r.status === 'PASS').slice(0, 4).map((r: any) => (
                  <div key={r.id} className="rounded overflow-hidden border border-[#DDDDDD]">
                    <div className="aspect-square">
                      <img src={r.generatedImage} alt={r.skuName} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-2 text-center">
                      <span className="text-xs text-[#666C74]">{r.skuName}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button className="flex items-center gap-2 px-6 py-3 bg-[#131415] text-white rounded font-medium hover:bg-[#333] transition-colors">
                  <Download size={16} />
                  批量下载全部
                </button>
                <button className="flex items-center gap-2 px-6 py-3 border border-[#DDDDDD] rounded font-medium hover:border-[#FF003C] hover:text-[#FF003C] transition-colors">
                  <ShoppingBag size={16} />
                  一键上架到{PLATFORMS.find(p => p.id === config.platform)?.name}
                </button>
              </div>

              <div className="mt-6 pt-6 border-t border-[#DDDDDD]">
                <button
                  onClick={() => {
                    setStep(1);
                    setFiles([]);
                    setResults([]);
                    setTaskId(null);
                    setTaskComplete(false);
                  }}
                  className="text-sm text-[#FF003C] hover:underline"
                >
                  开始新的批量生成任务
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
