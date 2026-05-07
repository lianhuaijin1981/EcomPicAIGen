/**
 * 站点配置
 * 统一管理前端环境变量
 */

export const SITE_CONFIG = {
  appName: 'EcomPicAIGen',
  appTitle: 'AI 电商主图批量生成工具',
  apiUrl: import.meta.env.VITE_API_URL ?? '/api/trpc',
  defaultCredits: 50,
  minPassScore: 85,
} as const;

export const PLATFORM_URLS = {
  taobao: 'https://sell.taobao.com',
  jd: 'https://shop.jd.com',
  amazon: 'https://sellercentral.amazon.com',
  douyin: 'https://fxg.jinritemai.com',
} as const;
