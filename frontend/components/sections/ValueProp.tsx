'use client';

import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function ValueProp() {
  const sectionRef = useRef<HTMLElement>(null);
  const bgWordRef = useRef<HTMLDivElement>(null);
  const orbsRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        bgWordRef.current,
        { yPercent: 35 },
        {
          yPercent: -35,
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1,
          },
        },
      );

      gsap.fromTo(
        orbsRef.current,
        { yPercent: 20 },
        {
          yPercent: -25,
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1,
          },
        },
      );

      gsap.fromTo(
        contentRef.current,
        { yPercent: -3 },
        {
          yPercent: 3,
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1,
          },
        },
      );

      gsap.from('[data-reveal]', {
        y: 40,
        opacity: 0,
        duration: 0.9,
        stagger: 0.12,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: contentRef.current,
          start: 'top 75%',
          toggleActions: 'play none none reverse',
        },
      });

      gsap.from('[data-quote-word]', {
        y: 24,
        opacity: 0,
        duration: 0.8,
        stagger: 0.06,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '[data-quote]',
          start: 'top 75%',
          toggleActions: 'play none none reverse',
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const quote = 'Search is not a feature.';
  const quote2 = 'It is a fabric.';

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[160vh] overflow-hidden bg-[#f6f5f0] text-[#0a0a0c] py-48 px-6"
    >
      {/* Layer 1 — massive ghost word, slowest */}
      <div
        ref={bgWordRef}
        aria-hidden
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
      >
        <span className="font-display text-[clamp(220px,32vw,520px)] text-black/[0.045] uppercase tracking-[-0.04em] leading-none whitespace-nowrap">
          SYNAPSE
        </span>
      </div>

      {/* Layer 2 — colored blur orbs, medium speed */}
      <div ref={orbsRef} aria-hidden className="absolute inset-0 pointer-events-none">
        <div
          className="absolute left-[6%] top-[10%] w-[440px] h-[440px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(96,165,250,0.32), transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <div
          className="absolute right-[8%] top-[42%] w-[540px] h-[540px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(251,191,36,0.28), transparent 70%)',
            filter: 'blur(70px)',
          }}
        />
        <div
          className="absolute left-[34%] bottom-[8%] w-[380px] h-[380px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(244,114,182,0.22), transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
      </div>

      {/* Layer 3 — content */}
      <div ref={contentRef} className="relative z-10 max-w-5xl mx-auto">
        <div className="mt-12">
          <span
            data-reveal
            className="inline-block font-mono text-[11px] uppercase tracking-[0.22em] text-[#0a0a0c]/55"
          >
            01 · Why Synapse
          </span>
          <h2
            data-reveal
            className="mt-8 font-display text-[#0a0a0c] text-[clamp(44px,6vw,92px)] leading-[1.04] tracking-[-0.02em]"
          >
            One space.
            <br />
            Every modality.
          </h2>
          <p
            data-reveal
            className="mt-10 font-sans text-[17px] leading-[1.7] text-[#0a0a0c]/75 max-w-xl"
          >
            For decades search has been a stack of bolted-together pipelines —
            one for images, one for audio, one for text. Each speaking its own
            dialect. None aware the others existed.
          </p>
          <p
            data-reveal
            className="mt-5 font-sans text-[17px] leading-[1.7] text-[#0a0a0c]/75 max-w-xl"
          >
            Synapse collapses them into one 1024-dimensional embedding space.
            Type a word, find a sound. Drop a photo, find a video. Every
            artifact lives next to its semantic neighbours, regardless of
            medium.
          </p>
        </div>

        <div
          data-quote
          className="mt-40 pt-16 border-t border-black/10 max-w-3xl"
        >
          <blockquote className="font-display italic text-[#0a0a0c] text-[clamp(30px,4vw,60px)] leading-[1.15] tracking-[-0.015em]">
            <span className="block">
              {quote.split(' ').map((w, i) => (
                <span
                  key={`q1-${i}`}
                  data-quote-word
                  className="inline-block mr-[0.22em]"
                >
                  {w}
                </span>
              ))}
            </span>
            <span className="block mt-2">
              {quote2.split(' ').map((w, i) => (
                <span
                  key={`q2-${i}`}
                  data-quote-word
                  className="inline-block mr-[0.22em]"
                >
                  <span style={{ color: '#3b82f6' }}>{w}</span>
                </span>
              ))}
            </span>
          </blockquote>
          <p
            data-reveal
            className="mt-8 font-mono text-[11px] uppercase tracking-[0.22em] text-[#0a0a0c]/45"
          >
            — Synapse manifesto
          </p>
        </div>
      </div>
    </section>
  );
}
