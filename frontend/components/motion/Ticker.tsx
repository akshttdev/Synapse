'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  to: number;
  durationMs?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
  decimals?: number;
};

export default function Ticker({
  to,
  durationMs = 1200,
  suffix = '',
  prefix = '',
  className = '',
  decimals = 0,
}: Props) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let start: number | null = null;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        obs.disconnect();
        const tick = (ts: number) => {
          if (start === null) start = ts;
          const p = Math.min(1, (ts - start) / durationMs);
          const eased = 1 - Math.pow(1 - p, 3);
          setValue(to * eased);
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      obs.disconnect();
    };
  }, [to, durationMs]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
}
