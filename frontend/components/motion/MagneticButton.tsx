'use client';

import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost';
  strength?: number;
};

export default function MagneticButton({
  children,
  variant = 'primary',
  strength = 0.4,
  className = '',
  ...rest
}: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;

    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      gsap.to(el, { x: dx * strength, y: dy * strength, duration: 0.4, ease: 'power3.out' });
    };
    const onLeave = () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    };

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [reduced, strength]);

  const base =
    'inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[15px] font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]';
  const styles =
    variant === 'primary'
      ? 'bg-[var(--color-accent)] text-[var(--color-ink-950)] hover:bg-[#46e0a6]'
      : 'border border-[var(--color-hairline)] text-[var(--color-fg)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]';

  return (
    <button ref={ref} className={`${base} ${styles} ${className}`} {...rest}>
      {children}
    </button>
  );
}
