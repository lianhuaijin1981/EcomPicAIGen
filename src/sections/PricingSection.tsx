import GradientButton from '@/components/GradientButton';
import { Check, Zap, Star, Crown } from 'lucide-react';

const PLANS = [
  {
    icon: Zap,
    name: '免费试用',
    price: '0',
    unit: '月',
    credits: 50,
    subtitle: '先体验，再决定',
    color: 'border-[#DDDDDD]',
    badge: null,
    features: [
      '50 积分（可生成约 10 张主图）',
      '3 种基础算法',
      '单算法模式',
      '720p 图片输出',
      'JPG 格式下载',
    ],
    cta: '立即试用',
    highlight: false,
  },
  {
    icon: Star,
    name: '专业版',
    price: '99',
    unit: '月',
    credits: 2000,
    subtitle: '适合小微电商团队',
    color: 'border-[#FF003C]',
    badge: '热门',
    features: [
      '2000 积分/月',
      '7 种全部算法',
      '3 种调度模式',
      '2K 高清输出',
      '批量 ZIP 导出',
      '任务历史记录',
      'Email 支持',
    ],
    cta: '开通专业版',
    highlight: true,
  },
  {
    icon: Crown,
    name: '企业版',
    price: '499',
    unit: '月',
    credits: 12000,
    subtitle: '适合规模化运营',
    color: 'border-[#DDDDDD]',
    badge: null,
    features: [
      '12000 积分/月',
      '7 种全部算法',
      '3 种调度模式',
      '4K 超分输出',
      '批量 ZIP 导出',
      'API 接口调用',
      '电商平台对接',
      '专属客户成功经理',
    ],
    cta: '联系销售',
    highlight: false,
  },
];

export default function PricingSection() {
  return (
    <section className="bg-[#F3F4F2] py-32" id="pricing">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-sm text-[#FF003C] uppercase tracking-widest mb-4">定价方案</p>
          <h2 className="text-3xl md:text-5xl font-bold text-[#131415] mb-4">
            按需付费，灵活升级
          </h2>
          <p className="text-base text-[#666C74] max-w-2xl mx-auto">
            积分制计费，按实际生成量消耗。积分永不过期，随时可用。
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.name}
                className={`relative bg-white rounded-xl border-2 p-6 flex flex-col ${
                  plan.highlight ? 'shadow-lg' : ''
                } ${plan.color}`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 bg-[#FF003C] text-white text-xs font-bold rounded-full">
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Plan Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    plan.highlight ? 'bg-[#FFF0F3]' : 'bg-[#E7E9E6]'
                  }`}>
                    <Icon size={20} className={plan.highlight ? 'text-[#FF003C]' : 'text-[#666C74]'} />
                  </div>
                  <div>
                    <div className="font-bold text-[#131415]">{plan.name}</div>
                    <div className="text-xs text-[#666C74]">{plan.subtitle}</div>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-4">
                  <span className="text-4xl font-bold text-[#131415]">¥{plan.price}</span>
                  <span className="text-sm text-[#666C74]">/{plan.unit}</span>
                </div>

                {/* Credits */}
                <div className="mb-6 p-3 bg-[#E7E9E6] rounded-lg text-center">
                  <div className="text-sm text-[#666C74]">每月可获</div>
                  <div className="text-2xl font-bold text-[#131415]">{plan.credits.toLocaleString()}</div>
                  <div className="text-xs text-[#666C74]">积分</div>
                </div>

                {/* Features */}
                <ul className="space-y-3 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-[#666C74]">
                      <Check size={14} className="text-[#22c55e] mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <GradientButton
                  variant={plan.highlight ? 'default' : 'outline'}
                  className="w-full justify-center"
                >
                  {plan.cta}
                </GradientButton>
              </div>
            );
          })}
        </div>

        {/* FAQ Hint */}
        <div className="text-center">
          <p className="text-sm text-[#666C74]">
            需要定制方案？{' '}
            <a href="mailto:contact@ecompicaigen.com" className="text-[#FF003C] hover:underline">
              联系销售
            </a>
            {' '}获取专属报价
          </p>
        </div>
      </div>
    </section>
  );
}
