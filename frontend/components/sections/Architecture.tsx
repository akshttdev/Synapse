'use client';

import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import Daisy from '@/components/icons/Daisy';
import DaisyBurst from '@/components/DaisyBurst';
import { burstAt } from '@/lib/burst';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);
}

type Callout = {
  tag: string;
  specs?: Array<[string, string]>;
  code?: string;
};

type Step = {
  id: string;
  label: string;
  sub: string;
  left: string;
  top: string;
  side: 'left' | 'right';
  latency: string;
  color: string;
  callout: Callout;
};

const STEPS: Step[] = [
  {
    id: 'query',
    label: 'QUERY',
    sub: 'ANY INPUT',
    left: '55%',
    top: '7%',
    side: 'right',
    latency: '0.00s',
    color: '#94a3b8',
    callout: {
      tag: 'IMG · WAV · MP4 · TXT — ONE GATE',
      specs: [
        ['accepts', 'multipart / binary'],
        ['max size', '128 MB'],
        ['stream', 'true'],
      ],
    },
  },
  {
    id: 'embed',
    label: 'EMBED',
    sub: 'IMAGEBIND · 1024-D',
    left: '22%',
    top: '23%',
    side: 'right',
    latency: '0.04s',
    color: '#6366f1',
    callout: {
      tag: 'IMAGEBIND · 6 MODALITIES',
      specs: [
        ['model', 'ImageBind / huge'],
        ['dim', '1024'],
        ['norm', 'L2 · unit sphere'],
        ['batch', '32 · gpu'],
        ['p50', '38 ms'],
      ],
    },
  },
  {
    id: 'vector',
    label: 'VECTOR',
    sub: 'L2 · COSINE',
    left: '76%',
    top: '40%',
    side: 'left',
    latency: '0.05s',
    color: '#38bdf8',
    callout: {
      tag: 'COSINE ON UNIT SPHERE',
      specs: [
        ['metric', 'cosine'],
        ['dtype', 'int8'],
        ['compress', '0.25× ram'],
        ['ops/s', '12,000'],
      ],
    },
  },
  {
    id: 'index',
    label: 'INDEX',
    sub: 'QDRANT · HNSW · INT8',
    left: '26%',
    top: '58%',
    side: 'right',
    latency: '0.08s',
    color: '#a78bfa',
    callout: {
      tag: 'QDRANT · HNSW · INT8',
      specs: [
        ['ef', '128 search'],
        ['m', '16 layers'],
        ['shards', '4 nodes'],
      ],
      code: 'client.upsert(\n  collection,\n  points=batch,\n)',
    },
  },
  {
    id: 'rank',
    label: 'RANK',
    sub: 'TOP-K · K = 50',
    left: '72%',
    top: '76%',
    side: 'left',
    latency: '0.12s',
    color: '#f472b6',
    callout: {
      tag: 'TOP-K WITH FILTERS',
      specs: [
        ['k', '50'],
        ['filter', 'tag · modality'],
        ['rerank', 'mmr · λ = 0.3'],
      ],
      code: 'hits = client.search(\n  vec,\n  limit=50,\n)',
    },
  },
  {
    id: 'return',
    label: 'RETURN',
    sub: 'CROSS-MODAL RESULTS',
    left: '22%',
    top: '96%',
    side: 'right',
    latency: '0.18s',
    color: '#34d399',
    callout: {
      tag: 'CROSS-MODAL · JSON',
      specs: [
        ['payload', 'id · score · meta'],
        ['format', 'application/json'],
        ['stream', 'sse · chunked'],
      ],
    },
  },
];

// Drifting background labels — fill the empty space with quiet typographic texture
const DRIFT_LABELS: { text: string; left: string; top: string; size: number }[] = [
  { text: '1024-D', left: '8%', top: '11%', size: 11 },
  { text: 'L2 · NORMALIZED', left: '85%', top: '15%', size: 10 },
  { text: 'INT8 · QUANTIZED', left: '6%', top: '34%', size: 10 },
  { text: 'HNSW · M=16', left: '88%', top: '52%', size: 11 },
  { text: 'COSINE · 0.91', left: '4%', top: '67%', size: 11 },
  { text: 'TOP-K · 50', left: '90%', top: '70%', size: 10 },
  { text: '< 30MS · P50', left: '8%', top: '82%', size: 11 },
  { text: 'CROSS-MODAL', left: '85%', top: '88%', size: 10 },
];

function CalloutBody({ callout, color }: { callout: Callout; color: string }) {
  return (
    <div className="space-y-3">
      <div
        className="font-mono text-[9.5px] uppercase tracking-[0.22em] leading-[1.4]"
        style={{ color }}
      >
        {callout.tag}
      </div>
      {callout.specs && (
        <dl className="space-y-1.5">
          {callout.specs.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-3">
              <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#0a0a0c]/55">
                {k}
              </dt>
              <dd className="font-mono text-[11.5px] text-[#0a0a0c]">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {callout.code && (
        <pre className="font-mono text-[11px] leading-[1.55] text-[#0a0a0c]/85 whitespace-pre-wrap border-t border-[#0a0a0c]/10 pt-2.5">
          {callout.code}
        </pre>
      )}
    </div>
  );
}

function WaypointCard({
  step,
  index,
  sizeClass = 'w-[170px] h-[170px]',
}: {
  step: Step;
  index: number;
  sizeClass?: string;
}) {
  const stepNo = String(index + 1).padStart(2, '0');
  return (
    <div
      className={`group pointer-events-auto ${sizeClass}`}
      style={{ ['--accent' as string]: step.color }}
    >
      <div
        className="relative w-full h-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center bg-white/55 backdrop-blur-md transition-all duration-300 group-hover:bg-white/80 group-hover:backdrop-blur-xl group-hover:shadow-[0_8px_36px_-14px_var(--accent)]"
        style={{ borderColor: `${step.color}88` }}
      >
        <span
          className="absolute top-2.5 left-2.5 font-mono text-[9px] uppercase tracking-[0.2em] px-1.5 py-0.5 rounded"
          style={{
            color: step.color,
            backgroundColor: `${step.color}1f`,
          }}
        >
          {stepNo}
        </span>
        <span
          aria-hidden
          className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: step.color }}
        />
        <span className="font-display text-[22px] uppercase tracking-tight leading-none">
          {step.label}
        </span>
        <span className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.2em] text-[#0a0a0c]/55 px-3 text-center leading-relaxed">
          {step.sub}
        </span>
      </div>
    </div>
  );
}

function CalloutCard({ step }: { step: Step }) {
  return (
    <div
      className="group rounded-lg border border-dashed bg-white/65 backdrop-blur-md px-4 py-3.5 shadow-[0_8px_24px_-14px_rgba(0,0,0,0.12)] transition-all duration-300 hover:bg-white/85 hover:backdrop-blur-xl"
      style={{ borderColor: `${step.color}55` }}
    >
      <CalloutBody callout={step.callout} color={step.color} />
    </div>
  );
}

// --- Desktop row -----------------------------------------------------------

function StepRow({ step, index }: { step: Step; index: number }) {
  const calloutOnRight = step.side === 'right';
  const stepNo = String(index + 1).padStart(2, '0');
  const calloutLeft = `calc(${step.left} ${calloutOnRight ? '+' : '-'} 110px)`;
  const isInitial = step.id === 'query';

  return (
    <div
      className="absolute left-0 right-0 pointer-events-none"
      style={{ top: step.top }}
    >
      {/* Horizon rule — sits at the waypoint's Y, painted under the box */}
      <div
        data-arch-rule
        className="absolute left-6 right-6 h-px origin-center"
        style={{
          top: 0,
          transform: 'translateY(-50%)',
          backgroundColor: `${step.color}40`,
        }}
      />

      {/* Mono label on the side opposite the callout */}
      <span
        data-arch-label
        className={`absolute font-mono text-[10px] uppercase tracking-[0.22em] whitespace-nowrap bg-[#f6f5f0] px-2 ${
          calloutOnRight ? 'left-6' : 'right-6'
        }`}
        style={{
          top: 0,
          transform: 'translateY(-50%)',
          color: step.color,
        }}
      >
        {stepNo} · {step.latency} · {step.label}
      </span>

      {/* Waypoint */}
      <div
        data-waypoint
        {...(isInitial ? { 'data-initial': true } : {})}
        className="absolute z-10"
        style={{
          left: step.left,
          top: 0,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <WaypointCard step={step} index={index} />
      </div>

      {/* Callout */}
      <div
        data-arch-callout
        className="absolute w-[230px] z-10 pointer-events-auto"
        style={{
          left: calloutLeft,
          top: 0,
          transform: calloutOnRight
            ? 'translateY(-50%)'
            : 'translate(-100%, -50%)',
        }}
      >
        <CalloutCard step={step} />
      </div>
    </div>
  );
}

// --- L-shaped dotted connector (desktop only) ------------------------------

function Connector({ from, to }: { from: Step; to: Step }) {
  const goingRight = parseFloat(to.left) > parseFloat(from.left);
  // Vertical leg color fades from `from` color, horizontal leg uses `to` color
  return (
    <>
      {/* Vertical segment: bottom of `from` → top of `to`'s row */}
      <div
        data-arch-connector
        className="absolute z-[5] pointer-events-none origin-top"
        style={{
          left: from.left,
          top: `calc(${from.top} + 85px)`,
          height: `calc(${to.top} - ${from.top} - 170px)`,
          width: 0,
          borderLeft: `1.5px dashed ${from.color}aa`,
          transform: 'translateX(-0.75px)',
        }}
      />
      {/* Horizontal segment: across to `to`'s X at top of `to` */}
      <div
        data-arch-connector
        className={`absolute z-[5] pointer-events-none ${
          goingRight ? 'origin-left' : 'origin-right'
        }`}
        style={{
          top: `calc(${to.top} - 85px)`,
          left: goingRight ? from.left : to.left,
          width: goingRight
            ? `calc(${to.left} - ${from.left})`
            : `calc(${from.left} - ${to.left})`,
          height: 0,
          borderTop: `1.5px dashed ${to.color}aa`,
          transform: 'translateY(-0.75px)',
        }}
      />
      {/* Corner dot */}
      <div
        className="absolute z-[6] pointer-events-none w-1.5 h-1.5 rounded-full"
        style={{
          left: from.left,
          top: `calc(${to.top} - 85px)`,
          transform: 'translate(-50%, -50%)',
          backgroundColor: to.color,
        }}
      />
    </>
  );
}

// --- Mobile column ---------------------------------------------------------

function MobileStep({ step, index, isLast }: { step: Step; index: number; isLast: boolean }) {
  const stepNo = String(index + 1).padStart(2, '0');
  return (
    <div className="relative flex flex-col items-center gap-4">
      {/* Top mono label */}
      <span
        className="font-mono text-[10px] uppercase tracking-[0.22em]"
        style={{ color: step.color }}
      >
        {stepNo} · {step.latency} · {step.label}
      </span>
      <WaypointCard
        step={step}
        index={index}
        sizeClass="w-full max-w-[300px] h-[220px]"
      />
      <div className="w-full max-w-[300px]">
        <CalloutCard step={step} />
      </div>
      {/* Vertical dotted connector down to next step */}
      {!isLast && (
        <div
          aria-hidden
          className="w-0 h-10"
          style={{ borderLeft: `1.5px dashed ${step.color}aa` }}
        />
      )}
    </div>
  );
}

export default function Architecture() {
  const sectionRef = useRef<HTMLElement>(null);
  const daisyRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    const isDesktop = matchMedia('(min-width: 768px)').matches;
    if (!isDesktop) return; // mobile uses static stacked layout

    const ctx = gsap.context(() => {
      const daisy = daisyRef.current;
      if (!daisy) return;

      const daisyRect = daisy.getBoundingClientRect();
      const targets = gsap.utils.toArray<HTMLElement>(
        '[data-waypoint]:not([data-initial])',
      );
      const points = targets.map((el) => {
        const r = el.getBoundingClientRect();
        return {
          x: r.left + r.width / 2 - (daisyRect.left + daisyRect.width / 2),
          y: r.top + r.height / 2 - (daisyRect.top + daisyRect.height / 2),
        };
      });

      gsap.to(daisy, {
        ease: 'none',
        rotation: 720,
        motionPath: { path: points, curviness: 1.5 },
        scrollTrigger: {
          trigger: '[data-initial]',
          start: 'top 60%',
          endTrigger: '[data-final]',
          end: 'top 40%',
          scrub: 1,
        },
      });

      targets.forEach((el) => {
        gsap.from(el, {
          opacity: 0.2,
          scale: 0.9,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            end: 'top 55%',
            scrub: 1,
          },
        });
      });

      gsap.utils.toArray<HTMLElement>('[data-arch-rule]').forEach((el) => {
        gsap.from(el, {
          scaleX: 0,
          duration: 0.9,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        });
      });

      gsap.utils.toArray<HTMLElement>('[data-arch-callout]').forEach((el) => {
        const fromRight = el.style.transform.includes('-100%');
        gsap.from(el, {
          opacity: 0,
          x: fromRight ? 18 : -18,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        });
      });

      gsap.utils.toArray<HTMLElement>('[data-arch-label]').forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        });
      });

      // Burst petals from each waypoint as the traveling daisy "lands" on it.
      // Skip the initial QUERY card — it's the seed, not an arrival.
      const burstTargets = gsap.utils.toArray<HTMLElement>(
        '[data-waypoint]:not([data-initial])',
      );
      burstTargets.forEach((el, idx) => {
        // The last two (RANK, RETURN) felt early — push their trigger later.
        const isLastTwo = idx >= burstTargets.length - 2;
        const start = isLastTwo ? 'center 40%' : 'center 55%';
        const fire = () => {
          const r = el.getBoundingClientRect();
          burstAt(r.left + r.width / 2, r.top + r.height / 2);
        };
        ScrollTrigger.create({
          trigger: el,
          start,
          onEnter: fire,
          onEnterBack: fire,
        });
      });

      gsap.utils.toArray<HTMLElement>('[data-arch-connector]').forEach((el) => {
        gsap.from(el, {
          scaleX: 0,
          scaleY: 0,
          duration: 0.9,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 90%',
            toggleActions: 'play none none reverse',
          },
        });
      });

      gsap.from('[data-arch-reveal]', {
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
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      id="architecture"
      ref={sectionRef}
      className="relative bg-[#f6f5f0] text-[#0a0a0c] border-t border-black/5 overflow-hidden"
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
      {/* Soft blue accent halo behind the flowchart */}
      <div
        aria-hidden
        className="absolute left-1/2 top-[55%] -translate-x-1/2 -translate-y-1/2 w-[1100px] h-[800px] rounded-full pointer-events-none opacity-50"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at center, rgba(37,99,235,0.08), transparent 70%)',
          filter: 'blur(80px)',
        }}
      />
      {/* Tiny accent ovals — quiet color whispers in the bg, 5-10% opacity */}
      <div
        aria-hidden
        className="absolute pointer-events-none w-[180px] h-[110px] rounded-full"
        style={{
          left: '12%',
          top: '18%',
          backgroundImage:
            'radial-gradient(ellipse at center, rgba(99,102,241,0.10), transparent 65%)',
          filter: 'blur(28px)',
        }}
      />
      <div
        aria-hidden
        className="absolute pointer-events-none w-[160px] h-[90px] rounded-full"
        style={{
          right: '14%',
          top: '32%',
          backgroundImage:
            'radial-gradient(ellipse at center, rgba(56,189,248,0.09), transparent 65%)',
          filter: 'blur(26px)',
        }}
      />
      <div
        aria-hidden
        className="absolute pointer-events-none w-[200px] h-[120px] rounded-full"
        style={{
          left: '18%',
          top: '62%',
          backgroundImage:
            'radial-gradient(ellipse at center, rgba(167,139,250,0.08), transparent 65%)',
          filter: 'blur(32px)',
        }}
      />
      <div
        aria-hidden
        className="absolute pointer-events-none w-[170px] h-[100px] rounded-full"
        style={{
          right: '16%',
          top: '78%',
          backgroundImage:
            'radial-gradient(ellipse at center, rgba(244,114,182,0.08), transparent 65%)',
          filter: 'blur(28px)',
        }}
      />
      <div
        aria-hidden
        className="absolute pointer-events-none w-[190px] h-[110px] rounded-full"
        style={{
          left: '46%',
          top: '88%',
          transform: 'translateX(-50%)',
          backgroundImage:
            'radial-gradient(ellipse at center, rgba(52,211,153,0.08), transparent 65%)',
          filter: 'blur(30px)',
        }}
      />

      {/* Ambient flowers around the section header */}
      <div className="hidden md:block">
        <DaisyBurst
          size={44}
          className="absolute z-0 left-[8%] top-[15%]"
          style={{ transform: 'rotate(-16deg)' }}
        />
        <DaisyBurst
          size={36}
          className="absolute z-0 right-[10%] top-[10%]"
          style={{ transform: 'rotate(20deg)' }}
        />
        <DaisyBurst
          size={52}
          className="absolute z-0 left-[14%] top-[40%]"
          style={{ transform: 'rotate(8deg)' }}
        />
        <DaisyBurst
          size={40}
          className="absolute z-0 right-[12%] top-[42%]"
          style={{ transform: 'rotate(-22deg)' }}
        />
      </div>
      <div className="md:hidden">
        <DaisyBurst
          size={32}
          className="absolute z-0 left-3 top-[12%]"
          style={{ transform: 'rotate(-14deg)' }}
        />
        <DaisyBurst
          size={28}
          className="absolute z-0 right-3 top-[8%]"
          style={{ transform: 'rotate(18deg)' }}
        />
      </div>

      {/* Section header */}
      <div className="relative z-10 px-6 pt-32 md:pt-40 pb-20 max-w-3xl mx-auto text-center">
        <span
          data-arch-reveal
          className="inline-block font-mono text-[11px] uppercase tracking-[0.22em] text-[#0a0a0c]/55"
        >
          03 · Architecture
        </span>
        <h2
          data-arch-reveal
          className="mt-6 font-display text-[clamp(40px,5.5vw,80px)] leading-[1.05] tracking-[-0.02em] uppercase"
        >
          One{' '}
          <em className="not-italic text-[#2563eb] italic">Vector</em> Goes In.
          <br />
          Four{' '}
          <em className="not-italic text-[#2563eb] italic">Modalities</em> Come
          Back.
        </h2>
        <p
          data-arch-reveal
          className="mt-8 font-mono uppercase tracking-[0.22em] text-[clamp(10.5px,0.85vw,12.5px)] leading-[1.85] text-[#0a0a0c]/60 max-w-xl mx-auto"
        >
          Image · Audio · Video · Text · Ranked By Semantic Distance
        </p>
      </div>

      {/* --- DESKTOP: scroll-driven flowchart --- */}
      <div className="hidden md:block relative h-[300vh] px-6">
        {/* Drift labels — quiet typographic texture in the bg */}
        {DRIFT_LABELS.map((d, i) => (
          <span
            key={i}
            aria-hidden
            className="absolute z-0 font-mono uppercase tracking-[0.28em] text-[#0a0a0c]/22 whitespace-nowrap pointer-events-none select-none"
            style={{
              left: d.left,
              top: d.top,
              transform: 'translate(-50%, -50%)',
              fontSize: d.size,
            }}
          >
            {d.text}
          </span>
        ))}

        {/* L-shaped dotted connectors between consecutive steps */}
        {STEPS.slice(0, -1).map((from, i) => (
          <Connector key={`${from.id}->${STEPS[i + 1].id}`} from={from} to={STEPS[i + 1]} />
        ))}

        {/* Traveling daisy — z-0 so all cards paint above it */}
        <div
          ref={daisyRef}
          className="absolute z-0 pointer-events-none"
          style={{
            left: STEPS[0].left,
            top: STEPS[0].top,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <Daisy size={68} />
        </div>

        {/* Ambient DaisyBursts — side margins + center fill */}
        <DaisyBurst size={42} className="absolute z-0 left-3 md:left-8" style={{ top: '14%', transform: 'rotate(-12deg)' }} />
        <DaisyBurst size={34} className="absolute z-0 right-4 md:right-10" style={{ top: '30%', transform: 'rotate(18deg)' }} />
        <DaisyBurst size={50} className="absolute z-0 left-2 md:left-6" style={{ top: '50%', transform: 'rotate(9deg)' }} />
        <DaisyBurst size={38} className="absolute z-0 right-3 md:right-8" style={{ top: '68%', transform: 'rotate(-16deg)' }} />
        <DaisyBurst size={44} className="absolute z-0 left-4 md:left-12" style={{ top: '85%', transform: 'rotate(22deg)' }} />
        {/* Center fill */}
        <DaisyBurst size={32} className="absolute z-0" style={{ left: '48%', top: '17%', transform: 'translate(-50%, -50%) rotate(-22deg)' }} />
        <DaisyBurst size={36} className="absolute z-0" style={{ left: '50%', top: '49%', transform: 'translate(-50%, -50%) rotate(14deg)' }} />
        <DaisyBurst size={30} className="absolute z-0" style={{ left: '46%', top: '82%', transform: 'translate(-50%, -50%) rotate(-8deg)' }} />

        {STEPS.map((step, i) => (
          <StepRow key={step.id} step={step} index={i} />
        ))}
      </div>

      {/* --- MOBILE: vertical stacked timeline --- */}
      <div className="md:hidden relative px-5 pb-24">
        {/* Ambient flowers in margins */}
        <DaisyBurst size={32} className="absolute z-0 left-1 top-[8%]" style={{ transform: 'rotate(-14deg)' }} />
        <DaisyBurst size={28} className="absolute z-0 right-2 top-[28%]" style={{ transform: 'rotate(16deg)' }} />
        <DaisyBurst size={34} className="absolute z-0 left-2 top-[52%]" style={{ transform: 'rotate(8deg)' }} />
        <DaisyBurst size={26} className="absolute z-0 right-1 top-[72%]" style={{ transform: 'rotate(-18deg)' }} />

        <div className="relative z-10 flex flex-col items-center gap-0">
          {STEPS.map((step, i) => (
            <MobileStep
              key={step.id}
              step={step}
              index={i}
              isLast={i === STEPS.length - 1}
            />
          ))}
        </div>
      </div>

      {/* Final marker — ScrollTrigger anchors `end` here */}
      <div data-final className="h-[10vh]" />
    </section>
  );
}
