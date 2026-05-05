declare module "sharp" {
  type Color = { r: number; g: number; b: number; alpha?: number };

  interface SharpOptions {
    create?: {
      width: number;
      height: number;
      channels: number;
      background: Color | string | { r: number; g: number; b: number };
    };
    raw?: {
      width: number;
      height: number;
      channels: number;
    };
  }

  interface ResizeOptions {
    withoutEnlargement?: boolean;
    fit?: string;
    position?: string;
  }

  interface ModulateOptions {
    brightness?: number;
    saturation?: number;
  }

  interface SharpenOptions {
    sigma?: number;
    m1?: number;
    m2?: number;
  }

  interface Metadata {
    width?: number;
    height?: number;
    channels?: number;
    [key: string]: any;
  }

  interface OutputOptions {
    quality?: number;
    progressive?: boolean;
  }

  interface CompositeInput {
    input: Buffer;
    left?: number;
    top?: number;
    gravity?: string;
    blend?: string;
  }

  interface Sharp {
    metadata(): Promise<Metadata>;
    resize(width: number, height?: number | null, options?: ResizeOptions): Sharp;
    modulate(options: ModulateOptions): Sharp;
    gamma(gamma: number): Sharp;
    normalise(): Sharp;
    sharpen(options?: SharpenOptions): Sharp;
    blur(sigma?: number): Sharp;
    extract(options: { left: number; top: number; width: number; height: number }): Sharp;
    composite(inputs: CompositeInput[]): Sharp;
    png(options?: OutputOptions): Sharp;
    jpeg(options?: OutputOptions): Sharp;
    toBuffer(): Promise<Buffer>;
  }

  interface SharpConstructor {
    (input?: Buffer | string | SharpOptions, options?: SharpOptions): Sharp;
    new (input?: Buffer | string | SharpOptions, options?: SharpOptions): Sharp;
  }

  const sharp: SharpConstructor;
  export = sharp;
}
