/**
 * 错误处理中间件
 * 统一捕获后端所有异常，返回标准化的错误响应
 */

import type { Context, Next } from "hono";
import { ZodError } from "zod";

/**
 * 标准错误响应结构
 */
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  stack?: string;
}

/**
 * 错误码枚举
 */
export const ErrorCodes = {
  // 通用
  INTERNAL_ERROR: "INTERNAL_ERROR",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  RATE_LIMITED: "RATE_LIMITED",

  // 业务
  TASK_NOT_FOUND: "TASK_NOT_FOUND",
  RESULT_NOT_FOUND: "RESULT_NOT_FOUND",
  ALGORITHM_NOT_FOUND: "ALGORITHM_NOT_FOUND",
  SOURCE_IMAGE_MISSING: "SOURCE_IMAGE_MISSING",
  AI_GENERATION_FAILED: "AI_GENERATION_FAILED",
  POSTPROCESSING_FAILED: "POSTPROCESSING_FAILED",
  DATABASE_ERROR: "DATABASE_ERROR",
  INVALID_FILE_TYPE: "INVALID_FILE_TYPE",
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  QUOTA_EXCEEDED: "QUOTA_EXCEEDED",
} as const;

/**
 * 创建标准错误对象
 */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number = 500,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * 错误处理中间件
 */
export async function errorMiddleware(c: Context, next: Next) {
  try {
    await next();
  } catch (err: unknown) {
    const env = process.env.NODE_ENV ?? "development";

    // Zod 验证错误
    if (err instanceof ZodError) {
      return c.json({
        code: ErrorCodes.VALIDATION_ERROR,
        message: "请求参数校验失败",
        details: err.errors,
      }, 400);
    }

    // 自定义应用错误
    if (err instanceof AppError) {
      return c.json({
        code: err.code,
        message: err.message,
        details: err.details,
      }, err.status);
    }

    // 标准 Error
    if (err instanceof Error) {
      console.error("[Error]", {
        name: err.name,
        message: err.message,
        stack: err.stack,
      });

      return c.json({
        code: ErrorCodes.INTERNAL_ERROR,
        message: env === "development" ? err.message : "服务器内部错误，请稍后重试",
        ...(env === "development" ? { stack: err.stack } : {}),
      }, 500);
    }

    // 未知错误
    console.error("[Unknown Error]", err);
    return c.json({
      code: ErrorCodes.INTERNAL_ERROR,
      message: "未知错误，请稍后重试",
    }, 500);
  }
}
