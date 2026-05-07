/**
 * 任务历史 API
 * 查询用户过去的生成任务记录（需认证）
 */

import { z } from "zod";
import { createRouter, protectedProcedure, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { generationTasks, generationResults } from "@db/schema";
import { eq, desc, sql } from "drizzle-orm";

export const historyRouter = createRouter({
  /**
   * 分页查询任务列表
   */
  listTasks: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(10),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const tasks = await db.select({
        id: generationTasks.id,
        config: generationTasks.config,
        algorithmMode: generationTasks.algorithmMode,
        status: generationTasks.status,
        avgScore: generationTasks.avgScore,
        passCount: generationTasks.passCount,
        totalCount: generationTasks.totalCount,
        errorMsg: generationTasks.errorMsg,
        createdAt: generationTasks.createdAt,
        completedAt: generationTasks.completedAt,
      })
        .from(generationTasks)
        .where(eq(generationTasks.userId, ctx.userId))
        .orderBy(desc(generationTasks.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return tasks;
    }),

  /**
   * 任务统计汇总
   */
  stats: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();

    const [totalTasks] = await db
      .select({ count: sql<number>`count(*)` })
      .from(generationTasks)
      .where(eq(generationTasks.userId, ctx.userId));

    const [totalImages] = await db
      .select({ count: sql<number>`count(*)` })
      .from(generationResults)
      .innerJoin(generationTasks, eq(generationResults.taskId, generationTasks.id))
      .where(eq(generationTasks.userId, ctx.userId));

    const [passImages] = await db
      .select({ count: sql<number>`count(*)` })
      .from(generationResults)
      .innerJoin(generationTasks, eq(generationResults.taskId, generationTasks.id))
      .where(sql`${generationTasks.userId} = ${ctx.userId} AND ${generationResults.status} = 'PASS'`);

    const [avgScoreResult] = await db
      .select({ avg: sql<number>`avg(${generationTasks.avgScore})` })
      .from(generationTasks)
      .where(sql`${generationTasks.userId} = ${ctx.userId} AND ${generationTasks.avgScore} IS NOT NULL`);

    return {
      totalTasks: totalTasks?.count ?? 0,
      totalImages: totalImages?.count ?? 0,
      passImages: passImages?.count ?? 0,
      avgScore: Math.round(avgScoreResult?.avg ?? 0),
    };
  }),

  /**
   * 删除任务
   */
  deleteTask: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [task] = await db.select()
        .from(generationTasks)
        .where(sql`${generationTasks.id} = ${input.taskId} AND ${generationTasks.userId} = ${ctx.userId}`)
        .limit(1);

      if (!task) throw new Error("任务不存在或无权删除");

      await db.delete(generationResults).where(eq(generationResults.taskId, input.taskId));
      await db.delete(generationTasks).where(eq(generationTasks.id, input.taskId));

      return { ok: true };
    }),
});
