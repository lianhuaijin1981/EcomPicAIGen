/**
 * 场景图后处理流水线
 * 
 * 输入：AI生图引擎产出的基础产品图
 * 输出：渐变背景 + 产品 + 环境阴影 + 光影匹配
 */

import sharp from "sharp";
import {
  createGradientBackground,
  createShadow,
  preprocessProduct,
  getSceneGradient,
  getTargetDimensions,
} from "../core";

export async function sceneImagePipeline(
  sourceBuffer: Buffer,
  params: {
    ratio: string;
    colorTone: string;
    lightMode: string;
  }
): Promise<Buffer> {
  const { width: canvasW, height: canvasH } = getTargetDimensions(params.ratio);
  const gradient = getSceneGradient(params.colorTone);
  const background = await createGradientBackground(canvasW, canvasH, gradient.start, gradient.end);
  const productMaxW = Math.round(Math.min(canvasW, canvasH) * 0.55);

  const product = await preprocessProduct(sourceBuffer, params.lightMode, params.colorTone, productMaxW);
  const prodMeta = await sharp(product).metadata();
  const prodW = prodMeta.width || productMaxW;
  const prodH = prodMeta.height || productMaxW;

  const shadowW = Math.round(prodW * 1.4);
  const shadowH = Math.round(prodH * 0.2);
  const shadow = await createShadow(shadowW, shadowH, 0.08);

  const topOffset = Math.round((canvasH - prodH) * 0.55);
  const shadowTop = topOffset + prodH - Math.round(shadowH * 0.4);

  return sharp(background)
    .composite([
      { input: shadow, left: Math.round((canvasW - shadowW) / 2), top: shadowTop },
      { input: product, left: Math.round((canvasW - prodW) / 2), top: topOffset },
    ])
    .jpeg({ quality: 92, progressive: true })
    .toBuffer();
}
