/**
 * 错误处理中间件测试
 */
import { describe, it, expect, vi } from "vitest";
import { AppError, ErrorCodes, errorMiddleware } from "../middleware/errorHandler";

// 模拟 Hono Context
function createMockContext(override: any = {}): any {
  const jsonMock = vi.fn();
  return {
    json: jsonMock,
    ...override,
  };
}

describe("AppError", () => {
  it("应正确构造错误对象", () => {
    const err = new AppError(ErrorCodes.TASK_NOT_FOUND, "任务不存在", 404);
    expect(err.code).toBe("TASK_NOT_FOUND");
    expect(err.message).toBe("任务不存在");
    expect(err.status).toBe(404);
  });

  it("默认状态码应为 500", () => {
    const err = new AppError(ErrorCodes.INTERNAL_ERROR, "Something broke");
    expect(err.status).toBe(500);
  });

  it("应支持 details 字段", () => {
    const err = new AppError(ErrorCodes.VALIDATION_ERROR, "参数错误", 400, { field: "email" });
    expect(err.details).toEqual({ field: "email" });
  });
});

describe("errorMiddleware", () => {
  it("正常流程应放行（next 不抛错）", async () => {
    const next = vi.fn().mockResolvedValue(undefined);
    const c = createMockContext();
    await errorMiddleware(c, next);
    expect(next).toHaveBeenCalled();
    expect(c.json).not.toHaveBeenCalled();
  });
});
