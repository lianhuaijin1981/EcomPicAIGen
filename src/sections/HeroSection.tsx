import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import LiquidGradientText from '@/components/LiquidGradientText';
import GradientButton from '@/components/GradientButton';
import { ArrowRight } from 'lucide-react';

const stats = [
  { value: '10s', label: '生成速度' },
  { value: '50+', label: '覆盖品类' },
  { value: '85+', label: '质量评分' },
];

export default function HeroSection() {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contentRef.current) return;

    const elements = contentRef.current.querySelectorAll('.hero-animate');
    const tl = gsap.timeline({ delay: 0.8 });

    tl.fromTo(
      elements,
      { y: 30, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.8,
        stagger: 0.12,
        ease: 'power2.out',
      }
    );

    return () => { tl.kill(); };
  }, []);

  return (
    <section className="relative min-h-[100dvh] bg-[#131415] overflow-hidden flex items-center">
      {/* Background Liquid Gradient Text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <LiquidGradientText text="GENERATE" />
      </div>

      {/* Left Content */}
      <div
        ref={contentRef}
        className="relative z-10 max-w-7xl mx-auto px-6 py-20 w-full"
      >
        <div className="max-w-xl">
          {/* Subtitle */}
          <p className="hero-animate text-sm text-[#666C74] uppercase tracking-widest mb-6 opacity-0">
            无需设计师 / 批量 AI 生成
          </p>

          {/* Main Title */}
          <h1 className="hero-animate mb-6 opacity-0">
            <span className="block font-display text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1] tracking-tight">
              生成符合电商
            </span>
            <span className="block font-display text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1] tracking-tight mt-2">
              规范的主图
            </span>
          </h1>

          {/* Description */}
          <p className="hero-animate text-base text-[#666C74] leading-relaxed max-w-[380px] mb-8 opacity-0">
            从素材上传到多 SKU 批量出图，最快仅需 10 秒。适配淘宝、京东、亚马逊等主流平台规范。
          </p>

          {/* CTA Group */}
          <div className="hero-animate flex items-center gap-4 mb-12 opacity-0">
            <GradientButton variant="outline">
              立即体验生成
            </GradientButton>
            <a
              href="#scoring"
              className="flex items-center gap-2 text-sm text-[#666C74] hover:text-white transition-colors duration-200"
            >
              查看评分体系
              <ArrowRight size={14} />
            </a>
          </div>

          {/* Stats */}
          <div className="hero-animate flex items-center gap-10 opacity-0">
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl md:text-3xl font-light text-white tracking-wide">
                  {stat.value}
                </div>
                <div className="text-xs text-[#666C74] mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
