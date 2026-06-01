'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  modalityColors,
  type Modality,
  type ResultCardData,
} from '@/lib/mockData';
import { searchSynapse } from '@/lib/api';

type FilterKey = 'all' | Modality;
type SortKey = 'score' | 'recent';
type InputMode = 'text' | 'image' | 'audio' | 'video';

const ACCEPT: Record<Exclude<InputMode, 'text'>, string> = {
  image: 'image/*',
  audio: 'audio/*',
  video: 'video/*',
};

const MODE_LABEL: Record<InputMode, string> = {
  text: 'Text',
  image: 'Image',
  audio: 'Audio',
  video: 'Video',
};

const MODE_PLACEHOLDER: Record<Exclude<InputMode, 'text'>, string> = {
  image: 'Drop an image or click to pick · jpg · png · webp',
  audio: 'Drop an audio clip or click to pick · wav · mp3 · m4a',
  video: 'Drop a video or click to pick · mp4 · mov · webm',
};

export default function DashboardSearch() {
  const [mode, setMode] = useState<InputMode>('text');
  const [query, setQuery] = useState('thunderstorm');
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [k, setK] = useState(40);
  const [sort, setSort] = useState<SortKey>('score');

  const [results, setResults] = useState<ResultCardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  // Object URL for the image/video preview chip (revoked on change/unmount)
  const previewUrl = useMemo(() => {
    if (!file || mode === 'text' || mode === 'audio') return null;
    return URL.createObjectURL(file);
  }, [file, mode]);
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handlePickFile = (next: File | null) => {
    if (!next) return setFile(null);
    if (mode === 'text') return;
    if (!next.type.startsWith(`${mode}/`)) return; // wrong type for this mode
    setFile(next);
  };

  const switchMode = (m: InputMode) => {
    setMode(m);
    setFile(null);
  };

  // --- the live search call ---------------------------------------------
  const run = useCallback(
    async () => {
      if (mode === 'text' && !query.trim()) return;
      if (mode !== 'text' && !file) return;
      setLoading(true);
      setError(null);
      try {
        // Always fetch a balanced cross-modal pool; the modality pills filter
        // it CLIENT-SIDE, so switching modality is instant (no re-query).
        const out = await searchSynapse({ mode, query, file, topK: k, modality: 'all' });
        setResults(out.results);
        setLatencyMs(out.latencyMs);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Search failed');
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [mode, query, file, k],
  );

  // Run a default query on first load so the page isn't empty.
  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const queryLabel =
    mode === 'text'
      ? `"${query || '…'}"`
      : file
        ? file.name
        : `(${mode} not selected)`;

  const sorted = useMemo(() => {
    const base = filter === 'all' ? results : results.filter((r) => r.modality === filter);
    if (sort === 'score') return [...base].sort((a, b) => b.score - a.score);
    return base; // backend order ≈ recency for our purposes
  }, [results, sort, filter]);

  const breakdown = useMemo(() => {
    const counts: Record<Modality, number> = { image: 0, audio: 0, video: 0, text: 0 };
    results.forEach((r) => (counts[r.modality] += 1));
    return counts;
  }, [results]);

  // Lazy-load result cards in batches as the user scrolls.
  const BATCH = 8;
  const [visibleCount, setVisibleCount] = useState(BATCH);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleCount(BATCH);
  }, [sorted]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    if (visibleCount >= sorted.length) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((c) => Math.min(c + BATCH, sorted.length));
        }
      },
      { rootMargin: '300px 0px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [visibleCount, sorted.length]);

  const visible = sorted.slice(0, visibleCount);
  const hasMore = visibleCount < sorted.length;

  return (
    <div className="px-6 md:px-10 py-8 md:py-10 font-mono">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
        <div>
          <span className="inline-block font-mono text-[10px] uppercase tracking-[0.22em] text-[#0a0a0c]/55">
            Workspace · Default
          </span>
          <h1 className="mt-2 font-mono text-[clamp(22px,2.4vw,28px)] leading-[1.15] tracking-[0.06em] uppercase">
            Search
          </h1>
        </div>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#0a0a0c]/45 max-w-md text-right truncate">
          k = {k} · {mode} input · {queryLabel}
        </span>
      </div>

      <div className="rounded-xl border border-[#0a0a0c]/12 bg-white shadow-[0_8px_28px_-14px_rgba(0,0,0,0.18)] overflow-hidden">
        {/* Mode tabs */}
        <div className="flex items-center gap-1 px-3 pt-3 border-b border-[#0a0a0c]/8">
          {(['text', 'image', 'audio', 'video'] as const).map((m) => {
            const active = mode === m;
            const color = m === 'text' ? '#0a0a0c' : modalityColors[m];
            return (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`inline-flex items-center gap-1.5 rounded-t-md px-3 py-2 font-mono text-[10.5px] uppercase tracking-[0.18em] border-b-2 -mb-px transition-colors ${
                  active
                    ? 'text-[#0a0a0c] bg-[#f6f5f0]/60'
                    : 'text-[#0a0a0c]/55 border-transparent hover:text-[#0a0a0c]'
                }`}
                style={active ? { borderColor: color } : undefined}
              >
                {m !== 'text' && (
                  <span
                    aria-hidden
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                )}
                {MODE_LABEL[m]}
              </button>
            );
          })}
        </div>

        {/* Input row — text input OR file dropzone */}
        {mode === 'text' ? (
          <div className="flex items-center gap-3 pl-5 pr-1.5 py-1.5" suppressHydrationWarning>
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
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') run();
              }}
              placeholder="text query · e.g. thunderstorm at night"
              className="flex-1 font-mono text-[14px] leading-none bg-transparent outline-none placeholder:text-[#0a0a0c]/35"
            />
            <button
              type="button"
              onClick={() => run()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563eb] text-white px-5 py-3 text-[12px] font-mono uppercase tracking-[0.18em] hover:bg-[#1d4ed8] transition-colors disabled:opacity-50"
            >
              {loading ? 'Running…' : 'Run →'}
            </button>
          </div>
        ) : (
          <div
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files[0]) handlePickFile(e.dataTransfer.files[0]);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            suppressHydrationWarning
            className={`flex items-center gap-3 pl-5 pr-1.5 py-3 transition-colors ${
              dragOver ? 'bg-[#2563eb]/[0.05]' : ''
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="sr-only"
              accept={ACCEPT[mode]}
              onChange={(e) => handlePickFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div className="flex-1 flex items-center gap-3 min-w-0">
                {previewUrl && mode === 'image' && (
                  <img
                    src={previewUrl}
                    alt=""
                    className="w-10 h-10 rounded object-cover border border-[#0a0a0c]/10 shrink-0"
                  />
                )}
                {previewUrl && mode === 'video' && (
                  <video
                    src={previewUrl}
                    className="w-10 h-10 rounded object-cover border border-[#0a0a0c]/10 shrink-0"
                    muted
                  />
                )}
                {mode === 'audio' && (
                  <div
                    className="w-10 h-10 rounded grid place-items-center shrink-0"
                    style={{ backgroundColor: `${modalityColors.audio}22` }}
                  >
                    <span style={{ color: modalityColors.audio }}>♪</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-[12px] text-[#0a0a0c] truncate">
                    {file.name}
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#0a0a0c]/45">
                    {(file.size / 1024).toFixed(1)} KB · {mode}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#0a0a0c]/55 hover:text-[#0a0a0c] px-2 py-1 border border-[#0a0a0c]/15 rounded hover:border-[#0a0a0c]/40 transition-colors"
                  aria-label="Clear file"
                >
                  Clear ✕
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 text-left font-mono text-[13px] text-[#0a0a0c]/45 hover:text-[#0a0a0c]/70 transition-colors py-1.5"
              >
                {MODE_PLACEHOLDER[mode]}
              </button>
            )}
            <button
              type="button"
              onClick={() => run()}
              disabled={!file || loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563eb] text-white px-5 py-3 text-[12px] font-mono uppercase tracking-[0.18em] hover:bg-[#1d4ed8] transition-colors disabled:bg-[#0a0a0c]/20 disabled:hover:bg-[#0a0a0c]/20"
            >
              {loading ? 'Running…' : 'Run →'}
            </button>
          </div>
        )}
        <div className="flex items-center justify-between flex-wrap gap-4 px-5 py-3 border-t border-[#0a0a0c]/8 bg-[#f6f5f0]/40">
          <label className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[#0a0a0c]/65">
            <span>k</span>
            <input
              type="range"
              min={8}
              max={80}
              step={4}
              value={k}
              onChange={(e) => setK(Number(e.target.value))}
              className="w-32 accent-[#2563eb]"
            />
            <span className="font-mono text-[11px] text-[#0a0a0c] w-7 text-right">{k}</span>
          </label>
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-[#0a0a0c]/55">
            <span>
              ↳ {loading ? '…' : latencyMs != null ? `${latencyMs.toFixed(0)}ms` : '—'} ·{' '}
              {results.length} results
            </span>
            <span className="text-[#0a0a0c]/30">|</span>
            <span>cosine · int8</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 font-mono text-[11px] text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {(['all', 'image', 'audio', 'video', 'text'] as const).map((m) => {
          const active = filter === m;
          const isAll = m === 'all';
          const count = isAll ? results.length : breakdown[m as Modality];
          return (
            <button
              key={m}
              type="button"
              onClick={() => setFilter(m)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] border transition-colors ${
                active
                  ? 'bg-[#0a0a0c] text-white border-[#0a0a0c]'
                  : 'bg-white text-[#0a0a0c]/65 border-[#0a0a0c]/15 hover:border-[#0a0a0c]/40'
              }`}
            >
              {!isAll && (
                <span
                  style={{ backgroundColor: modalityColors[m as Modality] }}
                  className="w-1.5 h-1.5 rounded-full"
                />
              )}
              {m}
              <span className={`font-mono text-[9.5px] ${active ? 'text-white/55' : 'text-[#0a0a0c]/35'}`}>
                {count}
              </span>
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[#0a0a0c]/55">
          <span>Sort</span>
          <button
            type="button"
            onClick={() => setSort((s) => (s === 'score' ? 'recent' : 'score'))}
            className="px-2.5 py-1 rounded-full border border-[#0a0a0c]/15 bg-white hover:border-[#0a0a0c]/40 transition-colors"
          >
            {sort === 'score' ? 'Score ↓' : 'Recent'}
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[#0a0a0c]/55">
        <span>Breakdown</span>
        {(Object.keys(breakdown) as Modality[]).map((m) => (
          <span
            key={m}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-white border border-[#0a0a0c]/10"
          >
            <span style={{ backgroundColor: modalityColors[m] }} className="w-1 h-1 rounded-full" />
            <span className="text-[#0a0a0c]">{breakdown[m]}</span>
            <span>{m}</span>
          </span>
        ))}
      </div>

      {loading && results.length === 0 ? (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[4/3] rounded-xl bg-[#0a0a0c]/5 animate-pulse border border-[#0a0a0c]/8"
            />
          ))}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {visible.map((r) => (
            <ResultCard key={r.id} r={r} />
          ))}
        </div>
      )}

      {hasMore && (
        <div
          ref={sentinelRef}
          className="mt-8 flex items-center justify-center font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#0a0a0c]/45"
        >
          Loading {Math.min(BATCH, sorted.length - visibleCount)} more…
        </div>
      )}

      {!loading && results.length === 0 && !error && (
        <div className="mt-12 text-center font-mono text-[11px] uppercase tracking-[0.22em] text-[#0a0a0c]/45">
          No Results · Try Another Query
        </div>
      )}
    </div>
  );
}

function ResultCard({ r }: { r: ResultCardData }) {
  return (
    <article className="group relative rounded-xl overflow-hidden bg-white border border-[#0a0a0c]/8 shadow-[0_4px_18px_-10px_rgba(0,0,0,0.12)] hover:shadow-[0_14px_36px_-12px_rgba(0,0,0,0.20)] transition-shadow duration-300">
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur px-2 py-0.5 border border-black/5">
        <span
          style={{ backgroundColor: modalityColors[r.modality] }}
          className="w-1.5 h-1.5 rounded-full"
        />
        <span className="font-mono text-[10px] tracking-widest uppercase text-[#0a0a0c]">
          {r.modality}
        </span>
      </div>
      <div className="absolute top-3 right-3 z-10 rounded-full bg-white/95 backdrop-blur px-2 py-0.5 border border-black/5">
        <span className="font-mono text-[10px] text-[#2563eb] font-medium">
          {r.score.toFixed(2)}
        </span>
      </div>

      {r.modality === 'image' && (
        <a href={r.src || r.thumb} target="_blank" rel="noreferrer" className="block relative aspect-[4/3] bg-[#0a0a0c]/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={r.thumb} alt="" className="absolute inset-0 h-full w-full object-cover" />
        </a>
      )}
      {r.modality === 'audio' && (
        <div className="aspect-[4/3] bg-[#fef0f6] p-4 flex flex-col justify-end">
          <div className="flex items-end gap-[2px] h-20 mb-3">
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
          {r.src && (
            <audio src={r.src} controls preload="none" className="w-full h-8" />
          )}
        </div>
      )}
      {r.modality === 'video' && (
        <div className="relative aspect-[4/3] bg-black">
          <video
            src={r.src}
            poster={r.poster || undefined}
            controls
            preload="none"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      )}
      {r.modality === 'text' && (
        <div className="aspect-[4/3] pt-12 px-5 pb-5 flex items-start bg-[#fefae5]">
          <p className="text-[#0a0a0c]/85 text-[12px] leading-[1.6] font-mono line-clamp-5">
            “{r.snippet}”
          </p>
        </div>
      )}

      <div className="px-3 py-2.5 border-t border-[#0a0a0c]/8 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] text-[#0a0a0c]/55 uppercase tracking-wider truncate">
          {'credit' in r ? r.credit : r.source}
        </span>
        <span className="font-mono text-[9.5px] text-[#0a0a0c]/35 uppercase tracking-[0.2em] shrink-0">
          {r.id.slice(0, 8)}
        </span>
      </div>
    </article>
  );
}
