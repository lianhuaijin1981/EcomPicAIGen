/**
 * 后处理引擎：确定性图像操作
 * 
 * 定位：AI生图后的图层合成、尺寸调整、水印添加、合规净化
 * 输入：AI生图引擎产出的基础图（Buffer）
 * 输出：符合电商平台规范的最终图片
 */

import sharp from "sharp";
import fs from "fs";
import path from "path";

// ============================
// 工具函数
// ============================

export function dataUrlToBuffer(dataUrl: string): Buffer {
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
  return Buffer.from(base64, "base64");
}

export function bufferToDataUrl(buffer: Buffer, mimeType: string = "image/jpeg"): string {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

export function getTargetDimensions(ratio: string): { width: number; height: number } {
  const ratioMap: Record<string, { width: number; height: number }> = {
    "1:1": { width: 1024, height: 1024 },
    "3:4": { width: 768, height: 1024 },
    "9:16": { width: 576, height: 1024 },
  };
  return ratioMap[ratio] || ratioMap["1:1"];
}

export function getBackgroundColor(colorTone: string): { r: number; g: number; b: number } {
  switch (colorTone) {
    case "cool": return { r: 245, g: 248, b: 252 };
    case "warm": return { r: 255, g: 252, b: 245 };
    case "gray": return { r: 248, g: 248, b: 248 };
    default: return { r: 255, g: 255, b: 255 };
  }
}

export function getSceneGradient(colorTone: string): { start: [number, number, number]; end: [number, number, number] } {
  switch (colorTone) {
    case "cool": return { start: [230, 240, 255], end: [245, 248, 252] };
    case "warm": return { start: [255, 245, 230], end: [255, 252, 245] };
    case "gray": return { start: [235, 235, 235], end: [248, 248, 248] };
    default: return { start: [245, 245, 245], end: [255, 255, 255] };
  }
}

export function getModulateParams(lightMode: string, colorTone: string) {
  const lightMap: Record<string, { brightness: number; saturation: number; gamma: number }> = {
    soft: { brightness: 1.05, saturation: 0.95, gamma: 1.1 },
    realistic: { brightness: 1.0, saturation: 1.0, gamma: 1.0 },
    "3d": { brightness: 1.1, saturation: 1.05, gamma: 0.95 },
  };
  const base = lightMap[lightMode] || lightMap.soft;

  const colorMap: Record<string, { satBoost: number }> = {
    cool: { satBoost: 0.92 },
    warm: { satBoost: 1.08 },
    gray: { satBoost: 0.85 },
  };
  const c = colorMap[colorTone] || { satBoost: 1.0 };

  return {
    brightness: base.brightness,
    saturation: base.saturation * c.satBoost,
    gamma: base.gamma,
  };
}

// ============================
// 背景生成
// ============================

export async function createSolidBackground(
  width: number,
  height: number,
  color: { r: number; g: number; b: number }
): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: color },
  }).png().toBuffer();
}

export async function createGradientBackground(
  width: number,
  height: number,
  start: [number, number, number],
  end: [number, number, number]
): Promise<Buffer> {
  const channels = 4;
  const buffer = Buffer.alloc(width * height * channels);

  for (let y = 0; y < height; y++) {
    const ratio = y / height;
    const r = Math.round(start[0] + (end[0] - start[0]) * ratio);
    const g = Math.round(start[1] + (end[1] - start[1]) * ratio);
    const b = Math.round(start[2] + (end[2] - start[2]) * ratio);

    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      buffer[idx] = r;
      buffer[idx + 1] = g;
      buffer[idx + 2] = b;
      buffer[idx + 3] = 255;
    }
  }

  return sharp(buffer, {
    raw: { width, height, channels: 4 },
  }).png().toBuffer();
}

export async function createShadow(
  width: number,
  height: number,
  opacity: number = 0.15
): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: opacity },
    },
  }).blur(Math.max(10, width * 0.08)).png().toBuffer();
}

// ============================
// 产品预处理
// ============================

export async function preprocessProduct(
  source: Buffer,
  lightMode: string,
  colorTone: string,
  maxWidth: number
): Promise<Buffer> {
  const params = getModulateParams(lightMode, colorTone);

  return sharp(source)
    .resize(maxWidth, null, { withoutEnlargement: true, fit: "inside" })
    .modulate({
      brightness: params.brightness,
      saturation: params.saturation,
    })
    .gamma(params.gamma)
    .normalise()
    .png()
    .toBuffer();
}

// ============================
// 文件保存
// ============================

export function saveGeneratedImage(buffer: Buffer, filename: string): string {
  const outputDir = path.resolve("public/generated");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const filePath = path.join(outputDir, filename);
  fs.writeFileSync(filePath, buffer);
  return `/generated/${filename}`;
}
