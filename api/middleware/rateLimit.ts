/**
 * 速率限制中间件
 * 基于内存存储，适用于单机部署
 * 生产环境建议使用 Redis + @upstash/ratelimit
 */

import type { MiddlewareHandler } from "hono";

// =================== 配置 ===================
const WINDOW_MS = 60 * 1000; // 1 分钟窗口
const MAX_REQUESTS = 60;     // 每分钟最多 60 次请求

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// 内存存储（简单实现，生产环境请用 Redis）
const store = new Map<string, RateLimitEntry>();

// =================== 中间件 ===================
export function rateLimit(options?: {
  windowMs?: number;
  maxRequests?: number;
  keyGenerator?: (c: { get: (k: string) => string | undefined }) => string;
}): MiddlewareHandler {
  const windowMs = options?.windowMs ?? WINDOW_MS;
  const maxRequests = options?.maxRequests ?? MAX_REQUESTS;

  return async (c, next) => {
    // 默认用 IP 作为 key（可通过 X-Forwarded-For 扩展）
    const ip = c.req.header("x-forwarded-for")
      ?? c.req.header("cf-connecting-ip")
      ?? c.env?.incoming?.socket?.remoteAddress
      ?? "unknown";

    const key = `ratelimit:${ip}`;
    const now = Date.now();

    // 读取记录
    let entry = store.get(key);

    // 重置窗口
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
    }

    entry.count++;
    store.set(key, entry);

    // 设置响应头
    c.header("X-RateLimit-Limit", String(maxRequests));
    c.header("X-RateLimit-Remaining", String(Math.max(0, maxRequests - entry.count)));
    c.header("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));
    c.header("RateLimit-Policy", `${maxRequests};w=${Math.ceil(windowMs / 1000)}`);

    // 超限拒绝
    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      c.header("Retry-After", String(retryAfter));
      return c.json({
        code: "RATE_LIMITED",
        message: `请求过于频繁，请 ${retryAfter} 秒后重试`,
        retryAfter,
      }, 429);
    }

    await next();
  };
}

/**
 * 清理过期记录（定时调用，防止内存泄漏）
 */
export function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

// 每 5 分钟清理一次
setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
