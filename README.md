# EcomPicAIGen - AI 电商主图生成工具

> 50 品类覆盖 | 96.2 分质量达标 | 5 步完整生图工作流 | 多算法路由智能调度

## 产品简介

EcomPicAIGen 是一款专为电商卖家打造的 AI 主图批量生成工具。通过多算法路由引擎，自动匹配最优 AI 生图策略，批量将商品素材转化为平台合规的高质量主图。

**支持平台**：淘宝 · 京东 · 亚马逊 · 抖音电商

**支持品类**：3C 数码 · 服饰鞋包 · 家居日用 · 美妆个护 · 家电

---

## 核心能力

### 🧠 多算法路由调度
内置 7 种差异化算法（Flux 通用 / IPAdapter 保真 / ControlNet 约束 / LoRA 领域模型 / 超分精修 / 合规净化），根据品类 + 场景 + 用途自动匹配最优算法：

- **单算法模式**：自动选最优算法，最快生成
- **并行择优模式**：3 种算法同时生成，自动选最高分
- **自适应模式**：先单算法，低于 85 分自动补充

### 📊 4 维度质量评分
生成后自动评分，92 分以上方可上架：
- 决策引导力（30%）：产品主体突出，卖点直观
- 信息传递效率（25%）：构图专业，层级清晰
- 商品真实信任度（25%）：无色偏畸变，材质真实
- 视觉专业质感（20%）：高清，配色和谐，版式整洁

### ⚡ 5 步完整工作流
```
素材上传 → 参数配置 → AI生成 → 质量校验 → 导出上架
```

---

## 技术架构

### 技术栈
| 层级 | 技术 |
|---|---|
| 前端 | React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui |
| 后端 | Hono + tRPC + MySQL + Drizzle ORM |
| AI | FLUX.1-dev / IPAdapter / ControlNet / LoRA |
| 图像处理 | Sharp |
| 部署 | Docker |

### 项目结构

```
EcomPicAIGen/
├── src/                      # React 前端
│   ├── components/           # UI 组件（含 shadcn/ui）
│   ├── sections/             # 页面区块
│   ├── pages/               # 页面入口
│   ├── hooks/               # 自定义 Hooks
│   └── providers/           # tRPC Provider
├── api/                      # Hono + tRPC 后端
│   ├── routers/             # API 路由（imageGen, algorithm, auth, billing）
│   ├── services/            # 业务逻辑（AI生成、后处理）
│   │   ├── aiGeneration/    # AI 生图引擎 + 适配器
│   │   └── postProcessing/  # 后处理（白底/场景/细节增强）
│   └── lib/                 # 工具函数
├── db/                       # 数据库
│   ├── schema.ts            # Drizzle ORM Schema
│   ├── migrations/          # 数据库迁移
│   └── seed.ts              # 种子数据
└── public/images/products/  # 示例素材
```

### 数据库设计
- `algorithms`：算法库（7 种内置算法）
- `generation_tasks`：生成任务
- `generation_results`：单张生成结果 + 评分
- `users`：用户账号（计划中）
- `billing`：计费记录（计划中）

---

## 快速开始

### 环境要求
- Node.js 20+
- MySQL 8.0+（或 SQLite 开发）
- npm / pnpm

### 安装

```bash
# 克隆项目
git clone https://github.com/lianhuaijin1981/EcomPicAIGen.git
cd EcomPicAIGen

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env，填入数据库连接和 AI API 密钥

# 初始化数据库
npm run db:push

# 启动开发服务器
npm run dev
```

### 环境变量

```env
# 数据库
DATABASE_URL=mysql://user:password@localhost:3306/ecompicaigen
# 或 SQLite 开发
DATABASE_URL=file:./dev.db

# AI API（接入真实 AI 生图时填写）
FLUX_API_KEY=your_flux_api_key
FLUX_API_ENDPOINT=https://api.replicate.com/v1/predictions
ZIMAGE_API_KEY=your_zimage_api_key

# 服务配置
PORT=3000
NODE_ENV=development
```

---

## API 文档

### 图像生成

```
POST /api/imageGen/createTask
  输入：config（品类/场景/色调等）, files（上传图片）, algorithmMode
  输出：taskId

POST /api/imageGen/generate
  输入：taskId
  输出：results（含质量评分）

GET /api/imageGen/getResults
  输入：taskId
  输出：生成结果列表

POST /api/imageGen/regenerateOne
  输入：resultId（单张重试）
  输出：更新后的结果
```

### 算法管理

```
GET /api/algorithm/list
  输出：算法库列表

POST /api/algorithm/seed
  输出：初始化算法库种子数据
```

---

## 生产部署

### Docker

```bash
# 构建
docker build -t ecompicaigen .

# 运行
docker run -d -p 3000:3000 --env-file .env ecompicaigen
```

### 构建产物

```bash
npm run build
npm start
```

---

## 开发指南

### 运行测试

```bash
npm test
```

### 数据库操作

```bash
npm run db:generate   # 生成迁移
npm run db:migrate    # 执行迁移
npm run db:push       # 推送 Schema（开发用）
npm run db:studio     # 可视化数据库
```

---

## 路线图

- [x] 多算法路由引擎
- [x] 4 维度质量评分
- [x] 5 步生图工作流
- [ ] 用户认证（OAuth + 手机号）
- [ ] 计费系统（积分/订阅）
- [ ] 批量 ZIP 导出
- [ ] 电商平台 API 对接（淘宝/京东/Shopify）
- [ ] BullMQ 队列系统
- [ ] 运营数据看板
- [ ] 国际化（i18n）

---

## License

[Apache License 2.0](LICENSE)
