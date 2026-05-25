'use client';

import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import DaisyBurst from '@/components/DaisyBurst';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

type DocCard = {
  no: string;
  title: string;
  tag: string;
  blurb: string;
  topics: string[];
  meta: Array<[string, string]>;
  color: string;
  href: string;
};

const GH = 'https://github.com/akshttdev/synapse/blob/main/docs/handbook';

const CARDS: DocCard[] = [
  {
    no: '01',
    title: 'QUICKSTART',
    tag: 'GET RUNNING IN 60 SECONDS',
    blurb:
      'Clone, docker compose up, point your data at the ingest endpoint, query in any modality. CPU fallback works out of the box — GPU optional.',
    topics: ['INSTALL', 'INGEST', 'FIRST QUERY', 'HEALTH CHECK'],
    meta: [
      ['stack', 'docker · compose'],
      ['time', '~60s'],
      ['prereqs', 'docker only'],
      ['gpu', 'optional'],
    ],
    color: '#34d399',
    href: `${GH}/quickstart.md`,
  },
  {
    no: '02',
    title: 'API REFERENCE',
    tag: 'EVERY ENDPOINT · EVERY KNOB',
    blurb:
      'Ingest, search, filter, paginate, stream. REST + Server-Sent Events. Typed schemas in every language via the OpenAPI 3.1 spec at /v1/openapi.json.',
    topics: ['INGEST', 'SEARCH', 'COLLECTIONS', 'STREAM', 'AUTH'],
    meta: [
      ['routes', '14'],
      ['format', 'openapi 3.1'],
      ['auth', 'bearer · optional'],
      ['stream', 'sse · chunked'],
    ],
    color: '#60a5fa',
    href: `${GH}/api-reference.md`,
  },
  {
    no: '03',
    title: 'DEPLOY GUIDE',
    tag: 'SELF-HOST · CLOUD · HYBRID',
    blurb:
      'Single-node, sharded, or cloud. Production checklist for backups, scaling, observability, TLS, rate limits. Terraform refs for AWS + GCP.',
    topics: ['DOCKER', 'KUBERNETES', 'BACKUPS', 'METRICS', 'TLS'],
    meta: [
      ['targets', 'aws · gcp · bare'],
      ['scale', '50M vec / shard'],
      ['ram', '~12 GB · int8'],
      ['ha', 'multi-node'],
    ],
    color: '#a78bfa',
    href: `${GH}/deploy.md`,
  },
  {
    no: '04',
    title: 'COOKBOOK',
    tag: 'RECIPES · PATTERNS · GOTCHAS',
    blurb:
      'Reverse image search, hybrid vector + metadata, streaming ingest, MMR reranking. Plus the gotchas — HEIC, long audio, quantization tradeoffs.',
    topics: ['REVERSE SEARCH', 'HYBRID', 'STREAMING', 'MMR', 'GOTCHAS'],
    meta: [
      ['recipes', '12'],
      ['updated', 'weekly'],
      ['languages', 'py · ts · go'],
      ['chunking', 'auto'],
    ],
    color: '#f472b6',
    href: `${GH}/cookbook.md`,
  },
];

function Card({ c }: { c: DocCard }) {
  return (
    <a
      data-docs-card
      href={c.href}
      target="_blank"
      rel="noreferrer"
      className="group relative block rounded-xl border border-dashed bg-white/55 backdrop-blur-md p-6 md:p-7 shadow-[0_8px_24px_-14px_rgba(0,0,0,0.12)] transition-all duration-300 hover:bg-white/85 hover:backdrop-blur-xl hover:shadow-[0_14px_40px_-14px_var(--accent)] cursor-pointer"
      style={{
        borderColor: `${c.color}55`,
        ['--accent' as string]: c.color,
      }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span
          className="font-mono text-[9.5px] uppercase tracking-[0.22em] px-1.5 py-0.5 rounded"
          style={{ color: c.color, backgroundColor: `${c.color}1f` }}
        >
          {c.no}
        </span>
        <span
          aria-hidden
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: c.color }}
        />
      </div>
      <h3 className="mt-7 font-display text-[clamp(28px,2.6vw,34px)] uppercase tracking-tight leading-[1.02] text-[#0a0a0c]">
        {c.title}
      </h3>
      <div
        className="mt-2.5 font-mono text-[9.5px] uppercase tracking-[0.22em]"
        style={{ color: c.color }}
      >
        {c.tag}
      </div>
      <p className="mt-6 font-mono text-[12px] leading-[1.7] text-[#0a0a0c]/70 min-h-[80px]">
        {c.blurb}
      </p>
      <div className="mt-5 flex flex-wrap gap-1.5">
        {c.topics.map((t) => (
          <span
            key={t}
            className="font-mono text-[9px] uppercase tracking-[0.16em] px-2 py-1 rounded-full border border-[#0a0a0c]/15 text-[#0a0a0c]/65"
          >
            {t}
          </span>
        ))}
      </div>
      <dl className="mt-6 grid grid-cols-2 gap-y-2 gap-x-5 pt-5 border-t border-[#0a0a0c]/10">
        {c.meta.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-2">
            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#0a0a0c]/55">
              {k}
            </dt>
            <dd className="font-mono text-[11px] text-[#0a0a0c]">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-7 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-[#0a0a0c]/45">
        <span>Read On GitHub</span>
        <span
          aria-hidden
          className="font-mono text-[14px] transition-all duration-300 group-hover:text-[#0a0a0c] group-hover:translate-x-1"
        >
          →
        </span>
      </div>
    </a>
  );
}

export default function Docs() {
  const sectionRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('[data-docs-reveal]', {
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
      // Slide cards in from below as the grid enters view. Keep opacity at 1
      // throughout — if ScrollTrigger fires late (Lenis sync / HMR), cards
      // still render visible instead of getting stranded at opacity:0.
      gsap.from('[data-docs-card]', {
        y: 40,
        duration: 0.85,
        stagger: 0.08,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '[data-docs-grid]',
          start: 'top 90%',
          once: true,
        },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  // Split into two columns for the staggered desktop layout.
  const leftCards = [CARDS[0], CARDS[2]];   // QUICKSTART, DEPLOY GUIDE
  const rightCards = [CARDS[1], CARDS[3]];  // API REFERENCE, COOKBOOK

  return (
    <section
      id="docs"
      ref={sectionRef}
      className="relative bg-[#f6f5f0] text-[#0a0a0c] pt-44 md:pt-56 pb-32 md:pb-40 px-6 border-t border-black/5 overflow-hidden"
    >
      {/* Subtle dot grid background */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.5]"
        style={{
          backgroundImage:
            'radial-gradient(rgba(10,10,12,0.07) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      {/* Soft accent halo */}
      <div
        aria-hidden
        className="absolute right-[8%] top-[20%] w-[700px] h-[500px] rounded-full pointer-events-none opacity-50"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at center, rgba(167,139,250,0.10), transparent 65%)',
          filter: 'blur(80px)',
        }}
      />

      {/* Ambient flowers */}
      <DaisyBurst
        size={46}
        className="absolute z-0 left-[8%] top-[14%]"
        style={{ transform: 'rotate(-14deg)' }}
      />
      <DaisyBurst
        size={36}
        className="absolute z-0 right-[10%] top-[11%]"
        style={{ transform: 'rotate(18deg)' }}
      />
      <DaisyBurst
        size={50}
        className="absolute z-0 left-[4%] top-[58%]"
        style={{ transform: 'rotate(9deg)' }}
      />
      <DaisyBurst
        size={40}
        className="absolute z-0 right-[5%] top-[66%]"
        style={{ transform: 'rotate(-22deg)' }}
      />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <span
            data-docs-reveal
            className="inline-block font-mono text-[11px] uppercase tracking-[0.22em] text-[#0a0a0c]/55"
          >
            04 · Docs
          </span>
          <h2
            data-docs-reveal
            className="mt-6 font-display text-[clamp(40px,5.5vw,80px)] leading-[1.05] tracking-[-0.02em] uppercase"
          >
            Read The{' '}
            <em className="not-italic italic text-[#2563eb]">Handbook</em>.
          </h2>
          <p
            data-docs-reveal
            className="mt-8 font-mono uppercase tracking-[0.22em] text-[clamp(10.5px,0.85vw,12.5px)] leading-[1.85] text-[#0a0a0c]/60 max-w-xl mx-auto"
          >
            Quickstart · API Reference · Deploy Guide · Cookbook For Multimodal
            Search Pipelines
          </p>
        </div>

        {/* Staggered two-column grid: right column offset down a bit */}
        <div
          data-docs-grid
          className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6"
        >
          <div className="flex flex-col gap-5 md:gap-6">
            {leftCards.map((c) => (
              <Card key={c.no} c={c} />
            ))}
          </div>
          <div className="flex flex-col gap-5 md:gap-6 md:mt-24">
            {rightCards.map((c) => (
              <Card key={c.no} c={c} />
            ))}
          </div>
        </div>

        {/* Footnote */}
        <p
          data-docs-reveal
          className="mt-28 font-mono text-[10.5px] uppercase tracking-[0.22em] text-center text-[#0a0a0c]/45"
        >
          Handbook Lives On GitHub ·{' '}
          <a
            href="https://github.com/akshttdev/synapse/tree/main/docs/handbook"
            target="_blank"
            rel="noreferrer"
            className="text-[#2563eb] hover:underline underline-offset-4"
          >
            Browse All Pages →
          </a>
        </p>
      </div>
    </section>
  );
}
