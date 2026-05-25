'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import Image from 'next/image';
import type { ResultCardData } from '@/lib/mockData';
import { modalityColors } from '@/lib/mockData';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export default function ResultCard({ data }: { data: ResultCardData }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    const move = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      gsap.to(el, {
        rotateY: dx * 8,
        rotateX: -dy * 8,
        duration: 0.3,
        ease: 'power3.out',
        transformPerspective: 1000,
      });
    };
    const leave = () =>
      gsap.to(el, { rotateX: 0, rotateY: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
    el.addEventListener('mousemove', move);
    el.addEventListener('mouseleave', leave);
    return () => {
      el.removeEventListener('mousemove', move);
      el.removeEventListener('mouseleave', leave);
    };
  }, [reduced]);

  const accent = modalityColors[data.modality];

  return (
    <div
      ref={ref}
      style={{ perspective: 1000, transformStyle: 'preserve-3d' }}
      className="relative w-full rounded-xl border border-[var(--color-hairline)] bg-[var(--color-ink-900)] overflow-hidden shadow-lg"
      data-cursor="pointer"
    >
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 rounded-full bg-[var(--color-ink-950)]/70 px-2 py-0.5 backdrop-blur">
        <span style={{ background: accent }} className="w-1.5 h-1.5 rounded-full" />
        <span className="font-mono text-[10px] tracking-widest uppercase text-[var(--color-fg)]">
          {data.modality}
        </span>
      </div>
      <div className="absolute top-2 right-2 z-10 rounded-full bg-[var(--color-ink-950)]/70 px-2 py-0.5 backdrop-blur">
        <span className="font-mono text-[10px] text-[var(--color-accent)]">
          {data.score.toFixed(2)}
        </span>
      </div>

      {data.modality === 'image' && (
        <div className="relative aspect-[4/3] w-full">
          <Image src={data.thumb} alt="" fill sizes="320px" className="object-cover" />
        </div>
      )}

      {data.modality === 'audio' && <AudioVisual peaks={data.peaks} duration={data.duration} />}

      {data.modality === 'video' && (
        <div className="relative aspect-[4/3] w-full">
          <Image src={data.poster} alt="" fill sizes="320px" className="object-cover" />
          <div className="absolute inset-0 grid place-items-center">
            <div className="w-10 h-10 rounded-full bg-[var(--color-ink-950)]/70 backdrop-blur grid place-items-center">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 1.5L11.5 7L3 12.5V1.5Z" fill="#fff" />
              </svg>
            </div>
          </div>
          <div className="absolute bottom-2 right-2 rounded bg-[var(--color-ink-950)]/70 px-1.5 py-0.5">
            <span className="font-mono text-[10px] text-[var(--color-fg)]">
              {data.duration.toFixed(1)}s
            </span>
          </div>
        </div>
      )}

      {data.modality === 'text' && (
        <div className="p-4 aspect-[4/3] flex items-start">
          <p className="text-[var(--color-fg)] text-sm leading-relaxed line-clamp-6">
            {data.snippet}
          </p>
        </div>
      )}

      <div className="px-3 py-2 border-t border-[var(--color-hairline)]">
        <span className="font-mono text-[10px] text-[var(--color-muted-2)] uppercase tracking-wider">
          {'credit' in data ? data.credit : data.source}
        </span>
      </div>
    </div>
  );
}

function AudioVisual({ peaks, duration }: { peaks: number[]; duration: number }) {
  return (
    <div className="relative w-full aspect-[4/3] bg-[var(--color-ink-800)] px-3 py-4 flex flex-col justify-end">
      <div className="flex items-end gap-[2px] h-20 mb-3">
        {peaks.map((p, i) => (
          <span
            key={i}
            style={{
              height: `${p * 100}%`,
              background: modalityColors.audio,
              opacity: 0.85,
              width: 2,
            }}
            className="rounded-sm"
          />
        ))}
      </div>
      <div className="flex justify-between font-mono text-[10px] text-[var(--color-muted-2)]">
        <span>00:00</span>
        <span>{duration.toFixed(1)}s</span>
      </div>
    </div>
  );
}
