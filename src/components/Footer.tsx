import LiquidGradientText from './LiquidGradientText';
import { Link } from 'react-router';

const footerLinks = {
  产品: [
    { label: '主图生成', href: '/#generator' },
    { label: '批量处理', href: '/#generator' },
    { label: 'API 接口', href: '/#pricing' },
    { label: '定价方案', href: '/#pricing' },
  ],
  资源: [
    { label: '使用文档', href: 'https://github.com/lianhuaijin1981/EcomPicAIGen' },
    { label: '视频教程', href: '#' },
    { label: '常见问题', href: '#' },
    { label: '更新日志', href: 'https://github.com/lianhuaijin1981/EcomPicAIGen/releases' },
  ],
  关于: [
    { label: '关于我们', href: '#' },
    { label: '联系我们', href: 'mailto:contact@ecompicaigen.com' },
    { label: '加入我们', href: '#' },
    { label: '品牌合作', href: 'mailto:contact@ecompicaigen.com' },
  ],
  法律: [
    { label: '服务条款', href: '#' },
    { label: '隐私政策', href: '#' },
    { label: '版权声明', href: '#' },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-[#131415] text-white">
      {/* Giant CTA Title */}
      <div className="pt-32 pb-20 px-6 text-center">
        <div className="inline-block">
          <LiquidGradientText
            text="START GENERATING"
            enableFlicker={false}
          />
        </div>
        <p className="mt-4 text-sm text-[#666C74]">
          首次注册赠送 50 积分，无需信用卡
        </p>
        <div className="mt-6">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 px-8 py-3 bg-[#FF003C] text-white text-sm font-semibold rounded hover:bg-[#e60036] transition-colors"
          >
            立即开始免费试用
          </Link>
        </div>
      </div>

      {/* Links Grid */}
      <div className="max-w-7xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-white mb-4 tracking-wide">
                {category}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-xs text-[#666C74] hover:text-white transition-colors duration-200"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-[#333] py-6 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-xs text-[#666C74]">
              &copy; {new Date().getFullYear()} EcomPicAIGen. All rights reserved.
            </p>
            <p className="text-xs text-[#444] mt-0.5">
              基于 AI 技术构建 · Apache License 2.0
            </p>
          </div>
          <div className="flex items-center gap-4">
            {[
              { label: 'GitHub', href: 'https://github.com/lianhuaijin1981/EcomPicAIGen' },
              { label: '联系邮箱', href: 'mailto:contact@ecompicaigen.com' },
            ].map((social) => (
              <a
                key={social.label}
                href={social.href}
                target={social.href.startsWith('http') ? '_blank' : undefined}
                rel="noopener noreferrer"
                className="text-xs text-[#666C74] hover:text-white transition-colors duration-200"
              >
                {social.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
