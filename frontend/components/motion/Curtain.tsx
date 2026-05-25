'use client';

import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion } from '@/hooks/useReducedMotion';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const D_REST_BOTTOM = 'M 0 100 V 100 Q 50 100 100 100 V 100 z';
const D_FULL = 'M 0 100 V 50 Q 50 0 100 50 V 100 z';
const D_SWEPT_OFF_TOP = 'M 0 0 V 0 Q 50 0 100 0 V 0 z';

type Props = {
  /** CSS selector of the section the curtain rises against (outgoing beat). */
  outTrigger: string;
  /** CSS selector of the section the curtain sweeps off (incoming beat). */
  inTrigger: string;
  color: string;
};

export default function Curtain({ outTrigger, inTrigger, color }: Props) {
  const ref = useRef<SVGPathElement>(null);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    if (!ref.current || reduced) return;

    const ctx = gsap.context(() => {
      gsap.set(ref.current, { attr: { d: D_REST_BOTTOM } });

      gsap.to(ref.current, {
        attr: { d: D_FULL },
        ease: 'power2.in',
        scrollTrigger: {
          trigger: outTrigger,
          start: 'bottom 80%',
          end: 'bottom 20%',
          scrub: 1,
        },
      });

      gsap.to(ref.current, {
        attr: { d: D_SWEPT_OFF_TOP },
        ease: 'power2.out',
        scrollTrigger: {
          trigger: inTrigger,
          start: 'top 80%',
          end: 'top 20%',
          scrub: 1,
        },
      });
    });

    return () => ctx.revert();
  }, [outTrigger, inTrigger, reduced]);

  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{
        position: 'fixed', inset: 0, width: '100vw', height: '100vh',
        pointerEvents: 'none', zIndex: 5,
      }}
    >
      <path ref={ref} d={D_REST_BOTTOM} fill={color} />
    </svg>
  );
}
