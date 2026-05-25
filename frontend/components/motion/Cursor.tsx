'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export default function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (reduced || !mounted) return;
    if (!matchMedia('(pointer: fine)').matches) return;

    document.documentElement.classList.add('has-custom-cursor');
    const dot = dotRef.current!;
    const ring = ringRef.current!;
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let rx = x;
    let ry = y;

    gsap.set([dot, ring], { xPercent: -50, yPercent: -50 });

    const move = (e: MouseEvent) => {
      x = e.clientX;
      y = e.clientY;
      gsap.set(dot, { x, y });
    };
    const enter = () => gsap.to(ring, { scale: 1.6, duration: 0.25, ease: 'power3.out' });
    const leave = () => gsap.to(ring, { scale: 1, duration: 0.3, ease: 'power3.out' });

    const tick = () => {
      rx += (x - rx) * 0.18;
      ry += (y - ry) * 0.18;
      gsap.set(ring, { x: rx, y: ry });
      raf = requestAnimationFrame(tick);
    };
    let raf = requestAnimationFrame(tick);

    window.addEventListener('mousemove', move);
    const interactive = Array.from(document.querySelectorAll('a, button, [data-cursor="pointer"]'));
    interactive.forEach((el) => {
      el.addEventListener('mouseenter', enter);
      el.addEventListener('mouseleave', leave);
    });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', move);
      interactive.forEach((el) => {
        el.removeEventListener('mouseenter', enter);
        el.removeEventListener('mouseleave', leave);
      });
      document.documentElement.classList.remove('has-custom-cursor');
    };
  }, [reduced, mounted]);

  if (!mounted || reduced) return null;

  return (
    <>
      <div
        ref={dotRef}
        aria-hidden
        style={{
          position: 'fixed', left: 0, top: 0, width: 6, height: 6, borderRadius: 999,
          background: '#34d399', pointerEvents: 'none', zIndex: 9999,
          mixBlendMode: 'difference',
        }}
      />
      <div
        ref={ringRef}
        aria-hidden
        style={{
          position: 'fixed', left: 0, top: 0, width: 36, height: 36, borderRadius: 999,
          border: '1px solid rgba(52,211,153,0.7)', pointerEvents: 'none', zIndex: 9998,
        }}
      />
    </>
  );
}
