/**
 * AI生图引擎入口
 * 
 * 职责：根据策略选择适配器，执行AI生图，输出基础图
 * 
 * 流程：
 * 1. 算法路由 → 选择 Flux（高质量）或 Z-Image（高速度）
 * 2. Prompt构建 → 品类/场景增强
 * 3. AI生图 → 调用适配器.generate()
 * 4. 返回基础图 Buffer → 交给后处理引擎
 */

import { FluxAdapter } from "./adapters/FluxAdapter";
import { ZImageAdapter } from "./adapters/ZImageAdapter";
import { BaseAIGenerator } from "./adapters/BaseAdapter";

export type GeneratorType = "flux" | "z-image";

// 简单工厂
export function createGenerator(type: GeneratorType): BaseAIGenerator {
  switch (type) {
    case "flux":
      return new FluxAdapter();
    case "z-image":
      return new ZImageAdapter();
    default:
      return new FluxAdapter();
  }
}

// 算法路由：根据质量需求选择
export function selectGenerator(
  qualityTier: "standard" | "premium" | "ultra",
  speedPriority: boolean = false
): BaseAIGenerator {
  if (speedPriority || qualityTier === "standard") {
    return createGenerator("z-image");
  }
  return createGenerator("flux");
}

export { FluxAdapter, ZImageAdapter, BaseAIGenerator };
export type { AIGenerationParams, AIGenerationResult } from "./adapters/BaseAdapter";
