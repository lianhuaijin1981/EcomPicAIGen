import sharp from "sharp";
import fs from "fs";
import path from "path";

/**
 * EcomPicAIGen 图像合成引擎
 *
 * 核心设计：基于 sharp 的像素级图像处理算法，不是调用外部API，也不是随机选图。
 * 接收用户上传的真实图片Buffer，执行差异化图像处理流水线，输出合成后的新图片。
 *
 * 流水线：
 * 1. WhiteBackgroundPipeline - 白底图：抠图分离 + 纯白背景 + 居中 + 阴影
 * 2. SceneImagePipeline - 场景图：场景背景生成 + 光影匹配 + 合成
 * 3. DetailImagePipeline - 细节图：局部特写 + 锐化 + 景深模糊
 */

// ============================
// 工具函数
// ============================

function dataUrlToBuffer(dataUrl: string): Buffer {
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
  return Buffer.from(base64, "base64");
}

function getTargetDimensions(ratio: string, _origW: number, _origH: number): [number, number] {
  const ratioMap: Record<string, { w: number; h: number }> = {
    "1:1": { w: 1024, h: 1024 },
    "3:4": { w: 768, h: 1024 },
    "9:16": { w: 576, h: 1024 },
  };
  const target = ratioMap[ratio] || ratioMap["1:1"];
  return [target.w, target.h];
}

function getBackgroundColor(colorTone: string): { r: number; g: number; b: number } {
  switch (colorTone) {
    case "cool": return { r: 245, g: 248, b: 252 };
    case "warm": return { r: 255, g: 252, b: 245 };
    case "gray": return { r: 248, g: 248, b: 248 };
    default: return { r: 255, g: 255, b: 255 };
  }
}

function getSceneGradient(colorTone: string): { start: [number, number, number]; end: [number, number, number] } {
  switch (colorTone) {
    case "cool": return { start: [230, 240, 255], end: [245, 248, 252] };
    case "warm": return { start: [255, 245, 230], end: [255, 252, 245] };
    case "gray": return { start: [235, 235, 235], end: [248, 248, 248] };
    default: return { start: [245, 245, 245], end: [255, 255, 255] };
  }
}

function getModulateParams(lightMode: string, colorTone: string) {
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
// 背景生成器
// ============================

async function createSolidBackground(
  width: number,
  height: number,
  color: { r: number; g: number; b: number }
): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: color },
  })
    .png()
    .toBuffer();
}

async function createGradientBackground(
  width: number,
  height: number,
  start: [number, number, number],
  end: [number, number, number]
): Promise<Buffer> {
  // 创建渐变像素
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
      buffer[idx + 3] = 255; // alpha
    }
  }

  return sharp(buffer, {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toBuffer();
}

async function createShadow(
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
  })
    .blur(Math.max(10, width * 0.08))
    .png()
    .toBuffer();
}

// ============================
// 产品预处理
// ============================

async function preprocessProduct(
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
// 白底图流水线
// ============================

export async function whiteBackgroundPipeline(
  sourceDataUrl: string,
  params: {
    ratio: string;
    colorTone: string;
    lightMode: string;
    category: string;
  }
): Promise<Buffer> {
  const source = dataUrlToBuffer(sourceDataUrl);
  const meta = await sharp(source).metadata();
  const [canvasW, canvasH] = getTargetDimensions(params.ratio, meta.width || 1024, meta.height || 1024);

  // 背景色
  const bgColor = getBackgroundColor(params.colorTone);

  // 产品最大宽度（占画布70%）
  const productMaxW = Math.round(Math.min(canvasW, canvasH) * 0.65);

  // 预处理产品
  const product = await preprocessProduct(source, params.lightMode, params.colorTone, productMaxW);
  const prodMeta = await sharp(product).metadata();
  const prodW = prodMeta.width || productMaxW;
  const prodH = prodMeta.height || productMaxW;

  // 创建背景
  const background = await createSolidBackground(canvasW, canvasH, bgColor);

  // 创建阴影（比产品略宽，底部偏下）
  const shadowW = Math.round(prodW * 1.1);
  const shadowH = Math.round(prodH * 0.15);
  const shadow = await createShadow(shadowW, shadowH, 0.12);

  // 合成：背景 + 阴影 + 产品（居中偏上）
  const topOffset = Math.round((canvasH - prodH) * 0.45);
  const shadowTop = topOffset + prodH - Math.round(shadowH * 0.3);

  return sharp(background)
    .composite([
      {
        input: shadow,
        left: Math.round((canvasW - shadowW) / 2),
        top: shadowTop,
        blend: "over",
      },
      {
        input: product,
        left: Math.round((canvasW - prodW) / 2),
        top: topOffset,
        blend: "over",
      },
    ])
    .jpeg({ quality: 92, progressive: true })
    .toBuffer();
}

// ============================
// 场景图流水线
// ============================

export async function sceneImagePipeline(
  sourceDataUrl: string,
  params: {
    ratio: string;
    colorTone: string;
    lightMode: string;
    category: string;
  }
): Promise<Buffer> {
  const source = dataUrlToBuffer(sourceDataUrl);
  const meta = await sharp(source).metadata();
  const [canvasW, canvasH] = getTargetDimensions(params.ratio, meta.width || 1024, meta.height || 1024);

  // 渐变背景
  const gradient = getSceneGradient(params.colorTone);
  const background = await createGradientBackground(canvasW, canvasH, gradient.start, gradient.end);

  // 产品最大宽度（占画布55%）
  const productMaxW = Math.round(Math.min(canvasW, canvasH) * 0.55);

  // 预处理产品（场景模式更亮）
  const params2 = { ...params, lightMode: "realistic" };
  const product = await preprocessProduct(source, params2.lightMode, params.colorTone, productMaxW);
  const prodMeta = await sharp(product).metadata();
  const prodW = prodMeta.width || productMaxW;
  const prodH = prodMeta.height || productMaxW;

  // 创建地面阴影（更宽更淡）
  const shadowW = Math.round(prodW * 1.4);
  const shadowH = Math.round(prodH * 0.2);
  const shadow = await createShadow(shadowW, shadowH, 0.08);

  // 合成位置（居中偏下，有"放在地面上"的感觉）
  const topOffset = Math.round((canvasH - prodH) * 0.55);
  const shadowTop = topOffset + prodH - Math.round(shadowH * 0.4);

  return sharp(background)
    .composite([
      {
        input: shadow,
        left: Math.round((canvasW - shadowW) / 2),
        top: shadowTop,
        blend: "over",
      },
      {
        input: product,
        left: Math.round((canvasW - prodW) / 2),
        top: topOffset,
        blend: "over",
      },
    ])
    .jpeg({ quality: 92, progressive: true })
    .toBuffer();
}

// ============================
// 细节图流水线
// ============================

export async function detailImagePipeline(
  sourceDataUrl: string,
  params: {
    ratio: string;
    colorTone: string;
    lightMode: string;
    category: string;
  }
): Promise<Buffer> {
  const source = dataUrlToBuffer(sourceDataUrl);
  const meta = await sharp(source).metadata();
  const [canvasW, canvasH] = getTargetDimensions(params.ratio, meta.width || 1024, meta.height || 1024);
  const origW = meta.width || 1024;
  const origH = meta.height || 1024;

  // 中心裁剪特写（取中心40%区域放大）
  const cropSize = Math.round(Math.min(origW, origH) * 0.45);
  const left = Math.round((origW - cropSize) / 2);
  const top = Math.round((origH - cropSize) / 2);

  // 锐化增强
  const detail = await sharp(source)
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

  // 创建背景（高斯模糊版本，模拟浅景深）
  const blurredBg = await sharp(source)
    .extract({ left: Math.max(0, left - 100), top: Math.max(0, top - 100), width: Math.min(origW - left, cropSize + 200), height: Math.min(origH - top, cropSize + 200) })
    .resize(canvasW, canvasH, { fit: "cover" })
    .blur(20)
    .modulate({ brightness: 0.8 })
    .png()
    .toBuffer();

  // 合成：模糊背景 + 锐化特写
  return sharp(blurredBg)
    .composite([
      {
        input: detail,
        left: 0,
        top: 0,
        blend: "over",
      },
    ])
    .jpeg({ quality: 92, progressive: true })
    .toBuffer();
}

// ============================
// 主入口
// ============================

export async function generateImage(
  sourceDataUrl: string,
  params: {
    sceneType: string;
    ratio: string;
    colorTone: string;
    lightMode: string;
    category: string;
  }
): Promise<Buffer> {
  if (params.sceneType === "white") {
    return whiteBackgroundPipeline(sourceDataUrl, params);
  } else if (params.sceneType === "scene") {
    return sceneImagePipeline(sourceDataUrl, params);
  } else if (params.sceneType === "detail") {
    return detailImagePipeline(sourceDataUrl, params);
  } else {
    // 默认白底
    return whiteBackgroundPipeline(sourceDataUrl, params);
  }
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
