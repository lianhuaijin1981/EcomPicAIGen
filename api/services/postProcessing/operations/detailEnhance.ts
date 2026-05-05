/**
 * 细节图后处理流水线
 * 
 * 输入：AI生图引擎产出的基础产品图
 * 输出：局部特写 + 锐化 + 景深模糊背景
 */

import sharp from "sharp";
import { getTargetDimensions, getModulateParams } from "../core";

export async function detailImagePipeline(
  sourceBuffer: Buffer,
  params: {
    ratio: string;
    colorTone: string;
    lightMode: string;
  }
): Promise<Buffer> {
  const { width: canvasW, height: canvasH } = getTargetDimensions(params.ratio);
  const meta = await sharp(sourceBuffer).metadata();
  const origW = meta.width || 1024;
  const origH = meta.height || 1024;

  // 中心裁剪特写
  const cropSize = Math.round(Math.min(origW, origH) * 0.45);
  const left = Math.round((origW - cropSize) / 2);
  const top = Math.round((origH - cropSize) / 2);

  const detail = await sharp(sourceBuffer)
    .extract({ left, top, width: cropSize, height: cropSize })
    .resize(canvasW, canvasH, { fit: "cover" })
    .sharpen({ sigma: 1.5, m1: 2, m2: 0.5 })
    .modulate({
      brightness: 1.05,
      saturation: getModulateParams(params.lightMode, params.colorTone).saturation,
    })
    .gamma(0.9)
    .png()
    .toBuffer();

  // 背景高斯模糊（模拟浅景深）
  const blurredBg = await sharp(sourceBuffer)
    .extract({
      left: Math.max(0, left - 100),
      top: Math.max(0, top - 100),
      width: Math.min(origW - left, cropSize + 200),
      height: Math.min(origH - top, cropSize + 200),
    })
    .resize(canvasW, canvasH, { fit: "cover" })
    .blur(20)
    .modulate({ brightness: 0.8 })
    .png()
    .toBuffer();

  return sharp(blurredBg)
    .composite([{ input: detail, left: 0, top: 0 }])
    .jpeg({ quality: 92, progressive: true })
    .toBuffer();
}
