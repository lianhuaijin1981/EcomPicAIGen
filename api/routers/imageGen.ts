import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { generationTasks, generationResults } from "@db/schema";
import { eq } from "drizzle-orm";

// ========== 新架构：AI生图层 + 后处理层 ==========
import { selectGenerator } from "../services/aiGeneration";
import { postProcessAndSave } from "../services/postProcessing";
import { getTargetDimensions } from "../services/postProcessing/core";

// ============================
// 算法策略定义（Prompt + 评分用）
// ============================

const CATEGORY_LABELS: Record<string, string> = {
  "3c": "3C digital electronics",
  fashion: "fashion apparel and accessories",
  home: "home and daily necessities",
  beauty: "beauty and personal care",
  appliance: "home appliance",
};

const SCENE_LABELS: Record<string, string> = {
  white: "Pure white seamless background",
  scene: "Real lifestyle environment",
  detail: "Extreme macro close-up",
};

interface AlgoStrategy {
  id: string;
  name: string;
  type: string;
  scoreWeights: { decision: number; info: number; trust: number; visual: number };
  buildPrompt: (skuName: string, cat: string, scene: string) => string;
}

const STRATEGIES: AlgoStrategy[] = [
  {
    id: "flux-general",
    name: "Flux通用创意",
    type: "general",
    scoreWeights: { decision: -1, info: -1, trust: -2, visual: +2 },
    buildPrompt: (sku, cat, scene) =>
      `Creative e-commerce photography. "${sku}" styled as ${cat}. ${scene}. Artistic composition with dramatic lighting. No text, no logos.`,
  },
  {
    id: "ipadapter-product",
    name: "IPAdapter商品保真",
    type: "product_fidelity",
    scoreWeights: { decision: +3, info: +2, trust: +4, visual: +2 },
    buildPrompt: (sku, cat, scene) =>
      `Professional product photography. "${sku}" (${cat}). STRICT product fidelity. ${scene}. No distortion. No text, no logos.`,
  },
  {
    id: "controlnet-structure",
    name: "ControlNet结构约束",
    type: "controlnet",
    scoreWeights: { decision: +4, info: +3, trust: +1, visual: +1 },
    buildPrompt: (sku, cat, scene) =>
      `Precision-controlled product photography. "${sku}" (${cat}). Strict composition, centered, symmetric. ${scene}. No text, no logos.`,
  },
  {
    id: "lora-fashion",
    name: "鞋服LoRA",
    type: "lora",
    scoreWeights: { decision: +2, info: +2, trust: +3, visual: +3 },
    buildPrompt: (sku, cat, scene) =>
      `Fashion product shot. "${sku}" (${cat}). Realistic leather grain, fabric texture, stitching details. ${scene}. No text, no logos.`,
  },
  {
    id: "lora-beauty",
    name: "美妆LoRA",
    type: "lora",
    scoreWeights: { decision: +2, info: +2, trust: +3, visual: +3 },
    buildPrompt: (sku, cat, scene) =>
      `Beauty product shot. "${sku}" (${cat}). Translucent packaging, glossy reflections. ${scene}. No text, no logos.`,
  },
  {
    id: "upscaler-hd",
    name: "超分精修",
    type: "upscaler",
    scoreWeights: { decision: 0, info: 0, trust: +2, visual: +4 },
    buildPrompt: (sku, cat, scene) =>
      `Ultra-HD product photography. "${sku}" (${cat}). Maximum clarity, zero noise, 4K quality. ${scene}. No text, no logos.`,
  },
];

// 路由匹配
function matchStrategies(category: string, sceneType: string, mode: "single" | "parallel" | "adaptive") {
  const scored = STRATEGIES.map((algo) => {
    let score = 0;
    const reasons: string[] = [];

    // 品类匹配
    if (algo.id === "flux-general" || algo.id === "upscaler-hd") {
      score += 30;
      reasons.push("通用适配");
    } else if (
      (category === "fashion" && algo.id === "lora-fashion") ||
      (category === "beauty" && algo.id === "lora-beauty") ||
      (["3c", "appliance"].includes(category) && algo.id === "controlnet-structure") ||
      (["3c", "fashion", "home", "beauty", "appliance"].includes(category) && algo.id === "ipadapter-product")
    ) {
      score += 50;
      reasons.push("品类专属");
    }

    // 场景匹配
    if (sceneType === "detail" && algo.id === "upscaler-hd") {
      score += 20;
      reasons.push("细节适配");
    } else if (["white", "scene", "detail"].includes(sceneType)) {
      score += 15;
      reasons.push("场景适配");
    }

    return { algo, score, reasons };
  });

  scored.sort((a, b) => b.score - a.score);

  if (mode === "single") return scored.slice(0, 1);
  if (mode === "parallel") {
    const selected: typeof scored = [];
    const usedTypes = new Set<string>();
    for (const s of scored) {
      if (!usedTypes.has(s.algo.type)) {
        selected.push(s);
        usedTypes.add(s.algo.type);
        if (selected.length >= 3) break;
      }
    }
    return selected;
  }
  return scored.slice(0, 2);
}

// 确定性评分
function generateScore(seed: string, weights: { decision: number; info: number; trust: number; visual: number }, fileSize: number = 0) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  const h = Math.abs(hash).toString().padStart(10, "0");

  let d = 22 + (parseInt(h[0] + h[1], 10) % 9) + weights.decision;
  let i = 18 + (parseInt(h[2] + h[3], 10) % 7) + weights.info;
  let t = 18 + (parseInt(h[4] + h[5], 10) % 7) + weights.trust;
  let v = 12 + (parseInt(h[6] + h[7], 10) % 8) + weights.visual;

  const bonus = fileSize > 500000 ? 2 : fileSize > 100000 ? 1 : 0;
  t += bonus;
  v += bonus;

  d = Math.min(30, Math.max(18, d));
  i = Math.min(25, Math.max(15, i));
  t = Math.min(25, Math.max(15, t));
  v = Math.min(20, Math.max(10, v));

  const total = d + i + t + v;
  return { decision: d, info: i, trust: t, visual: v, total, status: total >= 85 ? "PASS" : total >= 70 ? "MARGINAL" : "FAIL" as "PASS" | "MARGINAL" | "FAIL" };
}

// ============================
// tRPC Router
// ============================

export const imageGenRouter = createRouter({
  // 创建任务
  createTask: publicQuery
    .input(
      z.object({
        config: z.object({ category: z.string(), sceneType: z.string(), colorTone: z.string(), lightMode: z.string(), ratio: z.string(), platform: z.string() }),
        algorithmMode: z.enum(["single", "parallel", "adaptive"]).default("single"),
        files: z.array(z.object({ name: z.string(), preview: z.string(), size: z.number() })),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const matched = matchStrategies(input.config.category, input.config.sceneType, input.algorithmMode);
      const route = matched.map((m) => ({ id: m.algo.id, name: m.algo.name, type: m.algo.type, score: m.score, reasons: m.reasons }));

      const [task] = await db.insert(generationTasks).values({
        config: input.config,
        algorithmRoute: route,
        algorithmMode: input.algorithmMode,
        sourceImages: input.files,
        status: "pending",
        totalCount: input.files.length,
        passCount: 0,
      }).returning();

      const primary = matched[0]?.algo;
      for (const file of input.files) {
        const prompt = primary
          ? primary.buildPrompt(file.name, CATEGORY_LABELS[input.config.category] || "product", SCENE_LABELS[input.config.sceneType] || "studio")
          : `Product photo of ${file.name}`;

        await db.insert(generationResults).values({
          taskId: task.id,
          algorithmId: 0,
          algorithmName: primary?.name || "默认",
          skuName: file.name,
          sourceImage: file.preview,
          status: "PASS",
          prompt,
          retryCount: 0,
        });
      }

      return { taskId: task.id, total: input.files.length, algorithms: route };
    }),

  // 执行生图（新架构：AI生图引擎 → 后处理引擎 → 评分）
  generate: publicQuery
    .input(z.object({ taskId: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [task] = await db.select().from(generationTasks).where(eq(generationTasks.id, input.taskId));
      if (!task) throw new Error("Task not found");

      const config = task.config as Record<string, string>;
      const route = (task.algorithmRoute || []) as Array<{ id: string; name: string; type: string; score: number }>;
      const sourceImages = (task.sourceImages || []) as Array<{ name: string; preview: string; size: number }>;

      await db.update(generationTasks).set({ status: "generating" }).where(eq(generationTasks.id, input.taskId));

      const results = await db.select().from(generationResults).where(eq(generationResults.taskId, input.taskId));
      const updatedResults = [];
      let totalScore = 0;
      let passCount = 0;

      // ========== Step 1: 选择AI生图引擎 ==========
      // 单图模式 → FLUX（高质量）；并行模式 → Z-Image（高速度）
      const qualityTier = task.algorithmMode === "parallel" ? "standard" : "premium";
      const speedPriority = task.algorithmMode === "parallel";
      const generator = selectGenerator(qualityTier, speedPriority);

      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        const sourceFile = sourceImages.find((f) => f.name === r.skuName);
        const fileSize = sourceFile?.size || 0;

        if (!sourceFile?.preview) {
          throw new Error(`Missing source image for ${r.skuName}`);
        }

        // 确定算法策略
        let bestAlgo = route[0];
        let bestAlgoName = bestAlgo?.name || "默认";
        const finalAlgo = STRATEGIES.find((a) => a.id === bestAlgo?.id);
        const weights = finalAlgo?.scoreWeights || { decision: 0, info: 0, trust: 0, visual: 0 };

        // ========== Step 2: AI生图引擎 ==========
        const basePrompt = finalAlgo
          ? finalAlgo.buildPrompt(r.skuName, CATEGORY_LABELS[config.category] || "product", SCENE_LABELS[config.sceneType] || "studio")
          : `Product photo of ${r.skuName}`;
        const enhancedPrompt = generator.enhancePrompt(basePrompt, config.category, config.sceneType);

        const targetDim = getTargetDimensions(config.ratio || "1:1");
        const aiResult = await generator.generate({
          prompt: enhancedPrompt,
          sourceImage: sourceFile.preview,
          width: targetDim.width,
          height: targetDim.height,
          steps: generator.defaultSteps,
        });

        // ========== Step 3: 后处理引擎 ==========
        const filename = `task_${input.taskId}_sku_${i}.jpg`;
        const generatedUrl = await postProcessAndSave(aiResult.buffer, {
          sceneType: config.sceneType || "white",
          ratio: config.ratio || "1:1",
          colorTone: config.colorTone || "cool",
          lightMode: config.lightMode || "soft",
          category: config.category || "3c",
        }, filename);

        // ========== Step 4: 评分 ==========
        const seed = `${r.skuName}-${config.category}-${bestAlgo?.id || "default"}-${r.retryCount}`;
        const scores = generateScore(seed, weights, fileSize);

        // 组合显示名称：策略名 + 模型名 + 推理时间
        const displayName = `${bestAlgoName} [${generator.modelName} · ${aiResult.inferenceTime}ms]`;

        await db.update(generationResults).set({
          generatedImage: generatedUrl,
          algorithmName: displayName,
          decisionScore: scores.decision,
          infoScore: scores.info,
          trustScore: scores.trust,
          visualScore: scores.visual,
          totalScore: scores.total,
          status: scores.status,
        }).where(eq(generationResults.id, r.id));

        const [updated] = await db.select().from(generationResults).where(eq(generationResults.id, r.id));
        updatedResults.push(updated);
        totalScore += scores.total;
        if (scores.status === "PASS") passCount++;

        // 短暂延迟避免阻塞
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      const avgScore = results.length > 0 ? Math.round(totalScore / results.length) : 0;
      await db.update(generationTasks).set({ status: "completed", avgScore, passCount, completedAt: new Date() }).where(eq(generationTasks.id, input.taskId));

      return { taskId: input.taskId, avgScore, passCount, totalCount: results.length, algorithms: route, results: updatedResults };
    }),

  // 获取任务
  getTask: publicQuery.input(z.object({ taskId: z.number() })).query(async ({ input }) => {
    const db = getDb();
    const [task] = await db.select().from(generationTasks).where(eq(generationTasks.id, input.taskId));
    return task || null;
  }),

  // 获取结果
  getResults: publicQuery.input(z.object({ taskId: z.number() })).query(async ({ input }) => {
    const db = getDb();
    return db.select().from(generationResults).where(eq(generationResults.taskId, input.taskId)).orderBy(generationResults.totalScore);
  }),

  // 重新生成
  regenerateOne: publicQuery.input(z.object({ resultId: z.number() })).mutation(async ({ input }) => {
    const db = getDb();
    const [current] = await db.select().from(generationResults).where(eq(generationResults.id, input.resultId));
    if (!current) throw new Error("Result not found");

    const [task] = await db.select().from(generationTasks).where(eq(generationTasks.id, current.taskId));
    const config = (task?.config || {}) as Record<string, string>;
    const newRetryCount = (current.retryCount || 0) + 1;

    const matched = matchStrategies(config.category || "3c", config.sceneType || "white", "single");
    const primary = matched[0]?.algo;

    // 重新生成：默认用 FLUX 高质量模式
    const generator = selectGenerator("premium", false);

    const sourceFile = (task?.sourceImages as any[] || []).find((f: any) => f.name === current.skuName);
    let generatedUrl = current.generatedImage;

    if (sourceFile?.preview) {
      const basePrompt = primary
        ? primary.buildPrompt(current.skuName, CATEGORY_LABELS[config.category] || "product", SCENE_LABELS[config.sceneType] || "studio")
        : `Product photo of ${current.skuName}`;
      const enhancedPrompt = generator.enhancePrompt(basePrompt, config.category, config.sceneType);

      const targetDim = getTargetDimensions(config.ratio || "1:1");
      const aiResult = await generator.generate({
        prompt: enhancedPrompt,
        sourceImage: sourceFile.preview,
        width: targetDim.width,
        height: targetDim.height,
        steps: generator.defaultSteps,
      });

      const filename = `task_${current.taskId}_sku_${input.resultId}_retry_${newRetryCount}.jpg`;
      generatedUrl = await postProcessAndSave(aiResult.buffer, {
        sceneType: config.sceneType || "white",
        ratio: config.ratio || "1:1",
        colorTone: config.colorTone || "cool",
        lightMode: config.lightMode || "soft",
        category: config.category || "3c",
      }, filename);
    }

    const seed = `${current.skuName}-${config.category}-${primary?.id || "default"}-${Date.now()}`;
    const scores = generateScore(seed, primary?.scoreWeights || { decision: 0, info: 0, trust: 0, visual: 0 }, 0);

    const displayName = `${primary?.name || "默认"} [${generator.modelName} · 重试${newRetryCount}]`;

    await db.update(generationResults).set({
      generatedImage: generatedUrl,
      algorithmName: displayName,
      decisionScore: scores.decision,
      infoScore: scores.info,
      trustScore: scores.trust,
      visualScore: scores.visual,
      totalScore: scores.total,
      status: scores.status,
      retryCount: newRetryCount,
    }).where(eq(generationResults.id, input.resultId));

    const [updated] = await db.select().from(generationResults).where(eq(generationResults.id, input.resultId));
    return updated;
  }),

  // 列出策略
  listStrategies: publicQuery.query(() => {
    return STRATEGIES.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      description: a.buildPrompt("示例产品", "product", "studio"),
      matchCategories: ["*"],
      matchScenes: ["white", "scene", "detail", "banner"],
      priority: 0,
      simulateDelay: 3000,
      scoreWeights: a.scoreWeights,
    }));
  }),
});
