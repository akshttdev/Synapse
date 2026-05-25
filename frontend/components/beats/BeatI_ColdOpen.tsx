'use client';

import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export default function BeatI_ColdOpen() {
  const pulseRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    if (!pulseRef.current || reduced) return;
    const ctx = gsap.context(() => {
      gsap.to(pulseRef.current, {
        scale: 1.6,
        opacity: 0.6,
        repeat: -1,
        yoyo: true,
        duration: 0.75,
        ease: 'sine.inOut',
      });
    });
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section id="beat-i" className="relative h-[50vh] grid place-items-center">
      <div
        ref={pulseRef}
        aria-hidden
        style={{
          width: 14,
          height: 14,
          borderRadius: 999,
          background: '#34d399',
          boxShadow: '0 0 24px #34d399, 0 0 60px rgba(52,211,153,0.45)',
        }}
      />
    </section>
  );
}
