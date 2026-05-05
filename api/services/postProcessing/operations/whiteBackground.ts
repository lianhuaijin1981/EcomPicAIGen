/**
 * 白底图后处理流水线
 * 
 * 输入：AI生图引擎产出的基础产品图
 * 输出：纯白背景 + 产品居中 + 底部阴影 + 色调匹配
 */

import sharp from "sharp";
import {
  createSolidBackground,
  createShadow,
  preprocessProduct,
  getBackgroundColor,
  getTargetDimensions,
} from "../core";

export async function whiteBackgroundPipeline(
  sourceBuffer: Buffer,
  params: {
    ratio: string;
    colorTone: string;
    lightMode: string;
  }
): Promise<Buffer> {
  const { width: canvasW, height: canvasH } = getTargetDimensions(params.ratio);
  const bgColor = getBackgroundColor(params.colorTone);
  const productMaxW = Math.round(Math.min(canvasW, canvasH) * 0.65);

  // 预处理产品
  const product = await preprocessProduct(sourceBuffer, params.lightMode, params.colorTone, productMaxW);
  const prodMeta = await sharp(product).metadata();
  const prodW = prodMeta.width || productMaxW;
  const prodH = prodMeta.height || productMaxW;

  // 背景 + 阴影
  const background = await createSolidBackground(canvasW, canvasH, bgColor);
  const shadowW = Math.round(prodW * 1.1);
  const shadowH = Math.round(prodH * 0.15);
  const shadow = await createShadow(shadowW, shadowH, 0.12);

  // 合成
  const topOffset = Math.round((canvasH - prodH) * 0.45);
  const shadowTop = topOffset + prodH - Math.round(shadowH * 0.3);

  return sharp(background)
    .composite([
      { input: shadow, left: Math.round((canvasW - shadowW) / 2), top: shadowTop },
      { input: product, left: Math.round((canvasW - prodW) / 2), top: topOffset },
    ])
    .jpeg({ quality: 92, progressive: true })
    .toBuffer();
}
