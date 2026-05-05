import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { algorithms } from "@db/schema";

export const algorithmRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(algorithms).orderBy(algorithms.priority);
  }),

  seed: publicQuery.mutation(async () => {
    const db = getDb();
    const existing = await db.select().from(algorithms);
    if (existing.length > 0) return { seeded: false, count: existing.length };

    const defaults = [
      { name: "Flux通用文生图", type: "general", description: "通用创意生成", categories: ["*"], scenes: ["banner", "scene"], styles: ["*"], qualityTier: "standard", priority: 50, enabled: true },
      { name: "IPAdapter商品保真", type: "product_fidelity", description: "锁定产品形态", categories: ["3c", "fashion", "home", "beauty", "appliance"], scenes: ["white", "scene", "detail"], styles: ["*"], qualityTier: "premium", priority: 10, enabled: true },
      { name: "ControlNet结构约束", type: "controlnet", description: "严格控制构图", categories: ["3c", "appliance"], scenes: ["white", "detail"], styles: ["cool", "gray", "realistic", "3d"], qualityTier: "premium", priority: 15, enabled: true },
      { name: "鞋服LoRA领域模型", type: "lora", description: "鞋服专属材质", categories: ["fashion"], scenes: ["white", "scene", "detail"], styles: ["warm", "soft", "realistic"], qualityTier: "premium", priority: 5, enabled: true },
      { name: "美妆LoRA领域模型", type: "lora", description: "美妆通透光影", categories: ["beauty"], scenes: ["white", "scene", "detail"], styles: ["cool", "warm", "soft", "realistic"], qualityTier: "premium", priority: 5, enabled: true },
      { name: "超分精修增强", type: "upscaler", description: "4K超分锐化", categories: ["*"], scenes: ["*"], styles: ["*"], qualityTier: "ultra", priority: 100, enabled: true },
      { name: "合规净化算法", type: "compliance", description: "去水印文字", categories: ["*"], scenes: ["white"], styles: ["*"], qualityTier: "standard", priority: 200, enabled: true },
    ];

    for (const d of defaults) {
      await db.insert(algorithms).values(d as any);
    }
    return { seeded: true, count: defaults.length };
  }),
});
