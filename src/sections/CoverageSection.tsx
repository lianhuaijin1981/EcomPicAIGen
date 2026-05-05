import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const categories = [
  {
    name: '3C数码',
    items: [
      { name: '手机', img: '/images/products/01_phone.jpg' },
      { name: '耳机', img: '/images/products/02_earbuds.jpg' },
      { name: '充电器', img: '/images/products/03_charger.jpg' },
      { name: '充电宝', img: '/images/products/04_powerbank.jpg' },
      { name: '笔记本', img: '/images/products/05_laptop.jpg' },
      { name: '平板', img: '/images/products/06_tablet.jpg' },
      { name: '键盘', img: '/images/products/07_keyboard.jpg' },
      { name: '鼠标', img: '/images/products/08_mouse.jpg' },
      { name: '摄像头', img: '/images/products/09_webcam_v2.jpg' },
      { name: '手表', img: '/images/products/10_smartwatch.jpg' },
    ],
  },
  {
    name: '服饰鞋包',
    items: [
      { name: 'T恤', img: '/images/products/11_tshirt.jpg' },
      { name: '牛仔裤', img: '/images/products/12_jeans.jpg' },
      { name: '连衣裙', img: '/images/products/13_dress.jpg' },
      { name: '外套', img: '/images/products/14_jacket.jpg' },
      { name: '运动鞋', img: '/images/products/15_sneakers.jpg' },
      { name: '皮鞋', img: '/images/products/16_leather_shoes.jpg' },
      { name: '背包', img: '/images/products/17_backpack.jpg' },
      { name: '钱包', img: '/images/products/18_wallet.jpg' },
      { name: '帽子', img: '/images/products/19_cap.jpg' },
      { name: '围巾', img: '/images/products/20_scarf.jpg' },
    ],
  },
  {
    name: '家居日用',
    items: [
      { name: '水杯', img: '/images/products/21_water_bottle.jpg' },
      { name: '毛巾', img: '/images/products/22_towel.jpg' },
      { name: '洗衣液', img: '/images/products/23_laundry.jpg' },
      { name: '卫生纸', img: '/images/products/24_tissue.jpg' },
      { name: '收纳盒', img: '/images/products/25_storage.jpg' },
      { name: '台灯', img: '/images/products/26_lamp.jpg' },
      { name: '枕头', img: '/images/products/27_pillow.jpg' },
      { name: '被子', img: '/images/products/28_quilt.jpg' },
      { name: '餐具', img: '/images/products/29_dinnerware.jpg' },
      { name: '垃圾桶', img: '/images/products/30_trashbin.jpg' },
    ],
  },
  {
    name: '美妆个护',
    items: [
      { name: '口红', img: '/images/products/31_lipstick.jpg' },
      { name: '粉底液', img: '/images/products/32_foundation.jpg' },
      { name: '面膜', img: '/images/products/33_facemask_v2.jpg' },
      { name: '洗面奶', img: '/images/products/34_cleanser.jpg' },
      { name: '爽肤水', img: '/images/products/35_toner.jpg' },
      { name: '乳液', img: '/images/products/36_lotion.jpg' },
      { name: '防晒霜', img: '/images/products/37_sunscreen.jpg' },
      { name: '眼影', img: '/images/products/38_eyeshadow.jpg' },
      { name: '睫毛膏', img: '/images/products/39_mascara.jpg' },
      { name: '洗发水', img: '/images/products/40_shampoo.jpg' },
    ],
  },
  {
    name: '家电',
    items: [
      { name: '电饭煲', img: '/images/products/41_rice_cooker_v2.jpg' },
      { name: '电磁炉', img: '/images/products/42_induction.jpg' },
      { name: '微波炉', img: '/images/products/43_microwave.jpg' },
      { name: '电风扇', img: '/images/products/44_fan.jpg' },
      { name: '加湿器', img: '/images/products/45_humidifier.jpg' },
      { name: '吸尘器', img: '/images/products/46_vacuum.jpg' },
      { name: '吹风机', img: '/images/products/47_hairdryer.jpg' },
      { name: '电水壶', img: '/images/products/48_kettle.jpg' },
      { name: '净化器', img: '/images/products/49_purifier.jpg' },
      { name: '榨汁机', img: '/images/products/50_juicer.jpg' },
    ],
  },
];

export default function CoverageSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      cardsRef.current.forEach((card, i) => {
        if (!card) return;
        gsap.fromTo(
          card,
          { y: 30, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.5,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: card,
              start: 'top 90%',
              toggleActions: 'play none none none',
            },
            delay: (i % 10) * 0.04,
          }
        );
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  let cardIndex = 0;

  return (
    <section ref={sectionRef} id="gallery" className="bg-[#E7E9E6] py-32 md:py-40">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Title */}
        <div className="mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-[#131415] leading-tight">
            50 种品类全覆盖
          </h2>
          <p className="text-base text-[#666C74] mt-4 max-w-lg">
            AI 实际生成 50 张电商主图，通过质量评分体系验证，平均得分 96.2 分，全部达标。
          </p>
        </div>

        {/* Category Grids with Images */}
        <div className="space-y-16">
          {categories.map((category) => (
            <div key={category.name}>
              <h3 className="text-sm font-semibold text-[#666C74] uppercase tracking-widest mb-6">
                {category.name}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {category.items.map((item) => {
                  const currentIndex = cardIndex++;
                  return (
                    <div
                      key={item.name}
                      ref={(el) => { if (el) cardsRef.current[currentIndex] = el; }}
                      className="coverage-card bg-[#F3F4F2] border border-[#DDDDDD] rounded overflow-hidden cursor-default opacity-0"
                    >
                      <div className="aspect-square overflow-hidden">
                        <img
                          src={item.img}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="px-3 py-2 text-center">
                        <span className="text-xs font-medium text-[#131415]">{item.name}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-4 gap-8 border-t border-[#DDDDDD] pt-12">
          {[
            { num: '96.2', label: '平均分' },
            { num: '50', label: '生成张数' },
            { num: '100%', label: '达标率(≥85)' },
            { num: '0%', label: '不合格率(<70)' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-4xl font-light scoring-gradient tracking-wide">
                {stat.num}
              </div>
              <div className="text-sm text-[#666C74] mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
