import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import HeroSection from '@/sections/HeroSection';
import WorkflowSection from '@/sections/WorkflowSection';
import CapabilitiesSection from '@/sections/CapabilitiesSection';
import VisualShowcaseSection from '@/sections/VisualShowcaseSection';
import CoverageSection from '@/sections/CoverageSection';
import ScoringSection from '@/sections/ScoringSection';

gsap.registerPlugin(ScrollTrigger);

function App() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 2,
    });

    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.destroy();
    };
  }, []);

  return (
    <div className="font-body">
      <Navigation />
      <main>
        <HeroSection />
        <WorkflowSection />
        <CapabilitiesSection />
        <VisualShowcaseSection />
        <CoverageSection />
        <ScoringSection />
      </main>
      <Footer />
    </div>
  );
}

export default App;
