/**
 * AI生图适配器抽象基类
 * 
 * 定位：封装不同AI生图模型的调用逻辑
 * 子类实现：
 * - FluxAdapter：FLUX.1-dev，高质量（~8-15秒/张）
 * - ZImageAdapter：Z-Image-Turbo，高速度（~2-5秒/张）
 * 
 * 核心方法：generate(sourceImage, prompt, params) → Buffer
 */

export interface AIGenerationParams {
  prompt: string;
  width?: number;
  height?: number;
  sourceImage?: string; // DataURL 或 URL
  seed?: number;
  steps?: number; // 扩散步数，影响质量和速度
}

export interface AIGenerationResult {
  buffer: Buffer;
  model: string;
  seed: number;
  inferenceTime: number;
}

export abstract class BaseAIGenerator {
  abstract readonly modelName: string;
  abstract readonly type: "flux" | "z-image" | string;
  abstract readonly defaultSteps: number;

  /**
   * 核心生图方法
   * 输入：用户原图 + Prompt + 参数
   * 输出：AI生成的图片 Buffer
   * 
   * 生产环境实现：
   * - Flux：调用本地 diffusers pipeline 或 Replicate API
   * - Z-Image：调用通义万相 API
   */
  abstract generate(params: AIGenerationParams): Promise<AIGenerationResult>;

  /**
   * Prompt 增强：根据不同品类/场景润色 Prompt
   */
  abstract enhancePrompt(basePrompt: string, category: string, sceneType: string): string;
}
