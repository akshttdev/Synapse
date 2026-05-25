'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import DaisyBurst from '@/components/DaisyBurst';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

type QA = { q: string; a: string };

const QUESTIONS: QA[] = [
  {
    q: 'WHAT MODALITIES DOES SYNAPSE SUPPORT?',
    a: 'Image, audio, video, and text — all projected into the same 1024-dimensional embedding space. Query with any modality, retrieve any other.',
  },
  {
    q: 'WHICH EMBEDDING MODEL POWERS THE INDEX?',
    a: 'ImageBind by default. Vectors are L2-normalized to a unit sphere, then compared with cosine distance. You can swap models per workspace if you need a different latent geometry.',
  },
  {
    q: 'HOW FAST IS A QUERY?',
    a: 'P50 lands around 30ms on a million-vector index thanks to Qdrant HNSW with int8 quantization. P99 stays under 90ms even with metadata filters layered on top.',
  },
  {
    q: 'CAN I SELF-HOST IT?',
    a: 'Yes. Synapse ships as a docker-compose stack — FastAPI backend, Celery workers, Qdrant, Redis, Postgres. Bring your own GPU box for the embedding workers and you are good.',
  },
  {
    q: 'HOW MUCH DATA CAN I INDEX?',
    a: 'Tested to 50M vectors per collection on a single Qdrant node with int8 quantization. Shard across nodes for larger workloads — the query API stays the same.',
  },
  {
    q: 'WHAT ABOUT PRIVACY AND DATA OWNERSHIP?',
    a: 'You own the index. Raw assets stay in your object storage; only the vectors and lightweight metadata live in Synapse. Nothing leaves your infra unless you wire up an external embedding API.',
  },
];

export default function FAQ() {
  const sectionRef = useRef<HTMLElement>(null);
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('[data-faq-reveal]', {
        y: 30,
        opacity: 0,
        duration: 0.85,
        stagger: 0.08,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 75%',
          once: true,
        },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      id="faq"
      ref={sectionRef}
      className="relative bg-[#f6f5f0] text-[#0a0a0c] border-t border-black/5 py-32 md:py-40 px-6 overflow-hidden"
    >
      {/* Subtle dot grid */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.35]"
        style={{
          backgroundImage:
            'radial-gradient(rgba(10,10,12,0.07) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Ambient DaisyBursts in the side margins.
          Pixel-anchored from the top so their visual position never shifts
          when an accordion item expands/collapses the section's height. */}
      <DaisyBurst
        size={46}
        className="absolute z-0 left-4 md:left-12"
        style={{ top: '180px', transform: 'rotate(-14deg)' }}
      />
      <DaisyBurst
        size={34}
        className="absolute z-0 right-3 md:right-10"
        style={{ top: '320px', transform: 'rotate(18deg)' }}
      />
      <DaisyBurst
        size={52}
        className="absolute z-0 left-3 md:left-8"
        style={{ top: '560px', transform: 'rotate(8deg)' }}
      />
      <DaisyBurst
        size={38}
        className="absolute z-0 right-4 md:right-14"
        style={{ top: '740px', transform: 'rotate(-22deg)' }}
      />
      <DaisyBurst
        size={42}
        className="absolute z-0 left-6 md:left-20"
        style={{ top: '920px', transform: 'rotate(12deg)' }}
      />

      <div className="relative z-10 max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <span
            data-faq-reveal
            className="inline-block font-mono text-[11px] uppercase tracking-[0.22em] text-[#0a0a0c]/55"
          >
            04 · FAQ
          </span>
          <h2
            data-faq-reveal
            className="mt-6 font-display text-[clamp(40px,5.5vw,80px)] leading-[1.05] tracking-[-0.02em] uppercase"
          >
            Questions{' '}
            <em className="not-italic text-[#2563eb] italic">Worth</em> Asking.
          </h2>
          <p
            data-faq-reveal
            className="mt-8 font-mono uppercase tracking-[0.22em] text-[clamp(10.5px,0.85vw,12.5px)] leading-[1.85] text-[#0a0a0c]/60 max-w-xl mx-auto"
          >
            The Things People Ask · Before They Wire Synapse Into Production
          </p>
        </div>

        {/* List */}
        <ul
          data-faq-reveal
          className="divide-y divide-[#0a0a0c]/12 border-y border-[#0a0a0c]/12"
        >
          {QUESTIONS.map((item, i) => {
            const open = openIdx === i;
            return (
              <li key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpenIdx(open ? null : i)}
                  className="w-full flex items-start justify-between gap-6 py-6 text-left cursor-pointer group"
                  aria-expanded={open}
                >
                  <span className="font-mono text-[clamp(12px,1vw,14px)] uppercase tracking-[0.16em] leading-[1.45] text-[#0a0a0c] group-hover:text-[#2563eb] transition-colors duration-200">
                    {item.q}
                  </span>
                  <span
                    aria-hidden
                    className={`shrink-0 mt-1 font-mono text-[18px] leading-none text-[#0a0a0c]/45 transition-transform duration-300 ${
                      open ? 'rotate-45' : 'rotate-0'
                    }`}
                  >
                    +
                  </span>
                </button>
                <div
                  className="grid transition-[grid-template-rows] duration-400 ease-out"
                  style={{
                    gridTemplateRows: open ? '1fr' : '0fr',
                  }}
                >
                  <div className="overflow-hidden">
                    <p className="pb-7 pr-12 font-mono text-[12px] leading-[1.75] text-[#0a0a0c]/75 normal-case tracking-normal">
                      {item.a}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Footnote */}
        <p
          data-faq-reveal
          className="mt-10 font-mono text-[10.5px] uppercase tracking-[0.22em] text-center text-[#0a0a0c]/45"
        >
          Still curious?{' '}
          <a
            href="#contact"
            className="text-[#2563eb] hover:underline underline-offset-4"
          >
            Ping the team →
          </a>
        </p>
      </div>
    </section>
  );
}
