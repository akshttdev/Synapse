'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const WORDS = ['image', 'audio', 'video', 'text'] as const;

export default function ModalityRotator({ className = '' }: { className?: string }) {
  const [i, setI] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => setI((n) => (n + 1) % WORDS.length), 1800);
    return () => clearInterval(t);
  }, [reduced]);

  if (reduced) {
    return (
      <span className={className} style={{ fontStyle: 'italic', color: '#34d399' }}>
        image / audio / video / text
      </span>
    );
  }

  return (
    <span
      className={className}
      style={{
        position: 'relative',
        display: 'inline-block',
        verticalAlign: 'baseline',
        minWidth: '5ch',
      }}
    >
      {WORDS.map((w, idx) => (
        <span
          key={w}
          aria-hidden={idx !== i}
          style={{
            position: idx === 0 ? 'relative' : 'absolute',
            left: 0,
            top: 0,
            opacity: idx === i ? 1 : 0,
            transform: `translateY(${idx === i ? 0 : idx > i ? 40 : -40}%)`,
            transition: 'opacity 220ms ease, transform 320ms cubic-bezier(0.22, 1, 0.36, 1)',
            color: '#34d399',
            fontStyle: 'italic',
            whiteSpace: 'nowrap',
          }}
        >
          {w}
        </span>
      ))}
      <span className="sr-only" aria-live="polite">
        {WORDS[i]}
      </span>
    </span>
  );
}
