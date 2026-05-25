'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { stats } from '@/lib/mockData';

type Stat = { label: string; value: string; sub: string; color: string };

const STATS: Stat[] = [
  { label: 'Indexed Vectors', value: '1,742', sub: '+128 today', color: '#6366f1' },
  { label: 'P50 Latency', value: `${stats.p50_ms}ms`, sub: `p99 · ${stats.p99_ms}ms`, color: '#38bdf8' },
  { label: 'Queries (24H)', value: '4,219', sub: '+12% vs yesterday', color: '#a78bfa' },
  { label: 'Storage', value: '12.4 GB', sub: '50M vec capacity', color: '#34d399' },
];

type Activity = {
  ts: string;
  kind: 'INGEST' | 'SEARCH' | 'INDEX';
  detail: string;
  color: string;
};

const ACTIVITY: Activity[] = [
  { ts: '12s', kind: 'SEARCH', detail: '"thunderstorm" · k=50 · 28ms', color: '#38bdf8' },
  { ts: '38s', kind: 'INDEX', detail: '12 vectors written to default', color: '#a78bfa' },
  { ts: '1m', kind: 'INGEST', detail: 'storm-poster.jpg · image · 41ms', color: '#34d399' },
  { ts: '2m', kind: 'SEARCH', detail: '"calm electronic music" · k=25 · 22ms', color: '#38bdf8' },
  { ts: '3m', kind: 'INGEST', detail: 'rain-loop.wav · audio · 64ms', color: '#34d399' },
  { ts: '5m', kind: 'SEARCH', detail: '"vintage cameras" · k=30 · mmr · 31ms', color: '#38bdf8' },
  { ts: '7m', kind: 'INDEX', detail: 'collection · default · compacted', color: '#a78bfa' },
];

function pickGreeting(h: number): string {
  if (h >= 5 && h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  if (h < 21) return 'Good Evening';
  return 'Good Night';
}

export default function DashboardOverview() {
  // Render placeholders on the server; fill in time-sensitive bits after mount
  // so SSR and client agree on first paint (no hydration mismatch).
  const [greeting, setGreeting] = useState('Welcome');
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    const now = new Date();
    setGreeting(pickGreeting(now.getHours()));
    setDateStr(
      now.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      }),
    );
  }, []);

  return (
    <div className="px-6 md:px-10 py-10 md:py-12 max-w-6xl mx-auto font-mono">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <span className="inline-block font-mono text-[10px] uppercase tracking-[0.22em] text-[#0a0a0c]/55">
            Workspace · Default
          </span>
          <h1 className="mt-3 font-mono text-[clamp(32px,3.6vw,48px)] leading-[1.15] tracking-normal uppercase">
            {greeting},
            <span className="text-[#2563eb] ml-2">Akshat</span>.
          </h1>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.22em] text-[#0a0a0c]/55">
            Here's what's happening
            {dateStr && (
              <>
                {' '}
                · {dateStr}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/upload"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-[#0a0a0c]/15 px-4 py-2.5 font-mono uppercase tracking-[0.18em] text-[11px] hover:border-[#0a0a0c]/40 transition-colors"
          >
            ↑ Upload
          </Link>
          <Link
            href="/dashboard/search"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563eb] text-white px-4 py-2.5 font-mono uppercase tracking-[0.18em] text-[11px] hover:bg-[#1d4ed8] transition-colors"
          >
            Run Search →
          </Link>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="relative rounded-xl border border-dashed bg-white/55 backdrop-blur-md px-4 py-4 transition-all duration-300 hover:bg-white/85 hover:shadow-[0_12px_32px_-14px_var(--accent)]"
            style={{
              borderColor: `${s.color}55`,
              ['--accent' as string]: s.color,
            }}
          >
            <span
              aria-hidden
              className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <div className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#0a0a0c]/55">
              {s.label}
            </div>
            <div className="mt-3 font-mono text-[clamp(22px,2.4vw,28px)] leading-none tracking-tight text-[#0a0a0c]">
              {s.value}
            </div>
            <div
              className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em]"
              style={{ color: s.color }}
            >
              {s.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Two-column */}
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-5">
        {/* Activity */}
        <section className="rounded-xl border border-[#0a0a0c]/10 bg-white/65 backdrop-blur-md p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-mono text-[13px] uppercase tracking-[0.22em]">
              Live activity
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#0a0a0c]/45">
              Last 10 Minutes
            </span>
          </div>
          <ul className="mt-5 divide-y divide-[#0a0a0c]/8">
            {ACTIVITY.map((a, i) => (
              <li key={i} className="py-3 flex items-center gap-4">
                <span
                  className="font-mono text-[9.5px] uppercase tracking-[0.22em] px-1.5 py-0.5 rounded shrink-0"
                  style={{ color: a.color, backgroundColor: `${a.color}1f` }}
                >
                  {a.kind}
                </span>
                <span className="flex-1 font-mono text-[11.5px] text-[#0a0a0c] truncate">
                  {a.detail}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#0a0a0c]/45 shrink-0">
                  {a.ts} ago
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* System card */}
        <section className="rounded-xl border border-[#0a0a0c]/10 bg-white/65 backdrop-blur-md p-5">
          <h2 className="font-mono text-[13px] uppercase tracking-[0.22em]">
            System
          </h2>
          <dl className="mt-5 space-y-3">
            {[
              ['encoder', 'imagebind / huge · ready'],
              ['vector index', 'qdrant · hnsw · int8'],
              ['workers', '4 / 4 online'],
              ['queue', '0 backlogged'],
              ['cache hit', '94.2%'],
              ['uptime', '4d 12h 38m'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-3">
                <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#0a0a0c]/55">
                  {k}
                </dt>
                <dd className="font-mono text-[11.5px] text-[#0a0a0c] text-right">
                  {v}
                </dd>
              </div>
            ))}
          </dl>
          <Link
            href="/dashboard/search"
            className="mt-6 inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#2563eb] hover:underline underline-offset-4"
          >
            Open Search →
          </Link>
        </section>
      </div>
    </div>
  );
}
