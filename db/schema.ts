import {
  mysqlTable,
  serial,
  varchar,
  text,
  int,
  timestamp,
  json,
} from "drizzle-orm/mysql-core";

/**
 * AI 主图生成任务表
 * 存储用户上传的批量生图任务
 */
export const generationTasks = mysqlTable("generation_tasks", {
  id: serial("id").primaryKey(),
  // 任务配置（品类、场景类型、色调、光影、比例、平台）
  config: json("config").notNull(),
  // 原始上传图片列表（JSON数组，包含name, previewUrl, size）
  sourceImages: json("source_images").notNull(),
  // 任务状态: pending | generating | scoring | completed | failed
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  // 总分平均分
  avgScore: int("avg_score"),
  // 合格数量
  passCount: int("pass_count"),
  // 总数量
  totalCount: int("total_count"),
  // 失败原因（如有）
  errorMsg: text("error_msg"),
  // 创建时间
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // 完成时间
  completedAt: timestamp("completed_at"),
});

/**
 * 单张生成结果表
 * 存储每个SKU的生成结果和质量评分
 */
export const generationResults = mysqlTable("generation_results", {
  id: serial("id").primaryKey(),
  // 关联任务ID
  taskId: int("task_id").notNull(),
  // SKU名称
  skuName: varchar("sku_name", { length: 255 }).notNull(),
  // 源图片URL
  sourceImage: text("source_image"),
  // 生成后图片URL
  generatedImage: text("generated_image"),
  // 4维度评分
  decisionScore: int("decision_score"),
  infoScore: int("info_score"),
  trustScore: int("trust_score"),
  visualScore: int("visual_score"),
  // 总分
  totalScore: int("total_score"),
  // 状态: PASS | MARGINAL | FAIL
  status: varchar("status", { length: 20 }),
  // 生成所用的prompt
  prompt: text("prompt"),
  // 重试次数
  retryCount: int("retry_count").notNull().default(0),
  // 创建时间
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
