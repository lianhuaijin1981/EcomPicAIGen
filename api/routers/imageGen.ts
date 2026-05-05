/**
 * EcomPicAIGen Algorithm Strategy Engine
 * 
 * 核心设计：每个算法是一个独立的策略对象，包含：
 * 1. 匹配条件（品类、场景、风格标签）
 * 2. Prompt构建器（根据输入参数生成差异化Prompt）
 * 3. 生图执行器（模拟真实API调用的延迟和结果）
 * 4. 评分权重（不同算法在不同维度有固有优势/劣势）
 */

import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { generationTasks, generationResults } from "@db/schema";
import { eq } from "drizzle-orm";

// ============================
// 1. 算法策略定义
// ============================

interface AlgorithmStrategy {
  id: string;
  name: string;
  type: 'general' | 'product_fidelity' | 'controlnet' | 'lora' | 'upscaler' | 'compliance';
  description: string;
  // 匹配条件
  matchCategories: string[]; // ['*'] = 全部
  matchScenes: string[];
  matchStyles: string[];
  // 执行优先级（越小越优先）
  priority: number;
  // Prompt构建器
  buildPrompt: (params: PromptParams) => string;
  // 评分权重（该算法在各维度的先天优势/劣势）
  scoreWeights: {
    decision: number; // -5 ~ +5
    info: number;
    trust: number;
    visual: number;
  };
  // 模拟执行延迟（毫秒，模拟真实API耗时）
  simulateDelay: number;
}

interface PromptParams {
  skuName: string;
  category: string;
  categoryLabel: string;
  sceneType: string;
  sceneLabel: string;
  colorTone: string;
  colorLabel: string;
  lightMode: string;
  lightLabel: string;
  ratio: string;
  platform: string;
}

// ============================
// 2. 6大算法策略实现
// ============================

const ALGORITHM_STRATEGIES: AlgorithmStrategy[] = [
  {
    id: "flux-general",
    name: "Flux通用创意生成",
    type: "general",
    description: "开源Flux-dev通用文生图，适合创意海报、氛围图、非标准化商品",
    matchCategories: ["*"],
    matchScenes: ["banner", "scene"],
    matchStyles: ["*"],
    priority: 50,
    buildPrompt: (p) => `Creative e-commerce photography. "${p.skuName}" styled as a ${p.categoryLabel} product. ${p.sceneLabel}. ${p.colorLabel}. ${p.lightLabel}. Artistic composition with dramatic lighting and rich atmosphere. High-end commercial photography, no text, no logos, no watermarks.`,
    scoreWeights: { decision: -1, info: -1, trust: -2, visual: +2 },
    simulateDelay: 3500,
  },
  {
    id: "ipadapter-product",
    name: "IPAdapter商品保真",
    type: "product_fidelity",
    description: "锁定商品主体形态不变，仅替换背景/光影/风格。适合鞋服、3C、家居、美妆、家电标准化主图",
    matchCategories: ["3c", "fashion", "home", "beauty", "appliance"],
    matchScenes: ["white", "scene", "detail"],
    matchStyles: ["*"],
    priority: 10,
    buildPrompt: (p) => `Professional e-commerce product photography. "${p.skuName}" (${p.categoryLabel}). STRICT product fidelity: maintain exact shape, proportions, material texture, and color accuracy. ${p.sceneLabel}. ${p.colorLabel}. ${p.lightLabel}. Background replacement only. No distortion, no deformation, no altering of product silhouette. Ultra-sharp, no text, no logos.`,
    scoreWeights: { decision: +3, info: +2, trust: +4, visual: +2 },
    simulateDelay: 4200,
  },
  {
    id: "controlnet-structure",
    name: "ControlNet结构约束",
    type: "controlnet",
    description: "边缘检测+深度估计+构图网格约束。严格控制摆放角度、构图比例、透视对称。适合3C、家电",
    matchCategories: ["3c", "appliance"],
    matchScenes: ["white", "detail"],
    matchStyles: ["cool", "gray", "realistic", "3d"],
    priority: 15,
    buildPrompt: (p) => `Precision-controlled product photography. "${p.skuName}" (${p.categoryLabel}). Canny edge + depth map control. Strict composition: centered, horizontal alignment, precise 45° or 90° angle, symmetric framing. ${p.sceneLabel}. ${p.colorLabel}. ${p.lightLabel}. Geometric perfection, no tilting, no off-center. No text, no logos.`,
    scoreWeights: { decision: +4, info: +3, trust: +1, visual: +1 },
    simulateDelay: 5000,
  },
  {
    id: "lora-fashion",
    name: "鞋服LoRA领域模型",
    type: "lora",
    description: "鞋服箱包专属LoRA微调。适配皮革纹理、面料褶皱、金属配件。适合服饰鞋包",
    matchCategories: ["fashion"],
    matchScenes: ["white", "scene", "detail"],
    matchStyles: ["warm", "soft", "realistic"],
    priority: 5,
    buildPrompt: (p) => `Fashion LoRA fine-tuned product shot. "${p.skuName}" (${p.categoryLabel}). Specialized material rendering: realistic leather grain, fabric drape and folds, metal buckle reflections, stitching details. ${p.sceneLabel}. ${p.colorLabel}. ${p.lightLabel}. Industry-standard fashion e-commerce aesthetic. No text, no logos.`,
    scoreWeights: { decision: +2, info: +2, trust: +3, visual: +3 },
    simulateDelay: 4000,
  },
  {
    id: "lora-beauty",
    name: "美妆LoRA领域模型",
    type: "lora",
    description: "美妆护肤专属LoRA微调。适配瓶罐通透感、水润光泽、细腻光影",
    matchCategories: ["beauty"],
    matchScenes: ["white", "scene", "detail"],
    matchStyles: ["cool", "warm", "soft", "realistic"],
    priority: 5,
    buildPrompt: (p) => `Beauty LoRA fine-tuned product shot. "${p.skuName}" (${p.categoryLabel}). Translucent glass/plastic packaging with internal liquid visibility. Water droplets, glossy reflections, soft gradient backgrounds. ${p.sceneLabel}. ${p.colorLabel}. ${p.lightLabel}. Premium cosmetic photography aesthetic. No text, no logos.`,
    scoreWeights: { decision: +2, info: +2, trust: +3, visual: +3 },
    simulateDelay: 4000,
  },
  {
    id: "upscaler-hd",
    name: "超分精修增强",
    type: "upscaler",
    description: "后置链路：去噪、锐化、4K超分、光影统一。适合所有需要高清商用质量的图",
    matchCategories: ["*"],
    matchScenes: ["white", "scene", "detail", "banner"],
    matchStyles: ["*"],
    priority: 100,
    buildPrompt: (p) => `Ultra-high-definition e-commerce product photography. "${p.skuName}" (${p.categoryLabel}). ${p.sceneLabel}. ${p.colorLabel}. ${p.lightLabel}. Maximum clarity: zero noise, enhanced micro-texture, perfect tonal gradation, professional color grading. 4K commercial-grade output. No text, no logos.`,
    scoreWeights: { decision: 0, info: 0, trust: +2, visual: +4 },
    simulateDelay: 2800,
  },
];

// ============================
// 3. 品类/场景/风格标签映射
// ============================

const CATEGORY_LABELS: Record<string, string> = {
  "3c": "3C digital electronics",
  fashion: "fashion apparel and accessories",
  home: "home and daily necessities",
  beauty: "beauty and personal care",
  appliance: "home appliance",
};

const SCENE_LABELS: Record<string, string> = {
  white: "Pure white seamless background, studio lighting, product centered",
  scene: "Real lifestyle environment with natural ambient lighting",
  detail: "Extreme macro close-up, shallow depth of field, texture focus",
  banner: "Creative composition with negative space, editorial style",
};

const COLOR_LABELS: Record<string, string> = {
  cool: "Cool blue-toned lighting, crisp tech-forward atmosphere",
  warm: "Warm golden-hour soft lighting, cozy inviting atmosphere",
  gray: "Neutral sophisticated gray palette, matte refined tones",
};

const LIGHT_LABELS: Record<string, string> = {
  soft: "Soft diffused wrap-around lighting, gentle flattering shadows",
  realistic: "Realistic natural HDR lighting, photorealistic shadows",
  "3d": "Dramatic 3-point studio lighting, bold volumetric shadows",
};

// ============================
// 4. 算法路由匹配引擎
// ============================

function matchStrategies(category: string, sceneType: string, _colorTone: string, _lightMode: string, mode: "single" | "parallel" | "adaptive") {
  const scored = ALGORITHM_STRATEGIES.map((algo) => {
    let score = 0;
    const reasons: string[] = [];

    // 品类匹配
    if (algo.matchCategories.includes("*") || algo.matchCategories.includes(category)) {
      score += 40;
      reasons.push("品类匹配");
    }

    // 场景匹配
    if (algo.matchScenes.includes("*") || algo.matchScenes.includes(sceneType)) {
      score += 30;
      reasons.push("场景匹配");
    }

    // 优先级加成（越小越优）
    score += Math.max(0, 20 - algo.priority);

    return { algo, score, reasons };
  });

  // 按分数降序
  scored.sort((a, b) => b.score - a.score);

  if (mode === "single") {
    return scored.slice(0, 1);
  } else if (mode === "parallel") {
    // 取前3个不同类型的算法
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
  } else {
    // 自适应：取前2个
    return scored.slice(0, 2);
  }
}

// ============================
// 5. 确定性评分引擎
// ============================

function generateScore(seed: string, weights: { decision: number; info: number; trust: number; visual: number }, fileSize: number = 0) {
  // 稳定哈希
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const baseHash = Math.abs(hash);
  const digits = baseHash.toString().padStart(10, '0');

  let decision = 22 + (parseInt(digits[0] + digits[1], 10) % 9) + weights.decision;
  let info = 18 + (parseInt(digits[2] + digits[3], 10) % 7) + weights.info;
  let trust = 18 + (parseInt(digits[4] + digits[5], 10) % 7) + weights.trust;
  let visual = 12 + (parseInt(digits[6] + digits[7], 10) % 8) + weights.visual;

  // 文件大小加成
  const sizeBonus = fileSize > 500000 ? 2 : fileSize > 100000 ? 1 : 0;
  trust += sizeBonus;
  visual += sizeBonus;

  // 封顶
  decision = Math.min(30, Math.max(18, decision));
  info = Math.min(25, Math.max(15, info));
  trust = Math.min(25, Math.max(15, trust));
  visual = Math.min(20, Math.max(10, visual));

  const total = decision + info + trust + visual;

  return {
    decision,
    info,
    trust,
    visual,
    total,
    status: total >= 85 ? "PASS" : total >= 70 ? "MARGINAL" : "FAIL" as "PASS" | "MARGINAL" | "FAIL",
  };
}

// ============================
// 6. 图片池（按品类+场景）
// ============================

const IMAGE_POOL: Record<string, Record<string, string[]>> = {
  "3c": {
    white: ["/images/products/01_phone.jpg", "/images/products/03_charger.jpg", "/images/products/04_powerbank.jpg", "/images/products/05_laptop.jpg", "/images/products/06_tablet.jpg"],
    scene: ["/images/products/02_earbuds.jpg", "/images/products/08_mouse.jpg", "/images/products/10_smartwatch.jpg", "/images/products/09_webcam.jpg", "/images/products/07_keyboard.jpg"],
    detail: ["/images/products/03_charger.jpg", "/images/products/04_powerbank.jpg", "/images/products/08_mouse.jpg", "/images/products/02_earbuds.jpg"],
    banner: ["/images/products/05_laptop.jpg", "/images/products/06_tablet.jpg", "/images/products/01_phone.jpg", "/images/products/10_smartwatch.jpg"],
  },
  fashion: {
    white: ["/images/products/11_tshirt.jpg", "/images/products/12_jeans.jpg", "/images/products/14_jacket.jpg", "/images/products/19_cap.jpg", "/images/products/20_scarf.jpg"],
    scene: ["/images/products/15_sneakers.jpg", "/images/products/16_leather_shoes.jpg", "/images/products/13_dress.jpg", "/images/products/17_backpack.jpg", "/images/products/18_wallet.jpg"],
    detail: ["/images/products/15_sneakers.jpg", "/images/products/16_leather_shoes.jpg", "/images/products/20_scarf.jpg", "/images/products/14_jacket.jpg"],
    banner: ["/images/products/13_dress.jpg", "/images/products/17_backpack.jpg", "/images/products/12_jeans.jpg", "/images/products/11_tshirt.jpg"],
  },
  home: {
    white: ["/images/products/21_water_bottle.jpg", "/images/products/22_towel.jpg", "/images/products/25_storage.jpg", "/images/products/26_lamp.jpg", "/images/products/30_trashbin.jpg"],
    scene: ["/images/products/22_towel.jpg", "/images/products/24_tissue.jpg", "/images/products/27_pillow.jpg", "/images/products/28_quilt.jpg", "/images/products/29_dinnerware.jpg"],
    detail: ["/images/products/21_water_bottle.jpg", "/images/products/23_laundry.jpg", "/images/products/25_storage.jpg", "/images/products/26_lamp.jpg"],
    banner: ["/images/products/28_quilt.jpg", "/images/products/27_pillow.jpg", "/images/products/29_dinnerware.jpg", "/images/products/30_trashbin.jpg"],
  },
  beauty: {
    white: ["/images/products/31_lipstick.jpg", "/images/products/32_foundation.jpg", "/images/products/33_facemask_v2.jpg", "/images/products/34_cleanser.jpg", "/images/products/36_lotion.jpg"],
    scene: ["/images/products/35_toner.jpg", "/images/products/37_sunscreen.jpg", "/images/products/38_eyeshadow.jpg", "/images/products/39_mascara.jpg", "/images/products/40_shampoo.jpg"],
    detail: ["/images/products/31_lipstick.jpg", "/images/products/32_foundation.jpg", "/images/products/38_eyeshadow.jpg", "/images/products/33_facemask_v2.jpg"],
    banner: ["/images/products/35_toner.jpg", "/images/products/37_sunscreen.jpg", "/images/products/40_shampoo.jpg", "/images/products/39_mascara.jpg"],
  },
  appliance: {
    white: ["/images/products/41_rice_cooker_v2.jpg", "/images/products/42_induction.jpg", "/images/products/43_microwave.jpg", "/images/products/44_fan.jpg", "/images/products/45_humidifier.jpg"],
    scene: ["/images/products/46_vacuum.jpg", "/images/products/47_hairdryer.jpg", "/images/products/48_kettle.jpg", "/images/products/49_purifier.jpg", "/images/products/50_juicer.jpg"],
    detail: ["/images/products/45_humidifier.jpg", "/images/products/48_kettle.jpg", "/images/products/46_vacuum.jpg", "/images/products/47_hairdryer.jpg"],
    banner: ["/images/products/43_microwave.jpg", "/images/products/41_rice_cooker_v2.jpg", "/images/products/49_purifier.jpg", "/images/products/50_juicer.jpg"],
  },
};

function getImagePool(category: string, sceneType: string): string[] {
  const cat = IMAGE_POOL[category] || IMAGE_POOL["3c"];
  return cat[sceneType] || cat["white"] || ["/images/products/01_phone.jpg"];
}

// ============================
// 7. tRPC Router
// ============================

export const imageGenRouter = createRouter({
  // --- 创建任务 ---
  createTask: publicQuery
    .input(
      z.object({
        config: z.object({
          category: z.string(),
          sceneType: z.string(),
          colorTone: z.string(),
          lightMode: z.string(),
          ratio: z.string(),
          platform: z.string(),
        }),
        algorithmMode: z.enum(["single", "parallel", "adaptive"]).default("single"),
        files: z.array(z.object({ name: z.string(), preview: z.string(), size: z.number() })),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const matched = matchStrategies(
        input.config.category,
        input.config.sceneType,
        input.config.colorTone,
        input.config.lightMode,
        input.algorithmMode
      );

      const route = matched.map((m) => ({
        id: m.algo.id,
        name: m.algo.name,
        type: m.algo.type,
        score: m.score,
        reasons: m.reasons,
        priority: m.algo.priority,
      }));

      // 创建任务
      const [task] = await db
        .insert(generationTasks)
        .values({
          config: input.config,
          algorithmRoute: route,
          algorithmMode: input.algorithmMode,
          sourceImages: input.files,
          status: "pending",
          totalCount: input.files.length,
          passCount: 0,
        })
        .returning();

      // 为每个SKU创建结果记录
      const primaryAlgo = matched[0]?.algo;
      for (const file of input.files) {
        const prompt = primaryAlgo
          ? primaryAlgo.buildPrompt({
              skuName: file.name,
              category: input.config.category,
              categoryLabel: CATEGORY_LABELS[input.config.category] || "product",
              sceneType: input.config.sceneType,
              sceneLabel: SCENE_LABELS[input.config.sceneType] || "studio shot",
              colorTone: input.config.colorTone,
              colorLabel: COLOR_LABELS[input.config.colorTone] || "neutral",
              lightMode: input.config.lightMode,
              lightLabel: LIGHT_LABELS[input.config.lightMode] || "soft",
              ratio: input.config.ratio,
              platform: input.config.platform,
            })
          : `Product photo of ${file.name}`;

        await db.insert(generationResults).values({
          taskId: task.id,
          algorithmId: 0,
          algorithmName: primaryAlgo?.name || "默认算法",
          skuName: file.name,
          sourceImage: file.preview,
          status: "PASS",
          prompt,
          retryCount: 0,
        });
      }

      return { taskId: task.id, total: input.files.length, algorithms: route };
    }),

  // --- 执行生图 ---
  generate: publicQuery
    .input(z.object({ taskId: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [task] = await db
        .select()
        .from(generationTasks)
        .where(eq(generationTasks.id, input.taskId));

      if (!task) throw new Error("Task not found");

      const config = task.config as Record<string, string>;
      const mode = (task.algorithmMode || "single") as "single" | "parallel" | "adaptive";
      const route = (task.algorithmRoute || []) as Array<{ id: string; name: string; type: string; score: number; reasons: string[] }>;
      const sourceImages = (task.sourceImages || []) as Array<{ name: string; preview: string; size: number }>;

      await db
        .update(generationTasks)
        .set({ status: "generating" })
        .where(eq(generationTasks.id, input.taskId));

      const results = await db
        .select()
        .from(generationResults)
        .where(eq(generationResults.taskId, input.taskId));

      const updatedResults = [];
      let totalScore = 0;
      let passCount = 0;

      const pool = getImagePool(config.category || "3c", config.sceneType || "white");

      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        const sourceFile = sourceImages.find((f) => f.name === r.skuName);
        const fileSize = sourceFile?.size || 0;

        // 确定使用哪个算法
        let bestAlgo = route[0];
        let bestScore = 0;
        let bestImage = pool[(i + r.retryCount) % pool.length];
        let bestAlgoName = bestAlgo?.name || "默认算法";

        if (mode === "parallel" && route.length > 1) {
          // 模拟多算法并行择优
          for (let j = 0; j < route.length; j++) {
            const algoStrategy = ALGORITHM_STRATEGIES.find((a) => a.id === route[j].id);
            if (!algoStrategy) continue;

            const seed = `${r.skuName}-${config.category}-${algoStrategy.id}-${r.retryCount}`;
            const scores = generateScore(seed, algoStrategy.scoreWeights, fileSize);

            if (scores.total > bestScore) {
              bestScore = scores.total;
              bestImage = pool[(i + j) % pool.length];
              bestAlgo = route[j];
              bestAlgoName = route[j].name;
            }
          }
        } else {
          // 单算法模式
          const algoStrategy = ALGORITHM_STRATEGIES.find((a) => a.id === bestAlgo?.id);
          const weights = algoStrategy?.scoreWeights || { decision: 0, info: 0, trust: 0, visual: 0 };
          const seed = `${r.skuName}-${config.category}-${bestAlgo?.id || "default"}-${r.retryCount}`;
          const scores = generateScore(seed, weights, fileSize);
          bestScore = scores.total;
        }

        // 获取最终评分的完整维度
        const finalAlgo = ALGORITHM_STRATEGIES.find((a) => a.id === bestAlgo?.id);
        const finalWeights = finalAlgo?.scoreWeights || { decision: 0, info: 0, trust: 0, visual: 0 };
        const finalSeed = `${r.skuName}-${config.category}-${bestAlgo?.id || "default"}-${r.retryCount}`;
        const finalScores = generateScore(finalSeed, finalWeights, fileSize);

        await db
          .update(generationResults)
          .set({
            generatedImage: bestImage,
            algorithmName: bestAlgoName,
            decisionScore: finalScores.decision,
            infoScore: finalScores.info,
            trustScore: finalScores.trust,
            visualScore: finalScores.visual,
            totalScore: finalScores.total,
            status: finalScores.status,
          })
          .where(eq(generationResults.id, r.id));

        const [updated] = await db
          .select()
          .from(generationResults)
          .where(eq(generationResults.id, r.id));

        updatedResults.push(updated);
        totalScore += finalScores.total;
        if (finalScores.status === "PASS") passCount++;

        // 模拟API延迟
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      const avgScore = results.length > 0 ? Math.round(totalScore / results.length) : 0;
      await db
        .update(generationTasks)
        .set({ status: "completed", avgScore, passCount, completedAt: new Date() })
        .where(eq(generationTasks.id, input.taskId));

      return {
        taskId: input.taskId,
        avgScore,
        passCount,
        totalCount: results.length,
        algorithms: route,
        results: updatedResults,
      };
    }),

  // --- 获取任务 ---
  getTask: publicQuery
    .input(z.object({ taskId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [task] = await db.select().from(generationTasks).where(eq(generationTasks.id, input.taskId));
      return task || null;
    }),

  // --- 获取结果 ---
  getResults: publicQuery
    .input(z.object({ taskId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(generationResults)
        .where(eq(generationResults.taskId, input.taskId))
        .orderBy(generationResults.totalScore);
    }),

  // --- 重新生成 ---
  regenerateOne: publicQuery
    .input(z.object({ resultId: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [current] = await db.select().from(generationResults).where(eq(generationResults.id, input.resultId));
      if (!current) throw new Error("Result not found");

      const [task] = await db.select().from(generationTasks).where(eq(generationTasks.id, current.taskId));
      const config = (task?.config || {}) as Record<string, string>;
      const newRetryCount = (current.retryCount || 0) + 1;

      const matched = matchStrategies(
        config.category || "3c",
        config.sceneType || "white",
        config.colorTone || "cool",
        config.lightMode || "soft",
        "single"
      );

      const primaryAlgo = matched[0]?.algo;
      const pool = getImagePool(config.category || "3c", config.sceneType || "white");
      const imgIndex = (input.resultId + newRetryCount + matched.length) % pool.length;
      const generatedImage = pool[imgIndex];

      const seed = `${current.skuName}-${config.category}-${primaryAlgo?.id || "default"}-${Date.now()}`;
      const scores = generateScore(seed, primaryAlgo?.scoreWeights || { decision: 0, info: 0, trust: 0, visual: 0 }, 0);

      await db
        .update(generationResults)
        .set({
          generatedImage,
          algorithmName: primaryAlgo?.name || "默认算法",
          decisionScore: scores.decision,
          infoScore: scores.info,
          trustScore: scores.trust,
          visualScore: scores.visual,
          totalScore: scores.total,
          status: scores.status,
          retryCount: newRetryCount,
        })
        .where(eq(generationResults.id, input.resultId));

      const [updated] = await db.select().from(generationResults).where(eq(generationResults.id, input.resultId));
      return updated;
    }),

  // --- 列出所有算法策略 ---
  listStrategies: publicQuery.query(() => {
    return ALGORITHM_STRATEGIES.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      description: a.description,
      matchCategories: a.matchCategories,
      matchScenes: a.matchScenes,
      priority: a.priority,
      simulateDelay: a.simulateDelay,
    }));
  }),
});
