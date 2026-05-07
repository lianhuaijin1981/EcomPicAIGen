import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

// =================== 用户表 ===================
export const users = sqliteTable("users", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  nickname: text("nickname"),
  credits: integer("credits").notNull().default(0),
  role: text("role").notNull().default("user"), // "user" | "admin"
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// =================== 用户会话表 ===================
export const userSessions = sqliteTable("user_sessions", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// =================== 计费记录表 ===================
export const billingRecords = sqliteTable("billing_records", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  taskId: integer("task_id").references(() => generationTasks.id),
  creditsChange: integer("credits_change").notNull(),
  remainingCredits: integer("remaining_credits").notNull(),
  description: text("description"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// =================== 算法库管理表 ===================
export const algorithms = sqliteTable("algorithms", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type").notNull(),
  description: text("description"),
  categories: text("categories", { mode: "json" }).notNull().$default(() => []),
  scenes: text("scenes", { mode: "json" }).notNull().$default(() => []),
  styles: text("styles", { mode: "json" }).notNull().$default(() => []),
  qualityTier: text("quality_tier").notNull().default("standard"),
  apiEndpoint: text("api_endpoint"),
  apiKeyRef: text("api_key_ref"),
  priority: integer("priority").notNull().default(100),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  successRate: integer("success_rate"),
  avgScore: integer("avg_score"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// =================== AI 主图生成任务表 ===================
export const generationTasks = sqliteTable("generation_tasks", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: integer("user_id"),
  config: text("config", { mode: "json" }).notNull(),
  algorithmRoute: text("algorithm_route", { mode: "json" }),
  algorithmMode: text("algorithm_mode").notNull().default("single"),
  sourceImages: text("source_images", { mode: "json" }).notNull(),
  status: text("status").notNull().default("pending"),
  avgScore: integer("avg_score"),
  passCount: integer("pass_count"),
  totalCount: integer("total_count"),
  errorMsg: text("error_msg"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

// =================== 单张生成结果表 ===================
export const generationResults = sqliteTable("generation_results", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  taskId: integer("task_id").notNull(),
  algorithmId: integer("algorithm_id"),
  algorithmName: text("algorithm_name"),
  skuName: text("sku_name").notNull(),
  sourceImage: text("source_image"),
  generatedImage: text("generated_image"),
  decisionScore: integer("decision_score"),
  infoScore: integer("info_score"),
  trustScore: integer("trust_score"),
  visualScore: integer("visual_score"),
  totalScore: integer("total_score"),
  status: text("status"),
  prompt: text("prompt"),
  retryCount: integer("retry_count").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});
