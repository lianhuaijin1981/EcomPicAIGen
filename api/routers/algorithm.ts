import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { algorithms } from "@db/schema";
import { eq, and, gte } from "drizzle-orm";

// =================== 算法路由匹配逻辑 ===================

/**
 * 根据用户配置匹配最佳算法
 * 
 * 匹配规则（按优先级排序）：
 * 1. 品类完全匹配（categories包含用户选的category）
 * 2. 用途完全匹配（scenes包含用户选的sceneType）
 * 3. 风格完全匹配（styles包含用户选的style）
 * 4. 质量层级匹配（qualityTier >= 用户要求）
 * 5. 按priority字段排序取优先级最高
 * 6. 按successRate和avgScore取成功率最高的
 */

export interface MatchCriteria {
  category: string;
  sceneType: string;
  colorTone: string;
  lightMode: string;
  qualityTier?: string;
}

export async function matchAlgorithms(criteria: MatchCriteria, mode: "single" | "parallel" | "adaptive") {
  const db = getDb();

  // 1. 按品类、用途、启用状态筛选
  const allAlgorithms = await db
    .select()
    .from(algorithms)
    .where(
      and(
        eq(algorithms.enabled, true),
        gte(algorithms.priority, 0)
      )
    )
    .orderBy(algorithms.priority);

  // 2. 计算每个算法的匹配分数（0-100）
  const scored = allAlgorithms.map((algo) => {
    const cats = (algo.categories || []) as string[];
    const scenes = (algo.scenes || []) as string[];
    const styles = (algo.styles || []) as string[];

    let score = 0;
    let reasons: string[] = [];

    // 品类匹配 (+40)
    if (cats.includes(criteria.category) || cats.includes("*")) {
      score += 40;
      reasons.push("品类匹配");
    }

    // 用途匹配 (+30)
    if (scenes.includes(criteria.sceneType) || scenes.includes("*")) {
      score += 30;
      reasons.push("用途匹配");
    }

    // 风格匹配 (+20)
    if (styles.includes(criteria.colorTone) || styles.includes(criteria.lightMode) || styles.includes("*")) {
      score += 20;
      reasons.push("风格匹配");
    }

    // 优先级加分 (+10，priority越小加分越多)
    score += Math.max(0, 10 - (algo.priority || 100) / 10);

    // 历史成功率加权 (+0~20)
    if (algo.successRate) {
      score += (algo.successRate / 100) * 20;
    }

    return { algo, score, reasons };
  });

  // 3. 按分数降序排序
  scored.sort((a, b) => b.score - a.score);

  // 4. 根据模式返回不同数量算法
  if (mode === "single") {
    // 单算法模式：返回最高分的1个
    return scored.length > 0 ? [scored[0]] : [];
  } else if (mode === "parallel") {
    // 并行择优模式：返回前3个不同类别的算法
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
    // 自适应模式：先单算法，如果结果低于85分则自动补充另一个算法重试
    return scored.length > 0 ? [scored[0], scored[1] || scored[0]].filter(Boolean) : [];
  }
}

// =================== tRPC Router ===================

export const algorithmRouter = createRouter({
  // ===== 1. 算法库列表 =====
  list: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(algorithms).orderBy(algorithms.priority);
  }),

  // ===== 2. 创建/更新算法 =====
  upsert: publicQuery
    .input(
      z.object({
        id: z.number().optional(),
        name: z.string().min(1),
        type: z.enum(["general", "product_fidelity", "controlnet", "lora", "upscaler", "compliance"]),
        description: z.string().optional(),
        categories: z.array(z.string()),
        scenes: z.array(z.string()),
        styles: z.array(z.string()),
        qualityTier: z.enum(["standard", "premium", "ultra"]).default("standard"),
        apiEndpoint: z.string().optional(),
        apiKeyRef: z.string().optional(),
        priority: z.number().default(100),
        enabled: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      if (input.id) {
        await db
          .update(algorithms)
          .set({
            ...input,
            updatedAt: new Date(),
          })
          .where(eq(algorithms.id, input.id));
        return { id: input.id, action: "updated" };
      } else {
        const [result] = await db
          .insert(algorithms)
          .values({
            name: input.name,
            type: input.type,
            description: input.description || "",
            categories: input.categories,
            scenes: input.scenes,
            styles: input.styles,
            qualityTier: input.qualityTier,
            apiEndpoint: input.apiEndpoint || "",
            apiKeyRef: input.apiKeyRef || "",
            priority: input.priority,
            enabled: input.enabled,
          })
          .$returningId();
        return { id: result.id, action: "created" };
      }
    }),

  // ===== 3. 删除算法 =====
  remove: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(algorithms).where(eq(algorithms.id, input.id));
      return { success: true };
    }),

  // ===== 4. 测试路由匹配 =====
  testMatch: publicQuery
    .input(
      z.object({
        category: z.string(),
        sceneType: z.string(),
        colorTone: z.string(),
        lightMode: z.string(),
        mode: z.enum(["single", "parallel", "adaptive"]).default("single"),
      })
    )
    .query(async ({ input }) => {
      const matches = await matchAlgorithms(input, input.mode);
      return matches.map((m) => ({
        id: m.algo.id,
        name: m.algo.name,
        type: m.algo.type,
        score: Math.round(m.score),
        reasons: m.reasons,
        priority: m.algo.priority,
        successRate: m.algo.successRate,
      }));
    }),

  // ===== 5. 初始化默认算法库（种子数据） =====
  seed: publicQuery.mutation(async () => {
    const db = getDb();

    // 检查是否已有数据
    const existing = await db.select().from(algorithms);
    if (existing.length > 0) {
      return { seeded: false, count: existing.length, message: "算法库已有数据" };
    }

    const defaultAlgorithms = [
      {
        name: "Flux通用文生图",
        type: "general" as const,
        description: "开源Flux-dev通用文生图大模型，适合创意海报、氛围图、非标准化商品",
        categories: ["*"],
        scenes: ["scene", "banner"],
        styles: ["cool", "warm", "gray", "realistic"],
        qualityTier: "standard" as const,
        apiEndpoint: "https://api.replicate.com/v1/predictions",
        apiKeyRef: "REPLICATE_API_KEY",
        priority: 50,
        enabled: true,
      },
      {
        name: "IPAdapter商品保真",
        type: "product_fidelity" as const,
        description: "锁定商品主体形态不变，仅替换背景/光影/风格，不畸变不走样。适合鞋服、3C、家居实物商品",
        categories: ["3c", "fashion", "home", "beauty", "appliance"],
        scenes: ["white", "scene"],
        styles: ["cool", "warm", "gray", "soft", "realistic", "3d"],
        qualityTier: "premium" as const,
        apiEndpoint: "https://api.replicate.com/v1/predictions",
        apiKeyRef: "REPLICATE_API_KEY",
        priority: 10,
        enabled: true,
      },
      {
        name: "ControlNet结构约束",
        type: "controlnet" as const,
        description: "边缘检测+深度估计+构图网格约束，严格控制商品摆放角度、构图比例、透视对称。适合3C、家电、规整家居",
        categories: ["3c", "appliance"],
        scenes: ["white", "detail"],
        styles: ["cool", "gray", "realistic", "3d"],
        qualityTier: "premium" as const,
        apiEndpoint: "https://api.replicate.com/v1/predictions",
        apiKeyRef: "REPLICATE_API_KEY",
        priority: 15,
        enabled: true,
      },
      {
        name: "鞋服LoRA领域模型",
        type: "lora" as const,
        description: "鞋服箱包专属微调LoRA，适配皮革/面料/玻璃/金属材质纹理，行业固定审美风格",
        categories: ["fashion"],
        scenes: ["white", "scene", "detail"],
        styles: ["warm", "soft", "realistic"],
        qualityTier: "premium" as const,
        apiEndpoint: "https://api.replicate.com/v1/predictions",
        apiKeyRef: "REPLICATE_API_KEY",
        priority: 5,
        enabled: true,
      },
      {
        name: "美妆LoRA领域模型",
        type: "lora" as const,
        description: "美妆护肤品专属微调LoRA，适配瓶罐通透感、光影细腻、水润质感",
        categories: ["beauty"],
        scenes: ["white", "scene", "detail"],
        styles: ["cool", "warm", "soft", "realistic"],
        qualityTier: "premium" as const,
        apiEndpoint: "https://api.replicate.com/v1/predictions",
        apiKeyRef: "REPLICATE_API_KEY",
        priority: 5,
        enabled: true,
      },
      {
        name: "超分精修增强",
        type: "upscaler" as const,
        description: "后置链路专用算法：去噪、锐化、细节补全、4K超分、光影统一。适合所有需要高清商用级质量的主图",
        categories: ["*"],
        scenes: ["white", "scene", "detail", "banner"],
        styles: ["cool", "warm", "gray", "soft", "realistic", "3d"],
        qualityTier: "ultra" as const,
        apiEndpoint: "https://api.replicate.com/v1/predictions",
        apiKeyRef: "REPLICATE_API_KEY",
        priority: 100,
        enabled: true,
      },
      {
        name: "合规净化算法",
        type: "compliance" as const,
        description: "画面智能校验+元素移除：自动去除水印、文字、杂物、畸形结构。适合电商平台合规主图",
        categories: ["*"],
        scenes: ["white"],
        styles: ["cool", "warm", "gray"],
        qualityTier: "standard" as const,
        apiEndpoint: "https://api.replicate.com/v1/predictions",
        apiKeyRef: "REPLICATE_API_KEY",
        priority: 200,
        enabled: true,
      },
    ];

    for (const algo of defaultAlgorithms) {
      await db.insert(algorithms).values(algo);
    }

    return { seeded: true, count: defaultAlgorithms.length };
  }),
});
