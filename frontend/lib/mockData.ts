export type Modality = 'image' | 'audio' | 'video' | 'text';

export type ResultCardData =
  | { id: string; modality: 'image'; score: number; thumb: string; credit: string; src?: string }
  | { id: string; modality: 'audio'; score: number; peaks: number[]; duration: number; credit: string; src?: string }
  | { id: string; modality: 'video'; score: number; poster: string; duration: number; credit: string; src?: string }
  | { id: string; modality: 'text'; score: number; snippet: string; source: string; src?: string };

export const demoQuery = 'thunderstorm';

const peaks = (n: number, seed: number) =>
  Array.from({ length: n }, (_, i) => {
    const x = Math.sin((i + seed) * 0.31) * 0.5 + 0.5;
    return Math.max(0.05, x * (0.7 + 0.3 * Math.sin(i * 0.6 + seed)));
  });

export const demoResults: ResultCardData[] = [
  { id: 'r1', modality: 'image', score: 0.91, thumb: '/mock/thunderstorm-1.jpg', credit: 'Unsplash · @brandonm' },
  { id: 'r2', modality: 'audio', score: 0.88, peaks: peaks(96, 11), duration: 12.4, credit: 'ESC-50 · thunderstorm' },
  { id: 'r3', modality: 'video', score: 0.85, poster: '/mock/storm-poster.jpg', duration: 8.1, credit: 'Pexels · @kelly' },
  { id: 'r4', modality: 'text', score: 0.82, snippet: 'A thunderstorm is a storm characterized by the presence of lightning and its acoustic effect on the Earth’s atmosphere, known as thunder.', source: 'Wikipedia' },
];

export const stats = {
  p50_ms: 127,
  p99_ms: 312,
  points: 1742,
  gpu_seconds: 38,
};

export type ArchNode = { id: string; label: string; x: number; y: number; z: number; blurb: string; file: string };
export const archNodes: ArchNode[] = [
  { id: 'browser', label: 'Browser',   x: -2.0, y:  0.0, z:  0.0, blurb: 'Next.js app served from Vercel edge. Renders DOM overlays above the shared canvas.', file: 'frontend/app/page.tsx' },
  { id: 'next',    label: 'Next.js',   x: -1.0, y:  0.5, z:  0.0, blurb: 'App Router + React 19. Streams the landing and proxies dev API calls.', file: 'frontend/next.config.ts' },
  { id: 'api',     label: 'FastAPI',   x:  0.0, y:  0.0, z:  0.0, blurb: 'Python service. Accepts multipart queries, returns top_k results across all modalities.', file: 'backend/api/main.py' },
  { id: 'queue',   label: 'Celery',    x:  0.0, y: -0.8, z:  0.0, blurb: 'Per-modality queues over Redis. GPU-bound tasks isolated from text/upload.', file: 'workers/celery_app.py' },
  { id: 'model',   label: 'ImageBind', x:  1.0, y:  0.5, z:  0.0, blurb: 'Meta’s 1024-d shared embedding model. One vector space for image, audio, video, text.', file: 'backend/core/embeddings.py' },
  { id: 'vec',     label: 'Qdrant',    x:  2.0, y:  0.0, z:  0.0, blurb: 'Single HNSW collection. Cosine distance. INT8 scalar quantization. Modality field indexed.', file: 'backend/core/qdrant_client.py' },
  { id: 's3',      label: 'S3',        x:  0.5, y:  0.9, z:  0.0, blurb: 'Original media + thumbnails + previews. Presigned URLs returned with results.', file: 'backend/core/storage.py' },
];

export type ArchEdge = [string, string];
export const archEdges: ArchEdge[] = [
  ['browser', 'next'],
  ['next', 'api'],
  ['api', 'queue'],
  ['queue', 'model'],
  ['model', 'vec'],
  ['api', 'vec'],
  ['api', 's3'],
];

export const modalityColors: Record<Modality, string> = {
  image: '#6366f1',
  audio: '#f472b6',
  video: '#38bdf8',
  text: '#fbbf24',
};

export const manifestoQuote = {
  pre: 'Search is not',
  italic1: 'a feature.',
  mid: 'It is a',
  italic2: 'fabric.',
};
