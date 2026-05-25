'use client';

import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { manifestoQuote } from '@/lib/mockData';
import { useReducedMotion } from '@/hooks/useReducedMotion';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function BeatV_Paper() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    if (!sectionRef.current || reduced) return;
    const ctx = gsap.context(() => {
      const words = sectionRef.current!.querySelectorAll('[data-word]');
      gsap.set(words, { yPercent: 110, opacity: 0 });
      gsap.to(words, {
        yPercent: 0,
        opacity: 1,
        ease: 'expo.out',
        stagger: 0.15,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 60%',
          toggleActions: 'play none none reverse',
        },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section
      id="beat-v"
      ref={sectionRef}
      className="relative min-h-[100vh] flex items-center px-6 md:px-12 py-32"
      style={{ background: 'var(--color-paper)', color: 'var(--color-paper-ink)' }}
    >
      <div className="relative z-10 max-w-5xl mx-auto">
        <span className="font-mono text-xs uppercase tracking-widest" style={{ color: '#5a5a55' }}>
          — Synapse manifesto
        </span>
        <h2 className="display-xl mt-8" style={{ overflow: 'hidden' }}>
          <span data-word className="inline-block">
            {manifestoQuote.pre}&nbsp;
          </span>
          <span
            data-word
            className="inline-block"
            style={{ fontStyle: 'italic', color: 'var(--color-accent-d)' }}
          >
            {manifestoQuote.italic1}
          </span>
          <br />
          <span data-word className="inline-block">
            {manifestoQuote.mid}&nbsp;
          </span>
          <span
            data-word
            className="inline-block"
            style={{ fontStyle: 'italic', color: 'var(--color-accent-d)' }}
          >
            {manifestoQuote.italic2}
          </span>
        </h2>
      </div>
    </section>
  );
}
