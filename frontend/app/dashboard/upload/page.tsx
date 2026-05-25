'use client';

import { useCallback, useRef, useState, type DragEvent } from 'react';
import { modalityColors, type Modality } from '@/lib/mockData';

type Status = 'queued' | 'embedding' | 'indexed' | 'failed';

type UploadItem = {
  id: string;
  name: string;
  size: number;
  modality: Modality;
  progress: number;
  status: Status;
  ms?: number;
};

const SEED_RECENT: UploadItem[] = [
  { id: 'u-thunderstorm-1', name: 'thunderstorm-1.jpg', size: 312_400, modality: 'image', progress: 100, status: 'indexed', ms: 38 },
  { id: 'u-rain-loop', name: 'rain-loop.wav', size: 1_840_220, modality: 'audio', progress: 100, status: 'indexed', ms: 64 },
  { id: 'u-storm-poster', name: 'storm-poster.jpg', size: 254_980, modality: 'image', progress: 100, status: 'indexed', ms: 41 },
  { id: 'u-thunder-snippet', name: 'thunder-snippet.txt', size: 2_140, modality: 'text', progress: 100, status: 'indexed', ms: 12 },
];

const COLLECTIONS = ['default', 'product-catalog', 'audio-library', 'research-clips'];

const guessModality = (name: string): Modality => {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return 'image';
  if (['mp3', 'wav', 'm4a', 'flac', 'ogg'].includes(ext)) return 'audio';
  if (['mp4', 'mov', 'webm', 'mkv'].includes(ext)) return 'video';
  return 'text';
};

const fmtSize = (b: number) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};

let idSeq = 1;
const nextId = () => `u-${Date.now()}-${idSeq++}`;

export default function DashboardUpload() {
  const [collection, setCollection] = useState('default');
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [recent] = useState<UploadItem[]>(SEED_RECENT);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files);
    const items: UploadItem[] = arr.map((f) => ({
      id: nextId(),
      name: f.name,
      size: f.size,
      modality: guessModality(f.name),
      progress: 0,
      status: 'queued',
    }));
    setQueue((q) => [...items, ...q]);
    // Simulate progress: queued -> embedding -> indexed
    items.forEach((it, idx) => {
      const start = 300 + idx * 200;
      setTimeout(() => {
        setQueue((q) => q.map((x) => (x.id === it.id ? { ...x, status: 'embedding' } : x)));
        let p = 0;
        const tick = setInterval(() => {
          p += 8 + Math.random() * 12;
          if (p >= 100) {
            clearInterval(tick);
            setQueue((q) =>
              q.map((x) =>
                x.id === it.id
                  ? { ...x, progress: 100, status: 'indexed', ms: Math.round(30 + Math.random() * 60) }
                  : x,
              ),
            );
          } else {
            setQueue((q) => q.map((x) => (x.id === it.id ? { ...x, progress: p } : x)));
          }
        }, 220);
      }, start);
    });
  }, []);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };
  const onDragLeave = () => setDragOver(false);

  return (
    <div className="px-6 md:px-10 py-8 md:py-10 max-w-6xl mx-auto font-mono">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
        <div>
          <span className="inline-block font-mono text-[10px] uppercase tracking-[0.22em] text-[#0a0a0c]/55">
            Workspace · Default
          </span>
          <h1 className="mt-2 font-mono text-[clamp(22px,2.4vw,28px)] leading-[1.15] tracking-[0.06em] uppercase">
            Upload
          </h1>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#0a0a0c]/65">
          <span>Collection</span>
          <select
            value={collection}
            onChange={(e) => setCollection(e.target.value)}
            className="bg-white border border-[#0a0a0c]/15 rounded-lg px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] hover:border-[#0a0a0c]/40 transition-colors cursor-pointer"
          >
            {COLLECTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Dropzone */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`relative rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 ${
          dragOver
            ? 'border-[#2563eb] bg-[#2563eb]/[0.06]'
            : 'border-[#0a0a0c]/20 bg-white/55 hover:border-[#0a0a0c]/40 hover:bg-white/75'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
        <div className="px-8 py-16 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-[#0a0a0c]/[0.04] grid place-items-center mb-5">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0a0a0c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <p className="font-mono text-[14px] uppercase tracking-[0.18em] leading-none">
            Drop Files To Ingest
          </p>
          <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#0a0a0c]/55">
            Image · Audio · Video · Text · Max 128 MB Per File
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
            className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-[#0a0a0c] text-white px-5 py-2.5 font-mono uppercase tracking-[0.18em] text-[10.5px] hover:bg-[#1a1a1c] transition-colors"
          >
            Browse Files
          </button>
        </div>
      </div>

      {/* Queue */}
      {queue.length > 0 && (
        <section className="mt-10">
          <div className="flex items-baseline justify-between">
            <h2 className="font-mono text-[13px] uppercase tracking-[0.22em]">
              Queue
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#0a0a0c]/45">
              {queue.filter((q) => q.status !== 'indexed').length} active · {queue.length} total
            </span>
          </div>
          <ul className="mt-4 divide-y divide-[#0a0a0c]/8 border-y border-[#0a0a0c]/8">
            {queue.map((it) => (
              <QueueRow key={it.id} item={it} />
            ))}
          </ul>
        </section>
      )}

      {/* Recent */}
      <section className="mt-12">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-[22px] uppercase tracking-tight">
            Recently Indexed
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#0a0a0c]/45">
            Last Hour
          </span>
        </div>
        <ul className="mt-4 divide-y divide-[#0a0a0c]/8 border-y border-[#0a0a0c]/8">
          {recent.map((it) => (
            <QueueRow key={it.id} item={it} />
          ))}
        </ul>
      </section>

      {/* Tips */}
      <section className="mt-12 rounded-xl border border-dashed border-[#0a0a0c]/18 bg-white/55 backdrop-blur-md p-6">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#0a0a0c]/55">
          Notes
        </h3>
        <ul className="mt-3 space-y-2 font-mono text-[11.5px] text-[#0a0a0c]/75 leading-[1.7]">
          <li>· Audio &gt; 30s is chunked into 10s windows · one vector per window</li>
          <li>· HEIC images get rejected · convert to jpg/png before upload</li>
          <li>· Metadata can be attached per-file as JSON · indexed for filtering</li>
        </ul>
      </section>
    </div>
  );
}

function QueueRow({ item }: { item: UploadItem }) {
  const color = modalityColors[item.modality];
  return (
    <li className="py-4 flex items-center gap-4">
      <span
        aria-hidden
        className="w-1.5 h-10 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-mono text-[12px] text-[#0a0a0c] truncate">
            {item.name}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#0a0a0c]/45 shrink-0">
            {fmtSize(item.size)} · {item.modality}
          </span>
        </div>
        <div className="mt-2 h-1 rounded-full bg-[#0a0a0c]/8 overflow-hidden">
          <div
            className="h-full transition-[width] duration-200 ease-out"
            style={{ width: `${item.progress}%`, backgroundColor: color }}
          />
        </div>
      </div>
      <StatusPill status={item.status} ms={item.ms} />
    </li>
  );
}

function StatusPill({ status, ms }: { status: Status; ms?: number }) {
  const map: Record<Status, { label: string; color: string; bg: string }> = {
    queued:    { label: 'Queued',    color: '#94a3b8', bg: '#94a3b81f' },
    embedding: { label: 'Embedding', color: '#6366f1', bg: '#6366f11f' },
    indexed:   { label: ms ? `Indexed · ${ms}ms` : 'Indexed', color: '#34d399', bg: '#34d39922' },
    failed:    { label: 'Failed',    color: '#f87171', bg: '#f871711f' },
  };
  const s = map[status];
  return (
    <span
      className="shrink-0 font-mono text-[9.5px] uppercase tracking-[0.22em] px-2 py-1 rounded"
      style={{ color: s.color, backgroundColor: s.bg }}
    >
      {s.label}
    </span>
  );
}
