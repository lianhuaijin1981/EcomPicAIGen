import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SplitType from 'split-type';

gsap.registerPlugin(ScrollTrigger);

export default function VisualShowcaseSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);
  const splitTextRef = useRef<HTMLHeadingElement>(null);
  const splitInstanceRef = useRef<SplitType | null>(null);

  useEffect(() => {
    if (!sectionRef.current || !splitTextRef.current) return;

    // Split text into chars
    const split = new SplitType(splitTextRef.current, { types: 'words,chars' });
    splitInstanceRef.current = split;

    const chars = split.chars;
    if (!chars || chars.length === 0) return;

    // Wrap each char in char-wrap div
    chars.forEach((char) => {
      const wrap = document.createElement('div');
      wrap.className = 'char-wrap';
      wrap.style.display = 'inline-block';
      wrap.style.overflow = 'hidden';
      char.parentNode?.insertBefore(wrap, char);
      wrap.appendChild(char);
    });

    // Set perspective on parent
    if (splitTextRef.current.parentElement) {
      splitTextRef.current.parentElement.style.perspective = '1000px';
    }
    splitTextRef.current.style.letterSpacing = '-0.05rem';

    const ctx = gsap.context(() => {
      // Left gallery animation
      gsap.set('.gallery__item--left', { transformOrigin: '0% 100%' });
      gsap.fromTo(
        '.gallery__item--left',
        { scale: 0.8, rotation: -5 },
        {
          scale: 1,
          rotation: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: '.gallery-wrap',
            start: 'top bottom',
            end: 'center center',
            scrub: true,
          },
        }
      );

      // Right gallery animation
      gsap.set('.gallery__item--sides', { transformOrigin: '100% 100%' });
      gsap.fromTo(
        '.gallery__item--sides',
        { scale: 0.8, rotation: 5 },
        {
          scale: 1,
          rotation: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: '.gallery-wrap',
            start: 'top bottom',
            end: 'center center',
            scrub: true,
          },
        }
      );

      // 3D Cylinder text rotation
      const yoyoCyl = gsap.utils.wrapYoyo(1, chars.length + 1);

      chars.forEach((char, index) => {
        const charWrap = char.parentElement;
        if (charWrap) {
          gsap.set(charWrap, { perspective: 1000 });
        }

        gsap.fromTo(
          char,
          {
            rotationX: -90,
            y: 30,
            transformOrigin: `50% 50% ${-yoyoCyl(index) * 1.2}px`,
          },
          {
            rotationX: 0,
            y: 0,
            ease: 'back.out(1.2)',
            scrollTrigger: {
              trigger: '.caption',
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          }
        );
      });
    }, sectionRef);

    return () => {
      ctx.revert();
      if (splitInstanceRef.current) {
        splitInstanceRef.current.revert();
      }
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="bg-[#131415] py-20 md:py-32 overflow-hidden"
    >
      {/* Gallery */}
      <div className="gallery-wrap max-w-7xl mx-auto px-6">
        {/* Gallery images */}
        <div className="gallery mb-16">
          <div className="gallery__item--left">
            <div className="gallery__item-img">
              <img
                src="/images/showcase-glass.jpg"
                alt="AI 生成的水杯主图"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="gallery__item--sides">
            <div className="gallery__item-img">
              <img
                src="/images/showcase-tshirt.jpg"
                alt="AI 生成的T恤主图"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Caption with 3D rotating text */}
        <div ref={captionRef} className="caption py-12">
          <h2
            ref={splitTextRef}
            className="split-text text-white"
          >
            无界生成 光影重塑 真实质感
          </h2>
        </div>

        {/* Second row of images */}
        <div className="gallery mt-16">
          <div className="gallery__item--sides">
            <div className="gallery__item-img">
              <img
                src="/images/showcase-mouse.jpg"
                alt="AI 生成的鼠标主图"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="gallery__item--left">
            <div className="gallery__item-img">
              <img
                src="/images/showcase-glass.jpg"
                alt="AI 生成的产品主图"
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Center floating message */}
      <div className="max-w-3xl mx-auto px-6 mt-20 text-center">
        <p className="text-lg md:text-xl text-[#666C74] leading-relaxed">
          在复杂的视觉环境中，AI 帮你保持绝对的精准与清晰。
          <span className="block mt-2 text-sm text-[#666C74]">
            每一张主图都经过质量校验，确保符合电商平台规范与用户购买决策需求。
          </span>
        </p>
      </div>
    </section>
  );
}
