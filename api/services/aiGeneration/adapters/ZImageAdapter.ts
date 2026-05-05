/**
 * Z-Image-Turbo 适配器
 * 
 * 仓库：https://github.com/Tongyi-MAI/Z-Image
 * 定位：高速度生图（扩散步数 4-8，单张 2-5 秒）
 * 
 * 生产环境接入方式：
 * 1. 通义万相 API（阿里云 DashScope）
 * 2. 本地部署：Z-Image-Turbo diffusers pipeline
 * 3. 模型广场调用
 */

import type { AIGenerationParams, AIGenerationResult } from "./BaseAdapter";
import { BaseAIGenerator } from "./BaseAdapter";
import { dataUrlToBuffer } from "../../postProcessing/core";

export class ZImageAdapter extends BaseAIGenerator {
  readonly modelName = "Z-Image-Turbo";
  readonly type = "z-image";
  readonly defaultSteps = 4; // Turbo 特性：4步即可出图

  // 生产环境配置注释（启用真实API时取消注释并填入密钥）
  // private apiEndpoint: string = process.env.ZIMAGE_API_ENDPOINT || "https://dashscope.aliyuncs.com/api/v1/services/aigc/image-generation/generation";
  // private apiKey: string = process.env.ZIMAGE_API_KEY || "";

  constructor() {
    super();
  }

  /**
   * 生产环境真实实现（需取消注释并配置阿里云 DashScope）：
   * 
   * async generate(params: AIGenerationParams): Promise<AIGenerationResult> {
   *   const startTime = Date.now();
   *   
   *   const response = await fetch(this.apiEndpoint, {
   *     method: "POST",
   *     headers: {
   *       "Authorization": `Bearer ${this.apiKey}`,
   *       "Content-Type": "application/json",
   *     },
   *     body: JSON.stringify({
   *       model: "wanx2.1-t2i-turbo", // 或 wanx2.1-t2i-plus
   *       input: {
   *         prompt: params.prompt,
   *         negative_prompt: "text, watermark, logo, blurry, low quality",
   *         ref_image: params.sourceImage, // 参考图
   *         size: `${params.width || 1024}x${params.height || 1024}`,
   *         n: 1,
   *       },
   *       parameters: {
   *         seed: params.seed || Math.floor(Math.random() * 1000000),
   *       },
   *     }),
   *   });
   *   
   *   const result = await response.json();
   *   const imageUrl = result.output?.results?.[0]?.url;
   *   const imageResponse = await fetch(imageUrl);
   *   const buffer = Buffer.from(await imageResponse.arrayBuffer());
   *   
   *   return {
   *     buffer,
   *     model: this.modelName,
   *     seed: params.seed || 0,
   *     inferenceTime: Date.now() - startTime,
   *   };
   * }
   */

  // 演示环境：模拟 Z-Image-Turbo 生图（更快，2-5秒）
  async generate(params: AIGenerationParams): Promise<AIGenerationResult> {
    const startTime = Date.now();
    const seed = params.seed || Math.floor(Math.random() * 1000000);

    if (!params.sourceImage) {
      throw new Error("Z-Image requires source image for reference generation");
    }

    // 模拟处理延迟（2-5秒）
    const delay = 2000 + Math.floor(Math.random() * 3000);
    await new Promise((resolve) => setTimeout(resolve, delay));

    // 模拟：Turbo 模式处理更轻量，对比度更高
    const sourceBuffer = dataUrlToBuffer(params.sourceImage);
    const { default: sharp } = await import("sharp");

    // Turbo 风格：更高对比度，更饱和
    const processed = await sharp(sourceBuffer)
      .modulate({
        brightness: 1.02,
        saturation: 1.08, // Turbo 更鲜艳
      })
      .linear(1.05, 0) // Turbo 对比度增强
      .sharpen({ sigma: 1.0 }) // Turbo 默认锐化
      .jpeg({ quality: 92 })
      .toBuffer();

    return {
      buffer: processed,
      model: this.modelName,
      seed,
      inferenceTime: Date.now() - startTime,
    };
  }

  enhancePrompt(basePrompt: string, category: string, sceneType: string): string {
    // Turbo 模型对中文支持更好，Prompt 更简洁
    const categoryMap: Record<string, string> = {
      "3c": "电子产品，精密金属质感，科技感",
      fashion: "时尚服装，面料纹理，高级感",
      home: "家居用品，温馨生活，自然光",
      beauty: "美妆护肤，通透瓶身，水润光泽",
      appliance: "家电产品，工业设计，简洁线条",
    };

    const sceneMap: Record<string, string> = {
      white: "纯白背景，产品居中，专业影棚",
      scene: "真实场景，环境光，生活氛围",
      detail: "微距特写，景深虚化，材质细节",
      banner: "创意构图，广告风格，视觉冲击",
    };

    return `${basePrompt}，${categoryMap[category] || categoryMap["3c"]}，${sceneMap[sceneType] || sceneMap.white}，电商主图，高清无水印`;
  }
}
