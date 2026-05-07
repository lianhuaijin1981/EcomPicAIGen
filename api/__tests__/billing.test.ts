/**
 * 密码与 JWT 工具测试
 */
import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  createToken,
  verifyToken,
  calculateCredits,
} from "../routers/billing";

describe("hashPassword", () => {
  it("应生成哈希和盐值", () => {
    const { hash, salt } = hashPassword("MyPass123");
    expect(hash.length).toBe(64); // SHA256 hex
    expect(salt.length).toBe(32); // 16 bytes hex
  });

  it("相同密码不同盐值应生成不同哈希", () => {
    const a = hashPassword("MyPass123");
    const b = hashPassword("MyPass123");
    expect(a.hash).not.toBe(b.hash);
  });

  it("相同密码相同盐值应生成相同哈希", () => {
    const { hash, salt } = hashPassword("MyPass123");
    const { hash: hash2 } = hashPassword("MyPass123", salt);
    expect(hash).toBe(hash2);
  });
});

describe("verifyPassword", () => {
  it("密码正确应验证通过", () => {
    const { hash, salt } = hashPassword("MyPass123");
    expect(verifyPassword("MyPass123", hash, salt)).toBe(true);
  });

  it("密码错误应验证失败", () => {
    const { hash, salt } = hashPassword("MyPass123");
    expect(verifyPassword("WrongPass", hash, salt)).toBe(false);
  });
});

describe("JWT Token", () => {
  const secret = "test-secret";

  it("应正确签发 token", () => {
    const token = createToken(42, secret);
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(2);
  });

  it("应正确验证 token 并返回 userId", () => {
    const token = createToken(42, secret);
    const payload = verifyToken(token, secret);
    expect(payload).not.toBeNull();
    expect(payload?.userId).toBe(42);
  });

  it("错误密钥应验证失败", () => {
    const token = createToken(42, secret);
    expect(verifyToken(token, "wrong-secret")).toBeNull();
  });

  it("损坏的 token 应返回 null", () => {
    expect(verifyToken("invalid.token.here", secret)).toBeNull();
    expect(verifyToken("", secret)).toBeNull();
  });
});

describe("calculateCredits", () => {
  it("单算法模式：5 积分/张", () => {
    expect(calculateCredits("single")).toBe(5);
  });

  it("并行择优模式：12 积分/张", () => {
    expect(calculateCredits("parallel")).toBe(12);
  });

  it("自适应模式：8 积分/张", () => {
    expect(calculateCredits("adaptive")).toBe(8);
  });

  it("超分算法：2倍加成", () => {
    expect(calculateCredits("single", "upscaler")).toBe(10); // 5 * 2.0
  });

  it("合规净化算法：0.5倍加成", () => {
    expect(calculateCredits("single", "compliance")).toBe(3); // 5 * 0.5
  });

  it("未知模式默认单算法", () => {
    expect(calculateCredits("unknown" as any)).toBe(5);
  });
});
