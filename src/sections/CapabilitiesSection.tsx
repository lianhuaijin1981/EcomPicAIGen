import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const capabilities = [
  {
    title: '一键多平台适配',
    desc: '支持淘宝、京东、亚马逊、1688、抖音电商等主流平台。自动匹配 1:1、3:4、9:16 等比例，无黑边、无裁切。',
  },
  {
    title: '多 SKU 批量生成',
    desc: '一次上传最多 50 个 SKU，统一设置参数后一键批量生成，所有 SKU 风格统一、色调一致。',
  },
  {
    title: '内置 50 种品类算法',
    desc: '覆盖 3C 数码、服饰鞋包、家居日用、美妆个护、家电五大品类，AI 自动识别产品类型并匹配最佳生成策略。',
  },
  {
    title: 'AI 智能质量校验',
    desc: '生成后自动按照电商 AI 主图质量评价体系进行打分，实时显示各维度得分与优化建议。',
  },
  {
    title: '白底图 / 场景图 / 细节图',
    desc: '三种核心类型一键切换，支持冷色、暖色、高级灰等色调与柔和、写实、立体等光影模式。',
  },
  {
    title: 'AI 自动排版文案',
    desc: '输入核心卖点与促销信息，AI 自动排版，确保文案不遮挡产品主体，提供电商专用字体库。',
  },
];

export default function CapabilitiesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const itemsRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      itemsRef.current.forEach((item, i) => {
        if (!item) return;
        gsap.fromTo(
          item,
          { y: 40, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: item,
              start: 'top 85%',
              toggleActions: 'play none none none',
            },
            delay: i * 0.08,
          }
        );
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="bg-[#F3F4F2] py-32 md:py-40">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-16">
          {/* Left Sticky */}
          <div className="md:col-span-5">
            <div className="md:sticky md:top-32">
              <h2 className="text-3xl md:text-4xl font-bold text-[#131415] leading-tight mb-4">
                覆盖主流电商平台
              </h2>
              <p className="text-base text-[#666C74] leading-relaxed">
                支持 1:1, 3:4, 9:16 等多种比例，无黑边、无裁切。
              </p>
            </div>
          </div>

          {/* Right Scrolling List */}
          <div className="md:col-span-7 space-y-8">
            {capabilities.map((cap, index) => (
              <div
                key={cap.title}
                ref={(el) => { if (el) itemsRef.current[index] = el; }}
                className="flex gap-4 pb-8 border-b border-[#DDDDDD] opacity-0"
              >
                {/* Acid Dot */}
                <div className="mt-2 w-2 h-2 rounded-full bg-gradient-to-r from-[#FF003C] to-[#FFC312] flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-bold text-[#131415] mb-2">
                    {cap.title}
                  </h3>
                  <p className="text-sm text-[#666C74] leading-relaxed">
                    {cap.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
