'use client';

import { useCallback, useRef, type CSSProperties } from 'react';
import Daisy from '@/components/icons/Daisy';
import { burstAt } from '@/lib/burst';

type Props = {
  size?: number;
  className?: string;
  style?: CSSProperties;
  /** Number of particles to spawn per click. Defaults to a random 8–13. */
  count?: number;
};

export default function DaisyBurst({ size = 40, className = '', style, count }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const burst = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    burstAt(rect.left + rect.width / 2, rect.top + rect.height / 2, count);
  }, [count]);

  return (
    <div
      ref={containerRef}
      onClick={burst}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          burst();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="Daisy"
      className={`cursor-pointer select-none ${className}`}
      style={style}
    >
      <Daisy size={size} />
    </div>
  );
}
