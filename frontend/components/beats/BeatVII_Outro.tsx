'use client';

import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import MagneticButton from '@/components/motion/MagneticButton';
import Marquee from '@/components/motion/Marquee';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export default function BeatVII_Outro() {
  const pulseRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    if (!pulseRef.current || reduced) return;
    const ctx = gsap.context(() => {
      gsap.to(pulseRef.current, {
        scale: 1.8,
        opacity: 0.4,
        repeat: -1,
        yoyo: true,
        duration: 0.4,
        ease: 'sine.inOut',
      });
    });
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section id="beat-vii" className="relative min-h-[80vh] flex flex-col items-center justify-center px-6 py-24">
      <div
        ref={pulseRef}
        aria-hidden
        style={{
          width: 12,
          height: 12,
          borderRadius: 999,
          background: '#34d399',
          boxShadow: '0 0 24px #34d399, 0 0 60px rgba(52,211,153,0.55)',
          marginBottom: 28,
        }}
      />
      <h2 className="display-l text-[var(--color-fg)] text-center">Start the search.</h2>
      <div className="mt-8">
        <MagneticButton
          variant="primary"
          onClick={() => {
            window.location.href = '/search';
          }}
        >
          Open the demo
          <span aria-hidden>→</span>
        </MagneticButton>
      </div>
      <div className="mt-24 w-full">
        <Marquee
          items={['image', 'audio', 'video', 'text', 'image', 'audio', 'video', 'text']}
        />
      </div>
    </section>
  );
}
