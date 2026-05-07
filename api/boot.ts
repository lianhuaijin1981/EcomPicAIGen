import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { errorMiddleware } from "./middleware/errorHandler";
import { rateLimit } from "./middleware/rateLimit";
import { verifyToken } from "./routers/auth";

const app = new Hono<{ Bindings: HttpBindings }>();

// 全局中间件
if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");

  // 错误处理
  app.use(errorMiddleware);

  // 速率限制
  app.use(rateLimit({ windowMs: 60 * 1000, maxRequests: 60 }));

  // CORS
  app.use(cors({
    origin: process.env.ALLOWED_ORIGIN ?? "*",
    credentials: true,
  }));

  // 静态文件
  serveStaticFiles(app);

  // 生产服务
  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`🚀 Server running on http://localhost:${port}/`);
  });
} else {
  // 开发：JSON 日志 + 错误处理
  app.use(logger());
  app.use(errorMiddleware);
}

// 解析 JWT 并注入 userId 到请求头，供 tRPC createContext 使用
app.use("/api/trpc/*", async (c, next) => {
  const token = c.req.header("cookie")?.split(";")
    .find(c => c.trim().startsWith("auth_token="))
    ?.split("=")[1];

  if (token) {
    const payload = verifyToken(token, process.env.JWT_SECRET ?? "dev-secret-change-in-prod");
    if (payload) {
      c.set("userId", payload.userId);
    }
  }

  await next();
});

// tRPC 路由
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext: (opts) => createContext({ ...opts, userId: c.get("userId") }),
  });
});

// 兜底 404
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));
