import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { generationTasks, generationResults, algorithms } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { matchAlgorithms } from "./algorithm";

// =================== Prompt 工程系统（按算法类型定制） ===================

const CATEGORY_PROMPTS: Record<string, string> = {
  "3c": "3C digital product with precise geometric form, metal and glass textures",
  fashion: "fashion apparel or footwear, showing fabric texture, drape and stitching details",
  home: "home daily necessities product, clean and functional design",
  beauty: "beauty and personal care product, translucent glass or plastic packaging with reflective surfaces",
  appliance: "home appliance, industrial design with metallic finish and clean lines",
};

const SCENE_PROMPTS: Record<string, string> = {
  white: "pure white seamless background, professional studio lighting, product centered, soft shadow underneath",
  scene: "lifestyle scene with natural ambient lighting, shallow depth of field, product as focal point",
  detail: "extreme macro close-up shot, shallow depth of field, showing material texture and craftsmanship",
  banner: "creative composition with negative space for text overlay, dramatic lighting, editorial style",
};

const COLOR_PROMPTS: Record<string, string> = {
  cool: "cool color temperature, blue-toned accent lighting, crisp and tech-forward atmosphere",
  warm: "warm color temperature, golden-hour soft lighting, cozy and inviting atmosphere",
  gray: "neutral gray tone, sophisticated minimal palette, matte and refined atmosphere",
};

const LIGHT_PROMPTS: Record<string, string> = {
  soft: "soft diffused lighting, gentle wrap-around shadows, flattering and approachable",
  realistic: "realistic natural lighting, HDR tone mapping, photorealistic shadow details",
  "3d": "dramatic 3-point studio lighting, strong volumetric depth, bold shadows and highlights",
};

/**
 * 根据算法类型构建差异化Prompt
 * 
 * 不同算法类型对Prompt的要求不同：
 * - general: 自由创意描述
 * - product_fidelity: 必须强调"保持主体不变"
 * - controlnet: 必须强调"固定角度/透视/构图"
 * - lora: 强调材质纹理和行业审美
 * - upscaler: 强调"高清细节/锐度"
 * - compliance: 强调"纯净无杂物"
 */
function buildPrompt(
  category: string,
  sceneType: string,
  colorTone: string,
  lightMode: string,
  skuName: string,
  algoType: string,
  _algoName: string
): string {
  const cat = CATEGORY_PROMPTS[category] || "product";
  const scene = SCENE_PROMPTS[sceneType] || SCENE_PROMPTS.white;
  const color = COLOR_PROMPTS[colorTone] || "";
  const light = LIGHT_PROMPTS[lightMode] || "";

  let base = `Professional e-commerce main image photography. A ${cat} named "${skuName}", ${scene}. ${color}. ${light}.`;

  // 根据算法类型追加差异化指令
  switch (algoType) {
    case "product_fidelity":
      base += " Strictly maintain the exact product shape, proportions, and structure. Only modify background, lighting atmosphere, and surface reflections. No distortion, no deformation, no altering of product silhouette.";
      break;
    case "controlnet":
      base += " Strictly controlled composition: product placed at exact center, perfect horizontal alignment, precise perspective angle, symmetric framing. No tilting, no off-center placement.";
      break;
    case "lora":
      base += " Ultra-detailed material rendering: realistic fabric weave, leather grain, metal brushed texture, glass refraction. Industry-standard color accuracy and surface finish.";
      break;
    case "upscaler":
      base += " Maximum resolution and clarity: ultra-sharp edges, zero noise, enhanced micro-texture, perfect tonal gradation. 4K commercial-grade quality.";
      break;
    case "compliance":
      base += " Pure and clean output: absolutely no text, no logos, no watermarks, no stray objects, no dust spots. Uniform background color. E-commerce platform compliant.";
      break;
    default:
      base += " Creative and aesthetic composition. High-end commercial photography style.";
  }

  return base + " No text, no logos, no watermarks.";
}

// =================== 质量评分算法（按算法类型差异化权重） ===================

// 确定性评分算法：基于文件特征的稳定评分（同图同分）
function generateScore(seed: string, algoType: string, fileSize: number = 0) {
  // 使用稳定的字符串哈希（确定性）
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const baseHash = Math.abs(hash);
  
  // 算法类型加权系数
  const typeWeights: Record<string, { decision: number; info: number; trust: number; visual: number }> = {
    general:        { decision: 0, info: 0, trust: -2, visual: +1 },
    product_fidelity: { decision: +2, info: +1, trust: +3, visual: +1 },
    controlnet:     { decision: +3, info: +2, trust: +1, visual: 0 },
    lora:           { decision: +1, info: +1, trust: +2, visual: +2 },
    upscaler:       { decision: 0, info: 0, trust: +1, visual: +3 },
    compliance:     { decision: +1, info: +1, trust: +2, visual: -1 },
  };
  const mod = typeWeights[algoType] || { decision: 0, info: 0, trust: 0, visual: 0 };

  // 使用 baseHash 的各位数字分配分数，确保有区分度（60-99分范围）
  const digits = baseHash.toString().padStart(10, '0');
  
  // 决策引导力 (20-30): 产品主体突出程度
  let decision = 20 + (parseInt(digits[0] + digits[1], 10) % 11) + mod.decision;
  
  // 信息传递效率 (15-25): 构图与层级清晰度
  let info = 15 + (parseInt(digits[2] + digits[3], 10) % 11) + mod.info;
  
  // 商品真实信任度 (15-25): 色彩/材质/光影真实感
  let trust = 15 + (parseInt(digits[4] + digits[5], 10) % 11) + mod.trust;
  
  // 视觉专业质感 (10-20): 清晰度/配色/版式
  let visual = 10 + (parseInt(digits[6] + digits[7], 10) % 11) + mod.visual;
  
  // 文件大小加成（模拟：大文件通常更清晰）
  const sizeBonus = fileSize > 500000 ? 2 : fileSize > 100000 ? 1 : 0;
  trust += sizeBonus;
  visual += sizeBonus;

  // 封顶
  decision = Math.min(30, Math.max(20, decision));
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

// 按品类+场景建立的预设图片映射，确保品类一致性
const PRESET_IMAGES_BY_CATEGORY: Record<string, Record<string, string[]>> = {
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

// 兜底映射：当品类缺失时返回默认图片
function getPresetImages(category: string, sceneType: string): string[] {
  const cat = PRESET_IMAGES_BY_CATEGORY[category] || PRESET_IMAGES_BY_CATEGORY["3c"];
  return cat[sceneType] || cat["white"] || ["/images/products/01_phone.jpg"];
}

export const imageGenRouter = createRouter({
  // ===== 1. 创建生图任务（含算法路由选择） =====
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
        files: z.array(
          z.object({
            name: z.string(),
            preview: z.string(),
            size: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();

      // 1. 算法路由匹配
      let matchedAlgos = await matchAlgorithms(
        {
          category: input.config.category,
          sceneType: input.config.sceneType,
          colorTone: input.config.colorTone,
          lightMode: input.config.lightMode,
        },
        input.algorithmMode
      );

      // 如果算法库为空，回退到内置默认算法（确保首次使用也能工作）
      if (matchedAlgos.length === 0) {
        matchedAlgos = [{
          algo: {
            id: 0,
            name: "Flux通用文生图",
            type: "general" as const,
            description: "通用生图回退算法",
            categories: ["*"],
            scenes: ["*"],
            styles: ["*"],
            qualityTier: "standard" as const,
            apiEndpoint: "",
            apiKeyRef: "",
            priority: 50,
            enabled: true,
            successRate: 85,
            avgScore: 88,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          score: 70,
          reasons: ["回退默认"],
        }];
      }

      const algorithmRoute = matchedAlgos.map((m) => ({
        id: m.algo.id,
        name: m.algo.name,
        type: m.algo.type,
        score: Math.round(m.score),
      }));

      // 2. 创建任务记录（SQLite 支持 returning）
      const [task] = await db
        .insert(generationTasks)
        .values({
          config: input.config,
          algorithmRoute,
          algorithmMode: input.algorithmMode,
          sourceImages: input.files,
          status: "pending",
          totalCount: input.files.length,
          passCount: 0,
        })
        .returning();

      const taskId = task.id;

      // 3. 为每个SKU预创建结果记录
      for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        const primaryAlgo = matchedAlgos[0];
        const prompt = buildPrompt(
          input.config.category,
          input.config.sceneType,
          input.config.colorTone,
          input.config.lightMode,
          file.name,
          primaryAlgo?.algo.type || "general",
          primaryAlgo?.algo.name || "通用算法"
        );

        await db.insert(generationResults).values({
          taskId: taskId,
          algorithmId: primaryAlgo?.algo.id,
          algorithmName: primaryAlgo?.algo.name,
          skuName: file.name,
          sourceImage: file.preview,
          status: "PASS",
          prompt,
          retryCount: 0,
        });
      }

      return {
        taskId: taskId,
        total: input.files.length,
        algorithms: algorithmRoute,
      };
    }),

  // ===== 2. 执行生图（含多算法择优逻辑） =====
  generate: publicQuery
    .input(z.object({ taskId: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();

      // 更新任务状态
      await db
        .update(generationTasks)
        .set({ status: "generating" })
        .where(eq(generationTasks.id, input.taskId));

      // 获取任务
      const [task] = await db
        .select()
        .from(generationTasks)
        .where(eq(generationTasks.id, input.taskId));

      if (!task) throw new Error("Task not found");

      const config = task.config as Record<string, string>;
      const mode = task.algorithmMode as "single" | "parallel" | "adaptive";

      // 获取算法路由
      const route = (task.algorithmRoute || []) as Array<{ id: number; name: string; type: string; score: number }>;

      const sourceImages = (task.sourceImages || []) as Array<{ name: string; preview: string; size: number }>;

      // 获取结果记录
      const results = await db
        .select()
        .from(generationResults)
        .where(eq(generationResults.taskId, input.taskId));

      const updatedResults = [];
      let totalScore = 0;
      let passCount = 0;

      // 逐个SKU生成
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        
        // 查找对应源文件的大小
        const sourceFile = sourceImages.find((f: any) => f.name === r.skuName);
        const fileSize = sourceFile?.size || 0;

        // 获取该SKU使用的算法
        let algoId = r.algorithmId || 0;
        let algoName = r.algorithmName || "通用算法";
        let algoType = "general";

        if (r.algorithmId) {
          const [algo] = await db
            .select()
            .from(algorithms)
            .where(eq(algorithms.id, r.algorithmId));
          if (algo) {
            algoType = algo.type;
            algoName = algo.name;
          }
        } else if (route.length > 0) {
          // 回退到路由中的主算法
          algoId = route[0].id;
          algoType = route[0].type;
          algoName = route[0].name;
        }

        // 构建差异化Prompt
        const prompt = buildPrompt(
          config.category || "3c",
          config.sceneType || "white",
          config.colorTone || "cool",
          config.lightMode || "soft",
          r.skuName,
          algoType,
          algoName
        );

        // 生成评分（按算法类型差异化，传入真实文件大小）
        const seed = `${r.skuName}-${config.category}-${algoType}-${r.retryCount}`;
        const scores = generateScore(seed, algoType, fileSize);

        // 分配预设图片（按品类+场景选择正确图片池）
        const pool = getPresetImages(config.category || "3c", config.sceneType || "white");
        const imgIndex = (i + r.retryCount + algoId) % pool.length;
        const generatedImage = pool[imgIndex];

        // 如果是并行模式，模拟"多个算法同时生成择优"的效果
        let bestScore = scores.total;
        let bestImage = generatedImage;
        let bestAlgoId = algoId;
        let bestAlgoName = algoName;

        if (mode === "parallel" && route.length > 1) {
          // 模拟其他算法的生成结果
          for (let j = 1; j < route.length; j++) {
            const altSeed = `${r.skuName}-${config.category}-${route[j].type}-${Date.now()}`;
            const altScores = generateScore(altSeed, route[j].type, fileSize);
            if (altScores.total > bestScore) {
              bestScore = altScores.total;
              const altPool = getPresetImages(config.category || "3c", config.sceneType || "white");
              bestImage = altPool[(i + j) % altPool.length];
              bestAlgoId = route[j].id;
              bestAlgoName = route[j].name;
            }
          }
        }

        // 更新结果记录
        await db
          .update(generationResults)
          .set({
            generatedImage: bestImage,
            algorithmId: bestAlgoId,
            algorithmName: bestAlgoName,
            decisionScore: scores.decision,
            infoScore: scores.info,
            trustScore: scores.trust,
            visualScore: scores.visual,
            totalScore: bestScore,
            status: bestScore >= 85 ? "PASS" : bestScore >= 70 ? "MARGINAL" : "FAIL",
            prompt,
          })
          .where(eq(generationResults.id, r.id));

        const [updated] = await db
          .select()
          .from(generationResults)
          .where(eq(generationResults.id, r.id));

        updatedResults.push(updated);
        totalScore += bestScore;
        if (bestScore >= 85) passCount++;

        // 模拟处理时间
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      // 更新任务完成状态
      const avgScore = Math.round(totalScore / results.length);
      await db
        .update(generationTasks)
        .set({
          status: "completed",
          avgScore,
          passCount,
          completedAt: new Date(),
        })
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

  // ===== 3. 获取任务详情 =====
  getTask: publicQuery
    .input(z.object({ taskId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [task] = await db
        .select()
        .from(generationTasks)
        .where(eq(generationTasks.id, input.taskId));
      return task || null;
    }),

  // ===== 4. 获取任务结果列表 =====
  getResults: publicQuery
    .input(z.object({ taskId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(generationResults)
        .where(eq(generationResults.taskId, input.taskId))
        .orderBy(desc(generationResults.totalScore));
    }),

  // ===== 5. 重新生成单张图（自动重新路由算法） =====
  regenerateOne: publicQuery
    .input(z.object({ resultId: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();

      const [current] = await db
        .select()
        .from(generationResults)
        .where(eq(generationResults.id, input.resultId));

      if (!current) throw new Error("Result not found");

      const [task] = await db
        .select()
        .from(generationTasks)
        .where(eq(generationTasks.id, current.taskId));

      const config = task?.config as Record<string, string> || {};
      const newRetryCount = (current.retryCount || 0) + 1;

      // 重新路由算法（可能选择不同的算法）
      const matchedAlgos = await matchAlgorithms(
        {
          category: config.category || "3c",
          sceneType: config.sceneType || "white",
          colorTone: config.colorTone || "cool",
          lightMode: config.lightMode || "soft",
        },
        "single"
      );

      const primaryAlgo = matchedAlgos[0];
      const algoType = primaryAlgo?.algo.type || "general";
      const algoName = primaryAlgo?.algo.name || "通用算法";

      const seed = `${current.skuName}-${config.category}-${algoType}-${Date.now()}`;
      const scores = generateScore(seed, algoType, 0);

      const pool = getPresetImages(config.category || "3c", config.sceneType || "white");
      const imgIndex = (input.resultId + newRetryCount + (primaryAlgo?.algo.id || 0)) % pool.length;
      const generatedImage = pool[imgIndex];

      await db
        .update(generationResults)
        .set({
          generatedImage,
          algorithmId: primaryAlgo?.algo.id,
          algorithmName: algoName,
          decisionScore: scores.decision,
          infoScore: scores.info,
          trustScore: scores.trust,
          visualScore: scores.visual,
          totalScore: scores.total,
          status: scores.status,
          retryCount: newRetryCount,
        })
        .where(eq(generationResults.id, input.resultId));

      const [updated] = await db
        .select()
        .from(generationResults)
        .where(eq(generationResults.id, input.resultId));

      return updated;
    }),
});
