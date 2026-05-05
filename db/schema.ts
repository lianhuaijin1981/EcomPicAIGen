import {
  mysqlTable,
  serial,
  varchar,
  text,
  int,
  timestamp,
  json,
  boolean,
} from "drizzle-orm/mysql-core";

// =================== 算法库管理表 ===================
// 存储所有可用的生图算法，支持多算法组合调度
export const algorithms = mysqlTable("algorithms", {
  id: serial("id").primaryKey(),
  // 算法名称（如"Flux通用文生图"、"IPAdapter商品保真"、"ControlNet结构约束"）
  name: varchar("name", { length: 255 }).notNull(),
  // 算法类型: general | product_fidelity | controlnet | lora | upscaler | compliance
  type: varchar("type", { length: 50 }).notNull(),
  // 算法描述
  description: text("description"),
  // 适配品类（JSON数组，如["3c","fashion","home"]）
  categories: json("categories").notNull(),
  // 适配用途（JSON数组，如["white","scene","detail","banner"]）
  scenes: json("scenes").notNull(),
  // 适配风格（JSON数组，如["cool","warm","gray","realistic","3d"]）
  styles: json("styles").notNull(),
  // 适配质量层级: standard | premium | ultra
  qualityTier: varchar("quality_tier", { length: 20 }).notNull().default("standard"),
  // 外部API端点（如Replicate/Leonardo的URL）
  apiEndpoint: text("api_endpoint"),
  // API密钥引用（指向环境变量名，如REPLICATE_API_KEY）
  apiKeyRef: varchar("api_key_ref", { length: 100 }),
  // 算法优先级（数字越小优先级越高，用于路由匹配排序）
  priority: int("priority").notNull().default(100),
  // 是否启用
  enabled: boolean("enabled").notNull().default(true),
  // 成功率评分（0-100，后端统计）
  successRate: int("success_rate"),
  // 平均分（基于历史生成结果）
  avgScore: int("avg_score"),
  // 创建时间
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // 更新时间
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// =================== AI 主图生成任务表 ===================
export const generationTasks = mysqlTable("generation_tasks", {
  id: serial("id").primaryKey(),
  // 任务配置（品类、场景类型、色调、光影、比例、平台）
  config: json("config").notNull(),
  // 算法路由信息：本次任务使用的算法组合策略
  algorithmRoute: json("algorithm_route"),
  // 算法模式: single | parallel | adaptive
  algorithmMode: varchar("algorithm_mode", { length: 20 }).notNull().default("single"),
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

// =================== 单张生成结果表 ===================
export const generationResults = mysqlTable("generation_results", {
  id: serial("id").primaryKey(),
  // 关联任务ID
  taskId: int("task_id").notNull(),
  // 使用的算法ID
  algorithmId: int("algorithm_id"),
  // 使用的算法名称（冗余存储，便于查询）
  algorithmName: varchar("algorithm_name", { length: 255 }),
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
