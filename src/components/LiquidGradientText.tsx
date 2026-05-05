import { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface LiquidGradientTextProps {
  text: string;
  enableFlicker?: boolean;
}

export default function LiquidGradientText({ text, enableFlicker = true }: LiquidGradientTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const tl = gsap.timeline({ delay: 0.5 });
    tl.fromTo(
      containerRef.current,
      { opacity: 0, scale: 0.95 },
      { opacity: 1, scale: 1, duration: 1.2, ease: 'power2.out' }
    );
    return () => { tl.kill(); };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative ${enableFlicker ? 'efx-lights-out' : ''}`}
      style={{ opacity: 0 }}
    >
      {/* Glow layer */}
      <div
        className="liquid-gradient-text-glow select-none"
        aria-hidden="true"
      >
        {text}
      </div>
      {/* Base text layer with blur */}
      <div className="efx-LiquidGradient relative" style={{ zIndex: 1 }}>
        <div className="liquid-gradient-text select-none">
          {text}
        </div>
      </div>
    </div>
  );
}
