/**
 * 计费系统 Schema + Router
 *
 * 功能：
 * - 积分消耗（按生成次数/算法类型扣积分）
 * - 消费记录查询
 * - 套餐购买（TODO：接入支付）
 */

import { z } from "zod";
import { createRouter, publicProcedure, protectedProcedure } from "../middleware";
import { getDb } from "../queries/connection";
import { billingRecords, generationTasks } from "@db/schema";
import { eq, desc } from "drizzle-orm";

// =================== 积分规则 ===================

/**
 * 各操作消耗积分
 */
export const CREDIT_COSTS: Record<string, number> = {
  "single": 5,       // 单算法模式：5 积分/张
  "parallel": 12,    // 并行择优：12 积分/张（3 倍算力）
  "adaptive": 8,     // 自适应：8 积分/张（可能重试）
  "regenerate": 3,   // 重新生成：3 积分
};

/**
 * 各算法类型额外加成
 */
export const ALGORITHM_COST_MODIFIERS: Record<string, number> = {
  "general": 1.0,
  "product_fidelity": 1.5,  // IPAdapter 额外算力
  "controlnet": 1.5,
  "lora": 1.3,             // LoRA 模型贵
  "upscaler": 2.0,         // 超分最贵
  "compliance": 0.5,        // 合规净化便宜
};

/**
 * 计算实际消耗积分
 */
export function calculateCredits(mode: string, algorithmType?: string): number {
  const base = CREDIT_COSTS[mode] ?? CREDIT_COSTS["single"];
  const modifier = algorithmType ? (ALGORITHM_COST_MODIFIERS[algorithmType] ?? 1.0) : 1.0;
  return Math.round(base * modifier);
}

// =================== Router ===================

export const billingRouter = createRouter({
  /**
   * 查询积分余额
   */
  getCredits: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    const [user] = await db.select().from(billingRecords)
      .where(eq(billingRecords.userId, ctx.userId))
      .orderBy(desc(billingRecords.createdAt))
      .limit(1);
    return { credits: user?.remainingCredits ?? 0 };
  }),

  /**
   * 查询消费记录
   */
  history: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(20), offset: z.number().default(0) }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const records = await db.select().from(billingRecords)
        .where(eq(billingRecords.userId, ctx.userId))
        .orderBy(desc(billingRecords.createdAt))
        .limit(input.limit)
        .offset(input.offset);
      return records;
    }),

  /**
   * 内部：扣除积分（由 imageGen router 调用）
   */
  deductCredits: protectedProcedure
    .input(z.object({
      userId: z.number(),
      taskId: z.number(),
      credits: z.number(),
      description: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();

      const [last] = await db.select().from(billingRecords)
        .where(eq(billingRecords.userId, input.userId))
        .orderBy(desc(billingRecords.createdAt))
        .limit(1);

      const balance = last?.remainingCredits ?? 0;
      if (balance < input.credits) {
        throw new Error("积分不足，请先充值");
      }

      const newBalance = balance - input.credits;

      await db.insert(billingRecords).values({
        userId: input.userId,
        taskId: input.taskId,
        creditsChange: -input.credits,
        remainingCredits: newBalance,
        description: input.description,
      });

      return { deducted: input.credits, remaining: newBalance };
    }),

  /**
   * 内部：积分退还（任务失败时调用）
   */
  refundCredits: protectedProcedure
    .input(z.object({
      userId: z.number(),
      taskId: z.number(),
      credits: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [last] = await db.select().from(billingRecords)
        .where(eq(billingRecords.userId, input.userId))
        .orderBy(desc(billingRecords.createdAt))
        .limit(1);

      const newBalance = (last?.remainingCredits ?? 0) + input.credits;
      await db.insert(billingRecords).values({
        userId: input.userId,
        taskId: input.taskId,
        creditsChange: input.credits,
        remainingCredits: newBalance,
        description: `任务 ${input.taskId} 失败，退还 ${input.credits} 积分`,
      });

      return { refunded: input.credits, remaining: newBalance };
    }),
});
