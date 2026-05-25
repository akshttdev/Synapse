'use client';

import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SplitHeadline from '@/components/motion/SplitHeadline';
import ResultCard from '@/components/ui/ResultCard';
import Ticker from '@/components/motion/Ticker';
import { demoQuery, demoResults, stats } from '@/lib/mockData';
import { useReducedMotion } from '@/hooks/useReducedMotion';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function BeatIII_Demo() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    if (!ref.current || reduced) return;
    const ctx = gsap.context(() => {
      const cards = ref.current!.querySelectorAll('[data-card]');
      gsap.set(cards, { y: 40, opacity: 0, rotateX: 8 });
      gsap.to(cards, {
        y: 0,
        opacity: 1,
        rotateX: 0,
        ease: 'expo.out',
        duration: 0.9,
        stagger: 0.08,
        scrollTrigger: {
          trigger: ref.current,
          start: 'top 70%',
          toggleActions: 'play none none reverse',
        },
      });
    }, ref);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section
      id="beat-iii"
      ref={ref}
      className="relative min-h-[120vh] px-6 md:px-12 py-32"
    >
      <div className="relative z-10 max-w-6xl mx-auto">
        <span className="eyebrow block mb-4">03 · Live demo</span>
        <SplitHeadline as="h2" className="display-l text-[var(--color-fg)] max-w-3xl" split="words">
          Watch a real query find its neighbours.
        </SplitHeadline>

        <div className="mt-12 flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-ink-900)]/70 backdrop-blur border border-[var(--color-accent)]/60 px-4 py-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
            <code className="font-mono text-sm text-[var(--color-accent)]">"{demoQuery}"</code>
          </span>
          <span className="font-mono text-xs text-[var(--color-muted-2)]">
            ↳ <Ticker to={stats.p50_ms} suffix="ms" />
          </span>
          <span className="font-mono text-xs text-[var(--color-muted-2)]">
            ↳ <Ticker to={demoResults.length} suffix=" results" />
          </span>
        </div>

        <div
          className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          style={{ perspective: 1200 }}
        >
          {demoResults.map((r) => (
            <div key={r.id} data-card>
              <ResultCard data={r} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
