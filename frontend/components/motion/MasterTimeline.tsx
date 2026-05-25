'use client';

import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useSceneAPI } from '@/components/canvas/sceneContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * The single film timeline. Scrubbed by ScrollTrigger; keyframes the
 * shared canvas state (sceneIndex/cameraZ/fog/scale/opacity) across
 * the seven beats. DOM overlays animate themselves via per-beat
 * ScrollTriggers; this owns ONLY the canvas score.
 */
export default function MasterTimeline({ children }: { children: React.ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const api = useSceneAPI();
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    if (reduced) {
      api.set({ sceneIndex: 1, cameraZ: -3.5, fog: 0, scale: 1, opacity: 1 });
      return;
    }

    const ctx = gsap.context(() => {
      const state = { sceneIndex: 0, cameraZ: -3.5, fog: 0, scale: 1, opacity: 1 };
      const sync = () => api.set(state);

      gsap.timeline({
        scrollTrigger: {
          trigger: wrapRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1,
          onUpdate: sync,
        },
      })
        // I → II  (pulse → cloud)
        .to(state, { sceneIndex: 1, cameraZ: -3.5, scale: 1, ease: 'power2.out', duration: 0.22 })
        // II → III (cloud → converge), dolly in
        .to(state, { sceneIndex: 2, cameraZ: -2.7, ease: 'sine.inOut', duration: 0.18 })
        // III → IV (converge → quadrants), pull back
        .to(state, { sceneIndex: 3, cameraZ: -4.4, ease: 'sine.inOut', duration: 0.18 })
        // IV → V (quadrants → paper), canvas fades behind curtain
        .to(state, { sceneIndex: 4, opacity: 0, fog: 0.4, ease: 'sine.in', duration: 0.14 })
        // V → VI (paper → system), canvas returns, big pull-back
        .to(state, { sceneIndex: 5, opacity: 1, fog: 0.1, cameraZ: -5.2, ease: 'sine.out', duration: 0.18 })
        // VI → VII (system → outro), collapse
        .to(state, { sceneIndex: 6, cameraZ: -3.0, scale: 1.4, ease: 'power3.inOut', duration: 0.10 });
    }, wrapRef);

    return () => ctx.revert();
  }, [api, reduced]);

  return <div ref={wrapRef}>{children}</div>;
}
