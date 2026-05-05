import LiquidGradientText from './LiquidGradientText';

const footerLinks = {
  产品: ['主图生成', '批量处理', 'API 接口', '定价方案', '更新日志'],
  资源: ['使用文档', '视频教程', '常见问题', '社区论坛'],
  关于: ['公司介绍', '联系我们', '加入我们', '品牌合作'],
  法律: ['服务条款', '隐私政策', '版权声明'],
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
                  <li key={link}>
                    <a
                      href="#"
                      className="text-xs text-[#666C74] hover:text-white transition-colors duration-200"
                    >
                      {link}
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
          <p className="text-xs text-[#666C74]">
            &copy; 2024 EcomPicAIGen. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {['微信', '微博', 'GitHub'].map((social) => (
              <a
                key={social}
                href="#"
                className="text-xs text-[#666C74] hover:text-white transition-colors duration-200"
              >
                {social}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
