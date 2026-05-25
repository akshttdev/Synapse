'use client';

import { useEffect, useState } from 'react';
import HeroBackdrop from './HeroBackdrop';
import Flower from '@/components/icons/Flower';
import Header from '@/components/Header';

/**
 * Scattered feature labels with thin vertical arrow lines, mirroring
 * the reference image (Reports/Analytics/Dashboard/... in the
 * inspiration shot). Tuned for Synapse vocabulary.
 */
const FEATURES: { label: string; x: number; lineH: number }[] = [
  { label: 'Image',       x: 0.06, lineH: 110 },
  { label: 'Files',       x: 0.13, lineH: 70 },
  { label: 'Audio',       x: 0.21, lineH: 140 },
  { label: 'Embedding',   x: 0.29, lineH: 95 },
  { label: 'Video',       x: 0.38, lineH: 165 },
  { label: 'Query',       x: 0.47, lineH: 80 },
  { label: 'Vector',      x: 0.55, lineH: 130 },
  { label: 'Index',       x: 0.63, lineH: 95 },
  { label: 'Semantic',    x: 0.72, lineH: 175 },
  { label: 'Cross-modal', x: 0.82, lineH: 110 },
  { label: 'Retrieve',    x: 0.91, lineH: 70 },
];

export default function Hero() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setLoaded(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const lineStyle = (delay: number) => ({
    transform: loaded ? 'translateY(0)' : 'translateY(40px)',
    opacity: loaded ? 1 : 0,
    transition: `transform 900ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, opacity 900ms ease-out ${delay}ms`,
  });

  const revealStyle = (delay: number) => ({
    transform: loaded ? 'translateY(0)' : 'translateY(20px)',
    opacity: loaded ? 1 : 0,
    transition: `transform 800ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, opacity 800ms ease-out ${delay}ms`,
  });

  return (
    <section className="relative min-h-[100vh] overflow-hidden bg-[#02110f]">
      <HeroBackdrop />

      {/* Header lives INSIDE the hero so it scrolls away with the hero;
          sticky-top keeps it pinned while the user is still on hero. */}
      <Header />

      {/* Scattered feature labels — bottom-anchored arrow lines */}
      <div className="absolute inset-x-0 bottom-0 z-10 pointer-events-none">
        {FEATURES.map((f, i) => {
          const delay = 200 + i * 55;
          return (
            <div
              key={i}
              className="absolute flex flex-col items-center"
              style={{
                left: `${f.x * 100}%`,
                bottom: '8%',
                // Outer wrapper keeps the absolute positioning;
                // the inner wrapper carries the slide-up so it composes cleanly.
                transform: 'translateX(-50%)',
              }}
            >
              <div className="flex flex-col items-center" style={lineStyle(delay)}>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/55 mb-1.5 whitespace-nowrap">
                  {f.label}
                </span>
                <span
                  aria-hidden
                  className="text-[8px] text-white/40 leading-none -mb-0.5"
                >
                  ▲
                </span>
                <span
                  aria-hidden
                  className="block w-px bg-gradient-to-b from-white/30 via-white/15 to-transparent"
                  style={{ height: f.lineH }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Centered headline */}
      <div className="relative z-20 max-w-6xl mx-auto px-6 pt-40 md:pt-48 text-center">
        <h1 className="font-display text-white text-[clamp(56px,7.6vw,112px)] leading-[1.04] tracking-[-0.02em]">
          <span style={{ display: 'block', ...lineStyle(150) }}>Search Anything.</span>
          <span style={{ display: 'block', ...lineStyle(280) }}>With Anything.</span>
          <span style={{ display: 'block', ...lineStyle(410) }}>Across Modalities.</span>
        </h1>
        <p
          className="mt-6 font-display text-white text-[clamp(17px,1.25vw,20px)] leading-[1.5] max-w-md mx-auto"
          style={revealStyle(620)}
        >
          One 1024-dimensional embedding space for image, audio, video, and text.
        </p>
        <div className="mt-10 flex justify-center gap-3" style={revealStyle(780)}>
          <a
            href="/dashboard"
            className="rounded-lg bg-white border border-white text-black px-7 py-3 font-display text-[18px] leading-none transition-[background-color,color,border-color,box-shadow] duration-300 ease-out hover:bg-transparent hover:text-white hover:border-white/55 hover:shadow-[0_0_36px_-2px_rgba(255,255,255,0.3)]"
          >
            Get Started
          </a>
          <button
            type="button"
            className="group inline-flex items-center gap-2.5 rounded-lg bg-[#2563eb] text-white px-7 py-3 font-display text-[18px] leading-none shadow-[0_6px_20px_-4px_rgba(37,99,235,0.55)] transition-[background-color,box-shadow,transform] duration-300 ease-out hover:bg-[#1d4ed8] hover:shadow-[0_10px_32px_-4px_rgba(37,99,235,0.7)]"
          >
            Demo Video
            <Flower
              className="text-white transition-transform duration-500 ease-out group-hover:rotate-90"
              size={16}
            />
          </button>
        </div>
      </div>
    </section>
  );
}
