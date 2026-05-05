import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const dimensions = [
  { name: '决策引导力', weight: '30%', score: 94, max: 30, raw: 28.2 },
  { name: '信息传递效率', weight: '25%', score: 96, max: 25, raw: 24.1 },
  { name: '商品真实信任度', weight: '25%', score: 99, max: 25, raw: 24.7 },
  { name: '视觉专业质感', weight: '20%', score: 96, max: 20, raw: 19.2 },
];

export default function ScoringSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const scoreRef = useRef<HTMLDivElement>(null);
  const barsRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      if (scoreRef.current) {
        gsap.fromTo(
          scoreRef.current,
          { scale: 0.8, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: 1,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: scoreRef.current,
              start: 'top 80%',
              toggleActions: 'play none none none',
            },
          }
        );
      }

      barsRef.current.forEach((bar, i) => {
        if (!bar) return;
        const inner = bar.querySelector('.progress-fill') as HTMLElement;
        if (!inner) return;

        gsap.fromTo(
          inner,
          { width: '0%' },
          {
            width: `${dimensions[i].score}%`,
            duration: 1.2,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: bar,
              start: 'top 85%',
              toggleActions: 'play none none none',
            },
            delay: i * 0.15,
          }
        );
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="scoring"
      ref={sectionRef}
      className="bg-[#F3F4F2] py-32 md:py-40"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-16 items-center">
          {/* Left: Big Score */}
          <div className="md:col-span-5">
            <div ref={scoreRef} className="opacity-0">
              <div className="scoring-gradient font-display text-8xl md:text-9xl font-bold leading-none tracking-tight">
                96.2
              </div>
              <p className="text-lg text-[#666C74] mt-4">
                50张AI生成主图平均分
              </p>
              <p className="text-sm text-[#666C74] mt-2 max-w-sm leading-relaxed">
                采用电商AI主图质量评价体系，对50种品类各生成1张主图进行4维度评分，平均得分96.2分，全部达到优秀标准（≥85分），不合格率0%。
              </p>
            </div>
          </div>

          {/* Right: Dimension Bars */}
          <div className="md:col-span-7 space-y-6">
            {dimensions.map((dim, index) => (
              <div
                key={dim.name}
                ref={(el) => { if (el) barsRef.current[index] = el; }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-[#131415]">
                      {dim.name}
                    </span>
                    <span className="text-xs text-[#666C74] bg-[#E7E9E6] px-2 py-0.5 rounded">
                      权重 {dim.weight}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-[#131415]">
                    {dim.raw.toFixed(1)}/{dim.max}分
                  </span>
                </div>
                <div className="h-2 bg-[#E7E9E6] rounded-full overflow-hidden">
                  <div
                    className="progress-fill progress-gradient h-full rounded-full"
                    style={{ width: '0%' }}
                  />
                </div>
                <p className="text-xs text-[#666C74] mt-1">
                  得分率 {dim.score}%
                </p>
              </div>
            ))}

            {/* Score Levels */}
            <div className="pt-6 border-t border-[#DDDDDD]">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { range: '≥85分', label: '优秀，可直接上架', color: '#22c55e' },
                  { range: '70~84分', label: '良好，轻微微调', color: '#3b82f6' },
                  { range: '50~69分', label: '一般，需重新生成', color: '#f59e0b' },
                  { range: '<50分', label: '不合格，不可用', color: '#ef4444' },
                ].map((level) => (
                  <div key={level.range} className="text-center">
                    <div
                      className="text-sm font-bold"
                      style={{ color: level.color }}
                    >
                      {level.range}
                    </div>
                    <div className="text-xs text-[#666C74] mt-1">
                      {level.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
