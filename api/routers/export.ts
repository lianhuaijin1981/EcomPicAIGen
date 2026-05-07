/**
 * 批量导出 API
 * 将任务结果打包为 ZIP 下载（需认证）
 */

import { z } from "zod";
import { createRouter, protectedProcedure, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { generationTasks, generationResults } from "@db/schema";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

export const exportRouter = createRouter({
  /**
   * 获取任务结果列表（用于客户端打包）
   * 返回合格图片的 URL + 元数据
   */
  getExportList: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();

      const [task] = await db.select()
        .from(generationTasks)
        .where(eq(generationTasks.id, input.taskId))
        .limit(1);

      if (!task) throw new Error("任务不存在");
      if ((task as any).userId && (task as any).userId !== ctx.userId) {
        throw new Error("无权访问此任务");
      }

      const results = await db.select()
        .from(generationResults)
        .where(eq(generationResults.taskId, input.taskId));

      // 返回合格结果（status === PASS）
      return results
        .filter(r => r.status === "PASS")
        .map(r => ({
          id: r.id,
          skuName: r.skuName,
          generatedImage: r.generatedImage,
          totalScore: r.totalScore,
          algorithmName: r.algorithmName,
          decisionScore: r.decisionScore,
          infoScore: r.infoScore,
          trustScore: r.trustScore,
          visualScore: r.visualScore,
        }));
    }),

  /**
   * 批量导出所有合格图片
   * 返回服务器端打包的 ZIP 文件路径（供下载）
   */
  batchExport: protectedProcedure
    .input(z.object({
      taskId: z.number(),
      includeFailed: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      const [task] = await db.select()
        .from(generationTasks)
        .where(eq(generationTasks.id, input.taskId))
        .limit(1);

      if (!task) throw new Error("任务不存在");

      const results = await db.select()
        .from(generationResults)
        .where(eq(generationResults.taskId, input.taskId));

      const toExport = input.includeFailed
        ? results
        : results.filter(r => r.status === "PASS");

      if (toExport.length === 0) {
        throw new Error("没有可导出的图片");
      }

      // 构建导出文件名
      const config = task.config as Record<string, string>;
      const timestamp = new Date().toISOString().slice(0, 10);
      const category = config.category ?? "all";
      const filename = `EcomPicAIGen_${category}_${task.id}_${timestamp}.zip`;

      return {
        taskId: input.taskId,
        filename,
        totalCount: toExport.length,
        passCount: toExport.filter(r => r.status === "PASS").length,
        failCount: toExport.filter(r => r.status !== "PASS").length,
        // 前端使用 fetch 分别下载每张图片，然后打包
        urls: toExport.map(r => ({
          url: r.generatedImage,
          filename: `${r.skuName}_${r.totalScore}分.jpg`,
          score: r.totalScore,
        })),
      };
    }),
});
