import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "src"),
      "@db": path.resolve(templateRoot, "db"),
      "@api": path.resolve(templateRoot, "api"),
    },
  },
  test: {
    environment: "node",
    include: ["api/**/*.test.ts", "api/**/*.spec.ts", "src/**/*.test.ts", "src/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["api/**/*.ts", "src/**/*.ts"],
      exclude: ["**/*.d.ts", "**/node_modules/**", "**/dist/**"],
    },
  },
});
