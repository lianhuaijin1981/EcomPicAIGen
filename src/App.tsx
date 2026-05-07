import { useEffect } from 'react';
import { Routes, Route } from 'react-router';
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
import PricingSection from '@/sections/PricingSection';
import AlgorithmManagerSection from '@/sections/AlgorithmManagerSection';
import AuthPage from '@/pages/AuthPage';
import HistoryPage from '@/pages/HistoryPage';
import ExportPage from '@/pages/ExportPage';

gsap.registerPlugin(ScrollTrigger);

function HomePage() {
  return (
    <>
      <HeroSection />
      <WorkflowSection />
      <CapabilitiesSection />
      <VisualShowcaseSection />
      <CoverageSection />
      <ScoringSection />
      <PricingSection />
    </>
  );
}

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
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/algorithms" element={<AlgorithmManagerSection />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/export" element={<ExportPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
