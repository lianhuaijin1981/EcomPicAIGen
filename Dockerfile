# Multi-stage Dockerfile for EcomPicAIGen
# Stage 1: Dependencies
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN bun install --frozen-lockfile

# Stage 2: Build
FROM oven/bun:1 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# Stage 3: Production runner
FROM node:20-slim AS runner
WORKDIR /app

# 安装 sharp 所需依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    libc6 libglib2.0-0 libsharp2 libvips \
    && rm -rf /var/lib/apt/lists/*

# 复制构建产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# 安装生产依赖（排除 devDependencies）
RUN npm ci --omit=dev --ignore-scripts \
    && npm rebuild sharp \
    && rm -rf /tmp/*

# 环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 非 root 用户运行
RUN useradd --create-home --shell /bin/bash appuser
USER appuser

EXPOSE 3000

CMD ["node", "boot.js"]
