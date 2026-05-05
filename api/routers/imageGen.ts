import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { generationTasks, generationResults } from "@db/schema";
import { eq } from "drizzle-orm";

// =================== Prompt 工程系统 ===================

const CATEGORY_PROMPTS: Record<string, string> = {
  "3c": "3C digital product",
  fashion: "fashion apparel or footwear",
  home: "home daily necessities",
  beauty: "beauty and personal care product",
  appliance: "home appliance",
};

const SCENE_PROMPTS: Record<string, string> = {
  white: "pure white background, professional studio lighting, centered product",
  scene: "real lifestyle scene, natural environment, warm ambient lighting",
  detail: "extreme macro close-up, shallow depth of field, texture detail",
};

const COLOR_PROMPTS: Record<string, string> = {
  cool: "cool color temperature, blue-toned lighting",
  warm: "warm color temperature, golden-hour lighting",
  gray: "neutral gray tone, sophisticated minimal palette",
};

const LIGHT_PROMPTS: Record<string, string> = {
  soft: "soft diffused lighting, gentle shadows",
  realistic: "realistic natural lighting, HDR tone mapping",
  "3d": "dramatic 3-point lighting, strong depth and volume",
};

function buildPrompt(category: string, sceneType: string, colorTone: string, lightMode: string, skuName: string): string {
  const cat = CATEGORY_PROMPTS[category] || "product";
  const scene = SCENE_PROMPTS[sceneType] || SCENE_PROMPTS.white;
  const color = COLOR_PROMPTS[colorTone] || "";
  const light = LIGHT_PROMPTS[lightMode] || "";

  return `Professional e-commerce main image photography. A ${cat} named "${skuName}", ${scene}. ${color}. ${light}. Ultra-sharp commercial quality, no text, no logos, no watermarks. Product centered, clean composition.`;
}

// =================== 质量评分算法 ===================

function generateScore(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const base = Math.abs(hash) % 15;
  const decision = Math.min(30, 26 + (base % 4));
  const info = Math.min(25, 22 + (base % 3));
  const trust = Math.min(25, 23 + (base % 2));
  const visual = Math.min(20, 18 + (base % 3));
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

// 预设生成结果图片映射（开发环境模拟用）
const PRESET_IMAGES = [
  "/images/products/01_phone.jpg",
  "/images/products/02_earbuds.jpg",
  "/images/products/07_keyboard.jpg",
  "/images/products/10_smartwatch.jpg",
  "/images/products/15_sneakers.jpg",
  "/images/products/17_backpack.jpg",
  "/images/products/31_lipstick.jpg",
  "/images/products/45_humidifier.jpg",
];

export const imageGenRouter = createRouter({
  // ===== 1. 创建生图任务 =====
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

      // 1. 创建任务记录（MySQL 不支持 returning，用 $returningId + select）
      const insertRes = await db
        .insert(generationTasks)
        .values({
          config: input.config,
          sourceImages: input.files,
          status: "pending",
          totalCount: input.files.length,
          passCount: 0,
        })
        .$returningId();

      const taskId = insertRes[0].id;

      // 获取刚插入的任务（用于确认插入成功）
      const [_task] = await db
        .select()
        .from(generationTasks)
        .where(eq(generationTasks.id, taskId));

      // 2. 为每个SKU预创建结果记录
      for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        const prompt = buildPrompt(
          input.config.category,
          input.config.sceneType,
          input.config.colorTone,
          input.config.lightMode,
          file.name
        );
        await db.insert(generationResults).values({
          taskId: taskId,
          skuName: file.name,
          sourceImage: file.preview,
          status: "PASS",
          prompt,
          retryCount: 0,
        });
      }

      return { taskId: taskId, total: input.files.length };
    }),

  // ===== 2. 执行生图（模拟真实API调用） =====
  generate: publicQuery
    .input(z.object({ taskId: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();

      // 更新任务状态为 generating
      await db
        .update(generationTasks)
        .set({ status: "generating" })
        .where(eq(generationTasks.id, input.taskId));

      // 获取任务配置和结果记录
      const [task] = await db
        .select()
        .from(generationTasks)
        .where(eq(generationTasks.id, input.taskId));

      if (!task) throw new Error("Task not found");

      const config = task.config as Record<string, string>;
      const results = await db
        .select()
        .from(generationResults)
        .where(eq(generationResults.taskId, input.taskId));

      // 模拟逐个SKU生成（实际生产环境这里调用真实AI生图API）
      const updatedResults = [];
      let totalScore = 0;
      let passCount = 0;

      for (let i = 0; i < results.length; i++) {
        const r = results[i];

        // 构建prompt
        const prompt = buildPrompt(
          config.category || "3c",
          config.sceneType || "white",
          config.colorTone || "cool",
          config.lightMode || "soft",
          r.skuName
        );

        // 生成评分（基于seed的确定性伪随机）
        const seed = `${r.skuName}-${config.category}-${config.sceneType}-${r.retryCount}`;
        const scores = generateScore(seed);

        // 分配预设图片（模拟生成结果）
        const imgIndex = (i + r.retryCount) % PRESET_IMAGES.length;
        const generatedImage = PRESET_IMAGES[imgIndex];

        // 更新结果记录（MySQL不支持returning，先update再select）
        await db
          .update(generationResults)
          .set({
            generatedImage,
            decisionScore: scores.decision,
            infoScore: scores.info,
            trustScore: scores.trust,
            visualScore: scores.visual,
            totalScore: scores.total,
            status: scores.status,
            prompt,
          })
          .where(eq(generationResults.id, r.id));

        const [updated] = await db
          .select()
          .from(generationResults)
          .where(eq(generationResults.id, r.id));

        updatedResults.push(updated);
        totalScore += scores.total;
        if (scores.status === "PASS") passCount++;

        // 模拟每个SKU处理时间（实际生产中不需要这个延迟）
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
      const results = await db
        .select()
        .from(generationResults)
        .where(eq(generationResults.taskId, input.taskId));
      return results;
    }),

  // ===== 5. 重新生成单张图 =====
  regenerateOne: publicQuery
    .input(z.object({ resultId: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();

      // 获取当前结果
      const [current] = await db
        .select()
        .from(generationResults)
        .where(eq(generationResults.id, input.resultId));

      if (!current) throw new Error("Result not found");

      // 获取任务配置
      const [task] = await db
        .select()
        .from(generationTasks)
        .where(eq(generationTasks.id, current.taskId));

      const config = task?.config as Record<string, string> || {};

      // 增加重试次数
      const newRetryCount = (current.retryCount || 0) + 1;

      // 用新的seed生成不同分数
      const seed = `${current.skuName}-${config.category || "3c"}-${Date.now()}`;
      const scores = generateScore(seed);

      const imgIndex = (input.resultId + newRetryCount) % PRESET_IMAGES.length;
      const generatedImage = PRESET_IMAGES[imgIndex];

      // 更新记录（MySQL不支持returning，先update再select）
      await db
        .update(generationResults)
        .set({
          generatedImage,
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
