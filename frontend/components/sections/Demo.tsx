'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  demoQuery,
  demoResults,
  stats,
  modalityColors,
  type Modality,
} from '@/lib/mockData';
import DaisyBurst from '@/components/DaisyBurst';

type FilterKey = 'all' | Modality;

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function Demo() {
  const sectionRef = useRef<HTMLElement>(null);
  const searchBarRef = useRef<HTMLDivElement>(null);
  const [typed, setTyped] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');

  const filteredResults =
    filter === 'all'
      ? demoResults
      : demoResults.filter((r) => r.modality === filter);

  // Typewriter LOOP with backspace deletion.
  // Cycle: pre-pause (caret blinks) -> type in -> hold full (caret blinks)
  //        -> backspace out -> hold empty (caret blinks) -> repeat
  useEffect(() => {
    const el = searchBarRef.current;
    if (!el) return;

    const TYPE_SPEED = 95;
    const DELETE_SPEED = 55;
    const PRE_START = 700;   // caret blinks before first character
    const HOLD_FULL = 1400;  // caret blinks at the end of the word
    const HOLD_EMPTY = 700;  // caret blinks before retyping

    const timers = new Set<ReturnType<typeof setTimeout>>();
    let interval: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const clearTimers = () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
    const schedule = (fn: () => void, ms: number) => {
      const t = setTimeout(() => {
        timers.delete(t);
        if (!cancelled) fn();
      }, ms);
      timers.add(t);
    };

    const typeIn = () => {
      let i = 0;
      interval = setInterval(() => {
        if (cancelled) return;
        i += 1;
        setTyped(demoQuery.slice(0, i));
        if (i >= demoQuery.length) {
          if (interval) clearInterval(interval);
          interval = null;
          schedule(typeOut, HOLD_FULL);
        }
      }, TYPE_SPEED);
    };

    const typeOut = () => {
      let i = demoQuery.length;
      interval = setInterval(() => {
        if (cancelled) return;
        i -= 1;
        setTyped(demoQuery.slice(0, Math.max(0, i)));
        if (i <= 0) {
          if (interval) clearInterval(interval);
          interval = null;
          schedule(typeIn, HOLD_EMPTY);
        }
      }, DELETE_SPEED);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        schedule(typeIn, PRE_START);
      },
      { threshold: 0.5 },
    );
    observer.observe(el);

    return () => {
      cancelled = true;
      observer.disconnect();
      if (interval) clearInterval(interval);
      clearTimers();
    };
  }, []);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('[data-reveal]', {
        y: 30,
        opacity: 0,
        duration: 0.85,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 75%',
          once: true,
        },
      });

      gsap.from('[data-search]', {
        y: 40,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '[data-search]',
          start: 'top 80%',
          once: true,
        },
      });

      gsap.from('[data-result]', {
        y: 60,
        opacity: 0,
        duration: 0.85,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '[data-results]',
          start: 'top 80%',
          once: true,
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="demo"
      ref={sectionRef}
      className="relative bg-[#f6f5f0] text-[#0a0a0c] py-32 md:py-40 px-6 scroll-mt-0"
    >
      {/* Decorative blurred orb behind the section */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none overflow-hidden"
      >
        <div
          className="absolute left-1/2 -translate-x-1/2 top-[20%] w-[820px] h-[820px] rounded-full"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(37,99,235,0.10), transparent 70%)',
            filter: 'blur(90px)',
          }}
        />
      </div>

      {/* Scattered daisies on the sides — click any to burst */}
      <DaisyBurst
        size={64}
        className="absolute top-24 left-6 md:left-12 z-0"
        style={{ transform: 'rotate(-14deg)' }}
      />
      <DaisyBurst
        size={38}
        className="absolute top-72 left-3 md:left-4 z-0"
        style={{ transform: 'rotate(22deg)' }}
      />
      <DaisyBurst
        size={52}
        className="absolute bottom-44 left-8 md:left-16 z-0"
        style={{ transform: 'rotate(8deg)' }}
      />
      <DaisyBurst
        size={48}
        className="absolute top-40 right-6 md:right-12 z-0"
        style={{ transform: 'rotate(18deg)' }}
      />
      <DaisyBurst
        size={34}
        className="absolute top-[55%] right-3 md:right-6 z-0"
        style={{ transform: 'rotate(-10deg)' }}
      />
      <DaisyBurst
        size={58}
        className="absolute bottom-28 right-10 md:right-20 z-0"
        style={{ transform: 'rotate(-22deg)' }}
      />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <span
            data-reveal
            className="inline-block font-mono text-[11px] uppercase tracking-[0.22em] text-[#0a0a0c]/55"
          >
            02 · Live Demo
          </span>
          <h2
            data-reveal
            className="mt-6 font-display text-[clamp(40px,5.5vw,80px)] leading-[1.05] tracking-[-0.02em]"
          >
            Watch A Query
            <br />
            Find Its <em className="not-italic text-[#2563eb] italic">Neighbors</em>.
          </h2>
          <p
            data-reveal
            className="mt-6 font-mono uppercase tracking-[0.22em] text-[clamp(10.5px,0.85vw,12.5px)] leading-[1.85] text-[#0a0a0c]/60 max-w-xl mx-auto"
          >
            One Vector Goes In · Four Modalities Come Back · Image · Audio ·
            Video · Text · Ranked By Semantic Distance
          </p>
        </div>

        {/* Search bar mock */}
        <div data-search className="max-w-2xl mx-auto">
          <div
            ref={searchBarRef}
            className="flex items-center gap-3 pl-5 pr-1.5 py-1.5 rounded-xl bg-white border border-[#0a0a0c]/10 shadow-[0_8px_28px_-12px_rgba(0,0,0,0.18)]"
          >
            <svg
              className="w-5 h-5 text-[#0a0a0c]/50 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <span className="flex-1 font-display text-[20px] text-[#0a0a0c] leading-none flex items-center min-h-[24px]">
              {typed}
              <span
                aria-hidden
                className="inline-block ml-[2px] w-[2px] h-[22px] bg-[#0a0a0c]"
                style={{ animation: 'caret-blink 1s step-end infinite' }}
              />
            </span>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563eb] text-white px-5 py-3 text-[16px] font-display leading-none cursor-pointer transition-[background-color,box-shadow] duration-200 hover:bg-[#1d4ed8] hover:shadow-[0_6px_20px_-4px_rgba(37,99,235,0.6)]"
            >
              Search
              <span aria-hidden>→</span>
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[10.5px] font-mono uppercase tracking-[0.2em] text-[#0a0a0c]/55">
            <span>
              ↳ {stats.p50_ms}ms · {filteredResults.length} results ·{' '}
              {filter === 'all' ? 'all modalities' : filter}
            </span>
            <span>k = 50 · cosine distance</span>
          </div>
        </div>

        {/* Results grid */}
        <div
          data-results
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-12"
        >
          {filteredResults.map((r) => (
            <div
              key={r.id}
              data-result
              className="relative bg-white rounded-xl overflow-hidden border border-[#0a0a0c]/8 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.12)] hover:shadow-[0_14px_40px_-12px_rgba(0,0,0,0.22)] transition-shadow duration-300"
            >
              <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur px-2 py-0.5 border border-black/5">
                <span
                  style={{ backgroundColor: modalityColors[r.modality] }}
                  className="w-1.5 h-1.5 rounded-full"
                />
                <span className="font-mono text-[10px] tracking-widest uppercase text-[#0a0a0c]">
                  {r.modality}
                </span>
              </div>
              <div className="absolute top-3 right-3 z-10 rounded-full bg-white/90 backdrop-blur px-2 py-0.5 border border-black/5">
                <span className="font-mono text-[10px] text-[#2563eb] font-medium">
                  {r.score.toFixed(2)}
                </span>
              </div>

              {r.modality === 'image' && (
                <div className="relative aspect-[4/3]">
                  <Image
                    src={r.thumb}
                    alt=""
                    fill
                    sizes="320px"
                    className="object-cover"
                  />
                </div>
              )}

              {r.modality === 'audio' && (
                <div className="aspect-[4/3] bg-[#fef0f6] p-4 flex flex-col justify-end">
                  <div className="flex items-end gap-[2px] h-24 mb-3">
                    {r.peaks.map((p, i) => (
                      <span
                        key={i}
                        style={{
                          height: `${(p * 100).toFixed(2)}%`,
                          backgroundColor: modalityColors.audio,
                          opacity: '0.85',
                          width: '2px',
                        }}
                        className="rounded-sm"
                      />
                    ))}
                  </div>
                  <div className="flex justify-between font-mono text-[10px] text-[#0a0a0c]/60">
                    <span>00:00</span>
                    <span>{r.duration.toFixed(1)}s</span>
                  </div>
                </div>
              )}

              {r.modality === 'video' && (
                <div className="relative aspect-[4/3]">
                  <Image
                    src={r.poster}
                    alt=""
                    fill
                    sizes="320px"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="w-11 h-11 rounded-full bg-white/95 grid place-items-center shadow-md">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        aria-hidden
                      >
                        <path
                          d="M3 1.5L11.5 7L3 12.5V1.5Z"
                          fill="#0a0a0c"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="absolute bottom-3 right-3 rounded bg-black/70 px-1.5 py-0.5">
                    <span className="font-mono text-[10px] text-white">
                      {r.duration.toFixed(1)}s
                    </span>
                  </div>
                </div>
              )}

              {r.modality === 'text' && (
                <div className="aspect-[4/3] pt-12 px-5 pb-5 flex items-start bg-[#fefae5]">
                  <p className="text-[#0a0a0c]/85 text-[15px] leading-[1.55] font-display italic line-clamp-5">
                    “{r.snippet}”
                  </p>
                </div>
              )}

              <div className="px-3 py-2.5 border-t border-[#0a0a0c]/8 flex items-center justify-between">
                <span className="font-mono text-[10px] text-[#0a0a0c]/55 uppercase tracking-wider truncate">
                  {'credit' in r ? r.credit : r.source}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Modality filter pills — ALL first, then 4 modalities, all in one line */}
        <div
          data-reveal
          className="mt-10 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2"
        >
          {(['all', 'image', 'audio', 'video', 'text'] as const).map((m) => {
            const active = filter === m;
            const isAll = m === 'all';
            return (
              <button
                key={m}
                type="button"
                onClick={() => setFilter(active && !isAll ? 'all' : m)}
                className={`inline-flex items-center gap-1 sm:gap-1.5 rounded-full px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-[9.5px] sm:text-[11px] font-mono uppercase tracking-[0.16em] sm:tracking-[0.18em] border cursor-pointer transition-[background-color,color,border-color,box-shadow,transform] duration-200 whitespace-nowrap ${
                  active
                    ? 'bg-[#0a0a0c] text-white border-[#0a0a0c] shadow-[0_4px_12px_-4px_rgba(0,0,0,0.35)] scale-[1.04]'
                    : 'bg-white text-[#0a0a0c]/70 border-[#0a0a0c]/15 hover:border-[#0a0a0c]/40 hover:text-[#0a0a0c]'
                }`}
              >
                {!isAll && (
                  <span
                    style={{
                      backgroundColor:
                        modalityColors[m as keyof typeof modalityColors],
                    }}
                    className="w-1.5 h-1.5 rounded-full"
                  />
                )}
                {m}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
