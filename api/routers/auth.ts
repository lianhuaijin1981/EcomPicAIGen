/**
 * 用户认证 Schema + Router
 *
 * 功能：
 * - 用户注册 / 登录（邮箱 + 密码）
 * - JWT Token 签发与验证
 * - 积分余额查询
 * - 密码重置（TODO）
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createRouter, publicProcedure, protectedProcedure } from "../middleware";
import { users, userSessions } from "@db/schema";
import { getDb } from "../queries/connection";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { cookies } from "hono/cookie";

// =================== 密码工具 ===================

/**
 * 生成密码哈希（PBKDF2）
 */
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const useSalt = salt ?? randomBytes(16).toString("hex");
  const hash = createHmac("sha256", useSalt).update(password).digest("hex");
  return { hash, salt: useSalt };
}

/**
 * 验证密码
 */
export function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  const { hash } = hashPassword(password, salt);
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * 生成 JWT（简化版，生产环境用 jose 或 iron-session）
 */
export function createToken(userId: number, secret: string, expiresIn: number = 7 * 24 * 60 * 60 * 1000): string {
  const payload = {
    sub: String(userId),
    iat: Date.now(),
    exp: Date.now() + expiresIn,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

/**
 * 验证 JWT
 */
export function verifyToken(token: string, secret: string): { userId: number } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expectedSig = createHmac("sha256", secret).update(encoded).digest("base64url");
  if (sig !== expectedSig) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString());
    if (payload.exp < Date.now()) return null;
    return { userId: Number(payload.sub) };
  } catch {
    return null;
  }
}

// =================== Schema 验证 ===================

const registerSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(8, "密码至少 8 位").max(64, "密码最多 64 位"),
  nickname: z.string().min(2, "昵称至少 2 字").max(32, "昵称最多 32 字").optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// =================== Router ===================

export const authRouter = createRouter({
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ input }) => {
      const db = getDb();
      const { email, password, nickname } = input;

      // 检查邮箱是否已注册
      const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existing.length > 0) {
        throw new Error("该邮箱已注册");
      }

      // 哈希密码
      const { hash, salt } = hashPassword(password);

      // 创建用户
      const [user] = await db.insert(users).values({
        email,
        passwordHash: hash,
        passwordSalt: salt,
        nickname: nickname ?? email.split("@")[0],
        credits: 50, // 新用户赠送 50 积分
      }).returning();

      return {
        userId: user.id,
        email: user.email,
        nickname: user.nickname,
        credits: user.credits,
      };
    }),

  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ input, c }) => {
      const db = getDb();
      const secret = process.env.JWT_SECRET ?? "dev-secret-change-in-prod";

      const [user] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
      if (!user) throw new Error("邮箱或密码错误");

      const valid = verifyPassword(input.password, user.passwordHash, user.passwordSalt);
      if (!valid) throw new Error("邮箱或密码错误");

      const token = createToken(user.id, secret);

      // 存储 session
      await db.insert(userSessions).values({
        userId: user.id,
        tokenHash: createHmac("sha256", secret).update(token).digest("hex"),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      // 写 cookie
      cookies(c).set("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      });

      return {
        userId: user.id,
        email: user.email,
        nickname: user.nickname,
        credits: user.credits,
      };
    }),

  logout: protectedProcedure.mutation(async ({ c }) => {
    const token = cookies(c).get("auth_token");
    if (token) {
      const db = getDb();
      await db.delete(userSessions).where(eq(userSessions.tokenHash, createHmac("sha256", process.env.JWT_SECRET ?? "dev-secret").update(token).digest("hex")));
    }
    cookies(c).delete("auth_token");
    return { ok: true };
  }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, ctx.userId)).limit(1);
    if (!user) throw new Error("用户不存在");
    return {
      userId: user.id,
      email: user.email,
      nickname: user.nickname,
      credits: user.credits,
      createdAt: user.createdAt,
    };
  }),
});
