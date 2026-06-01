// Live client for the Synapse backend (POST /api/v1/search) → ResultCardData[].
import type { Modality, ResultCardData } from './mockData';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Decorative waveform for audio cards (the backend doesn't store peaks).
const synthPeaks = (seed: number, n = 96) =>
  Array.from({ length: n }, (_, i) => {
    const x = Math.sin((i + seed) * 0.31) * 0.5 + 0.5;
    return Math.max(0.05, x * (0.7 + 0.3 * Math.sin(i * 0.6 + seed)));
  });

type ApiResult = {
  id: string;
  score: number;
  modality: Modality;
  thumbnail_url?: string;
  preview_url?: string;
  metadata?: Record<string, unknown>;
};

function mapResult(r: ApiResult, idx: number): ResultCardData {
  const m = (r.metadata || {}) as Record<string, string | number | undefined>;
  const source = (m.source as string) || 'synapse';
  const tag = (m.tag as string) || (m.title as string) || '';
  const credit = tag ? `${source} · ${tag}` : source;
  const dur = Number(m.duration) || 0;

  if (r.modality === 'image') {
    return {
      id: r.id, modality: 'image', score: r.score, credit,
      thumb: r.thumbnail_url || r.preview_url || '',
      src: r.preview_url || r.thumbnail_url,
    };
  }
  if (r.modality === 'audio') {
    return {
      id: r.id, modality: 'audio', score: r.score, credit,
      peaks: synthPeaks(idx + 1), duration: dur || 5,
      src: r.preview_url || r.thumbnail_url,
    };
  }
  if (r.modality === 'video') {
    return {
      id: r.id, modality: 'video', score: r.score, credit,
      poster: r.thumbnail_url || '', duration: dur,
      src: r.preview_url,
    };
  }
  return {
    id: r.id, modality: 'text', score: r.score, source,
    snippet: (m.snippet as string) || (m.title as string) || '(text)',
    src: m.ref_url as string | undefined,
  };
}

export type SearchInput = {
  mode: 'text' | 'image' | 'audio' | 'video';
  query: string;
  file: File | null;
  topK: number;
  modality?: Modality | 'all';
};

export type SearchOutput = {
  results: ResultCardData[];
  latencyMs: number;
  total: number;
};

export async function searchSynapse(input: SearchInput): Promise<SearchOutput> {
  const fd = new FormData();
  fd.append('top_k', String(input.topK));
  if (input.mode === 'text') {
    fd.append('text', input.query);
  } else if (input.file) {
    fd.append(`${input.mode}_file`, input.file);
  } else {
    throw new Error(`Attach a ${input.mode} file to search`);
  }
  if (input.modality && input.modality !== 'all') {
    fd.append(
      'filters',
      JSON.stringify({ must: [{ key: 'modality', match: { value: input.modality } }] }),
    );
  }

  const res = await fetch(`${API}/api/v1/search`, { method: 'POST', body: fd });
  if (!res.ok) {
    throw new Error(`Search failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  }
  const data = await res.json();
  return {
    results: (data.results || []).map(mapResult),
    latencyMs: typeof data.latency_ms === 'number' ? data.latency_ms : 0,
    total: typeof data.total === 'number' ? data.total : (data.results || []).length,
  };
}
