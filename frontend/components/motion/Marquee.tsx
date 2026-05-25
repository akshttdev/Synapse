'use client';

import { useReducedMotion } from '@/hooks/useReducedMotion';

type Props = {
  items: string[];
  className?: string;
  /** seconds per full loop */
  duration?: number;
};

export default function Marquee({ items, className = '', duration = 28 }: Props) {
  const reduced = useReducedMotion();
  const seq = [...items, ...items];

  return (
    <div className={`overflow-hidden ${className}`} aria-hidden>
      <div
        style={{
          display: 'flex',
          gap: '3rem',
          whiteSpace: 'nowrap',
          willChange: 'transform',
          animation: reduced ? 'none' : `synapse-marquee ${duration}s linear infinite`,
        }}
      >
        {seq.map((s, i) => (
          <span
            key={i}
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 32,
              color: '#145740',
              letterSpacing: '-0.02em',
              flexShrink: 0,
            }}
          >
            {s}
          </span>
        ))}
      </div>
      <style>{`
        @keyframes synapse-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
