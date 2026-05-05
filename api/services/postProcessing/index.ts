/**
 * 后处理引擎入口
 * 
 * 职责：接收AI生图引擎产出的基础图，执行确定性后处理操作
 * 包括：白底合成、场景合成、细节增强、尺寸调整、超分、水印、合规
 */

import { dataUrlToBuffer, saveGeneratedImage } from "./core";
import { whiteBackgroundPipeline } from "./operations/whiteBackground";
import { sceneImagePipeline } from "./operations/sceneComposite";
import { detailImagePipeline } from "./operations/detailEnhance";

export interface PostProcessParams {
  sceneType: string;
  ratio: string;
  colorTone: string;
  lightMode: string;
  category: string;
}

/**
 * 后处理主入口
 * 输入：AI生图引擎产出的图片（Buffer 或 DataURL）
 * 输出：后处理后的最终图片 Buffer
 */
export async function postProcess(
  aiGeneratedImage: Buffer | string,
  params: PostProcessParams
): Promise<Buffer> {
  const sourceBuffer = typeof aiGeneratedImage === "string"
    ? dataUrlToBuffer(aiGeneratedImage)
    : aiGeneratedImage;

  switch (params.sceneType) {
    case "white":
      return whiteBackgroundPipeline(sourceBuffer, params);
    case "scene":
      return sceneImagePipeline(sourceBuffer, params);
    case "detail":
      return detailImagePipeline(sourceBuffer, params);
    default:
      return whiteBackgroundPipeline(sourceBuffer, params);
  }
}

/**
 * 快捷方法：后处理 + 保存
 */
export async function postProcessAndSave(
  aiGeneratedImage: Buffer | string,
  params: PostProcessParams,
  filename: string
): Promise<string> {
  const buffer = await postProcess(aiGeneratedImage, params);
  return saveGeneratedImage(buffer, filename);
}

export { whiteBackgroundPipeline, sceneImagePipeline, detailImagePipeline };
export * from "./core";
