'use client';

import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion } from '@/hooks/useReducedMotion';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

type Props = {
  as?: 'h1' | 'h2' | 'h3' | 'span' | 'div';
  className?: string;
  children: React.ReactNode;
  /** Optional explicit trigger element selector; defaults to the headline itself. */
  trigger?: string;
  /** Split granularity. */
  split?: 'chars' | 'words';
  stagger?: number;
  delay?: number;
};

/**
 * Lightweight word/char splitter that doesn't depend on GSAP's paid SplitText
 * plugin. It wraps each unit in a span and animates them on intersection.
 */
function splitInto(el: HTMLElement, mode: 'chars' | 'words'): HTMLElement[] {
  const text = el.textContent ?? '';
  el.textContent = '';
  const out: HTMLElement[] = [];
  if (mode === 'words') {
    const words = text.split(/(\s+)/);
    words.forEach((w) => {
      if (/^\s+$/.test(w)) {
        el.appendChild(document.createTextNode(w));
        return;
      }
      const wrap = document.createElement('span');
      wrap.style.display = 'inline-block';
      wrap.style.overflow = 'hidden';
      wrap.style.lineHeight = '1';
      const inner = document.createElement('span');
      inner.style.display = 'inline-block';
      inner.style.willChange = 'transform, opacity';
      inner.textContent = w;
      wrap.appendChild(inner);
      el.appendChild(wrap);
      out.push(inner);
    });
  } else {
    Array.from(text).forEach((ch) => {
      if (ch === ' ') {
        el.appendChild(document.createTextNode(' '));
        return;
      }
      const wrap = document.createElement('span');
      wrap.style.display = 'inline-block';
      wrap.style.overflow = 'hidden';
      wrap.style.lineHeight = '1';
      const inner = document.createElement('span');
      inner.style.display = 'inline-block';
      inner.style.willChange = 'transform, opacity';
      inner.textContent = ch;
      wrap.appendChild(inner);
      el.appendChild(wrap);
      out.push(inner);
    });
  }
  return out;
}

export default function SplitHeadline({
  as: Tag = 'h2',
  className,
  children,
  trigger,
  split = 'chars',
  stagger = 0.02,
  delay = 0,
}: Props) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (reduced) {
      gsap.set(el, { opacity: 1 });
      return;
    }

    // Capture the rendered text content before splitting.
    const targets = splitInto(el, split);
    gsap.set(targets, { yPercent: 110, opacity: 0 });

    const ctx = gsap.context(() => {
      gsap.to(targets, {
        yPercent: 0,
        opacity: 1,
        ease: 'expo.out',
        duration: 0.9,
        stagger,
        delay,
        scrollTrigger: {
          trigger: trigger ?? el,
          start: 'top 80%',
          toggleActions: 'play none none reverse',
        },
      });
    }, el);

    return () => ctx.revert();
  }, [reduced, split, stagger, delay, trigger]);

  return (
    <Tag ref={ref as React.RefObject<HTMLHeadingElement & HTMLSpanElement & HTMLDivElement>} className={className}>
      {children}
    </Tag>
  );
}
