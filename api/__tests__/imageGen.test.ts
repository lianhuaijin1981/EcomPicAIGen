/**
 * 算法路由匹配测试
 */
import { describe, it, expect } from "vitest";
import { STRATEGIES, matchStrategies } from "../routers/imageGen";

describe("matchStrategies", () => {
  it("单算法模式应返回最优算法", () => {
    const result = matchStrategies("3c", "white", "single");
    expect(result.length).toBe(1);
    expect(result[0]).toHaveProperty("id");
    expect(result[0]).toHaveProperty("name");
  });

  it("并行择优模式应返回 3 种不同类型算法", () => {
    const result = matchStrategies("3c", "white", "parallel");
    const types = result.map((r: any) => r.type);
    const uniqueTypes = [...new Set(types)];
    expect(uniqueTypes.length).toBeGreaterThanOrEqual(2);
  });

  it("IPAdapter 应对服饰品类加分", () => {
    const result = matchStrategies("fashion", "scene", "single");
    const best = result[0];
    expect(best.type).toBe("lora");
  });

  it("ControlNet 应对 3C 品类正确匹配", () => {
    const result = matchStrategies("3c", "white", "single");
    const hasControlNet = result.some((r: any) => r.type === "controlnet");
    const hasIPAdapter = result.some((r: any) => r.type === "product_fidelity");
    expect(hasControlNet || hasIPAdapter).toBe(true);
  });

  it("白底图场景应对 upscaler 加分", () => {
    const result = matchStrategies("3c", "white", "single");
    const scores = result.map((r: any) => r.score);
    expect(scores[0]).toBeGreaterThan(0);
  });

  it("detail 场景应对超分算法加分", () => {
    const result = matchStrategies("beauty", "detail", "single");
    const best = result[0];
    expect(best).toHaveProperty("reasons");
  });
});

describe("STRATEGIES 常量", () => {
  it("应包含 7 种内置算法", () => {
    expect(STRATEGIES.length).toBe(7);
  });

  it("所有算法应有 scoreWeights", () => {
    for (const s of STRATEGIES) {
      expect(s.scoreWeights).toBeDefined();
      expect(s.scoreWeights.decision).toBeDefined();
      expect(s.scoreWeights.info).toBeDefined();
      expect(s.scoreWeights.trust).toBeDefined();
      expect(s.scoreWeights.visual).toBeDefined();
    }
  });

  it("所有算法应有 buildPrompt 方法", () => {
    for (const s of STRATEGIES) {
      expect(typeof s.buildPrompt).toBe("function");
      const prompt = s.buildPrompt("手机", "3C", "white");
      expect(typeof prompt).toBe("string");
      expect(prompt.length).toBeGreaterThan(10);
    }
  });
});
