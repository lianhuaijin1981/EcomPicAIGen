import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

/**
 * tRPC Context 类型
 */
export interface TrpcContext {
  userId?: number;
}

/**
 * 创建 tRPC 上下文
 * userId 由 boot.ts JWT 中间件注入到请求中
 */
export function createContext(opts: FetchCreateContextFnOptions & { userId?: number }): TrpcContext {
  return {
    userId: opts.userId,
  };
}
