import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { verifyToken } from "./routers/auth";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const createRouter = t.router;
export const publicQuery = t.procedure;

/**
 * 公开查询（无需认证）
 */
export const publicProcedure = t.procedure;

/**
 * 需要认证的查询/变更
 * 从 cookie 中读取 JWT token 并验证
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  // 在 tRPC context 中，用户 ID 通过 headers 传入（由 boot.ts 中间件注入）
  const userId = (ctx as any).userId;
  if (!userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "请先登录",
    });
  }
  return next({ ctx: { ...ctx, userId } });
});
