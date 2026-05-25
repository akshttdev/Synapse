# Synapse — Cinematic Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `frontend/app/page.tsx` with a single-canvas, single-timeline cinematic landing page (7 connected beats) for Synapse, deployable to Vercel.

**Architecture:** One persistent OGL canvas mounted at layout level renders ~8K instanced particles. One GSAP master timeline, scrubbed by ScrollTrigger (which Lenis drives), keyframes scene index + camera + particle scale across the entire page. DOM overlays sit above the canvas and share the same scroll progress. Two scroll-scrubbed SVG curtain morphs transition into and out of the cream "paper" beat. All data is mocked; no backend.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind v4 (CSS `@theme inline`), GSAP 3.13 + ScrollTrigger + SplitText (free in 3.13), Lenis 1.3, OGL 1.0, shadcn/ui Sheet primitive, `next/font/google` (Fraunces, Inter, JetBrains Mono).

**Spec:** `docs/superpowers/specs/2026-05-24-synapse-cinematic-landing-design.md`

**Working directory for all commands:** `/Users/akshat/Documents/projects/web/synapse/frontend/`

**Verification model:** This is animation-heavy frontend work. Each task ends with a concrete visual + console verification step run against `npm run dev`, not unit tests. Tests are out of scope for this plan (no framework installed; would not catch animation correctness).

---

## File Map

```
frontend/
  app/
    layout.tsx                                 # MODIFY: replace local font, mount CanvasRoot + new SmoothScroll
    page.tsx                                   # REWRITE: composes the 7 beats
    globals.css                                # MODIFY: replace tokens, add palette + type scale
  components/
    canvas/
      CanvasRoot.tsx                           # NEW: fixed canvas, OGL renderer, scene context
      particleProgram.ts                       # NEW: vertex + fragment shaders, attrs, uniforms
      compositions.ts                          # NEW: 7 target-position arrays per beat
      sceneContext.ts                          # NEW: React context exposing scene API
    motion/
      SmoothScroll.tsx                         # REWRITE: Lenis -> ScrollTrigger.update
      MasterTimeline.tsx                       # NEW: creates gsap.timeline + ScrollTriggers
      SplitHeadline.tsx                        # NEW: SplitText wrapper, reduced-motion safe
      MagneticButton.tsx                       # NEW: mouse-follow CTA
      Cursor.tsx                               # NEW: custom cursor dot
      Curtain.tsx                              # NEW: SVG curtain morph between two beats
      ModalityRotator.tsx                      # NEW: cycles "image | audio | video | text"
      Ticker.tsx                               # NEW: number count-up
      Marquee.tsx                              # NEW: infinite CSS marquee
    beats/
      BeatI_ColdOpen.tsx                       # NEW
      BeatII_Hero.tsx                          # NEW
      BeatIII_Demo.tsx                         # NEW
      BeatIV_FourWorlds.tsx                    # NEW
      BeatV_Paper.tsx                          # NEW
      BeatVI_System.tsx                        # NEW
      BeatVII_Outro.tsx                        # NEW
    ui/
      ResultCard.tsx                           # NEW: mocked result cards (4 modality variants)
      ArchNode.tsx                             # NEW: clickable architecture node hotspot
    Navbar.tsx                                 # REWRITE
    Footer.tsx                                 # REWRITE
    Architecture.tsx                           # DELETE
    CTA.tsx                                    # DELETE
    Features.tsx                               # DELETE
    Hero.tsx                                   # DELETE
    HowItWorks.tsx                             # DELETE
    UseCases.tsx                               # DELETE
    SmoothScroll.tsx                           # DELETE (moved to motion/)
    GradientBlinds.tsx                         # DELETE (unused legacy)
    ImageCard.tsx                              # DELETE (unused legacy)
    ImageUpload.tsx                            # DELETE (unused legacy)
    Loader.tsx                                 # DELETE (unused legacy)
    ResultsSection.tsx                         # DELETE (unused legacy)
    SearchBar.tsx                              # DELETE (unused legacy)
    SearchInput.tsx                            # KEEP (still used by /dashboard/search)
  hooks/
    useReducedMotion.ts                        # NEW
    useDeviceCapability.ts                     # NEW (cores, mobile detection)
  lib/
    mockData.ts                                # NEW: demo results, stats, arch nodes/edges
    particleConfig.ts                          # NEW: adaptive particle count
    splineLerp.ts                              # NEW: cubic bezier path util
  public/
    mock/                                      # NEW dir
      thunderstorm-1.jpg                       # NEW (Unsplash, credited inline)
      storm-poster.jpg                         # NEW
```

---

## Phase 0 — Foundation

### Task 1: Replace fonts with Fraunces / Inter / JetBrains Mono

**Files:**
- Modify: `frontend/app/layout.tsx`
- Modify: `frontend/app/globals.css:5-20` (delete Space Grotesk `@font-face` rules)

- [ ] **Step 1: Update layout.tsx to load three Google fonts**

Replace the entire body of `frontend/app/layout.tsx` with:

```tsx
import type { Metadata } from 'next'
import './globals.css'
import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google'
import SmoothScroll from '@/components/motion/SmoothScroll'
import CanvasRoot from '@/components/canvas/CanvasRoot'
import Cursor from '@/components/motion/Cursor'

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Synapse — search anything with anything',
  description:
    'A 1024-dimensional embedding space for image, audio, video, and text. Query with anything, retrieve anything.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} ${mono.variable}`}>
      <body className="bg-ink-950 text-fg antialiased">
        <CanvasRoot />
        <SmoothScroll>
          <Cursor />
          {children}
        </SmoothScroll>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Delete Space Grotesk @font-face rules from globals.css**

In `frontend/app/globals.css`, delete lines 6–20 (both `@font-face { font-family: "Grotesk"; ... }` blocks). Leave the `@import "tailwindcss";` and `@import "tw-animate-css";` at the top.

- [ ] **Step 3: Verify dev server boots**

Run from `frontend/`: `npm run dev`
Expected: server starts on http://localhost:3000 with no font-related errors. `CanvasRoot` and `Cursor` will fail import — that's expected; we create them later. Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/layout.tsx frontend/app/globals.css
git commit -m "feat(landing): swap fonts to Fraunces + Inter + JetBrains Mono"
```

---

### Task 2: Rewrite globals.css palette + type scale

**Files:**
- Modify: `frontend/app/globals.css`

- [ ] **Step 1: Replace globals.css with the new design tokens**

Overwrite the entire file with:

```css
@import "tailwindcss";

@theme inline {
  /* Palette (see spec §2.2) */
  --color-ink-950: #03070a;
  --color-ink-900: #0a0a0c;
  --color-ink-800: #0d0e11;
  --color-paper: #ededea;
  --color-paper-ink: #0a0a0c;
  --color-accent: #34d399;
  --color-accent-d: #145740;
  --color-mod-image: #6366f1;
  --color-mod-audio: #f472b6;
  --color-mod-video: #38bdf8;
  --color-mod-text: #fbbf24;
  --color-fg: #e7e7ea;
  --color-muted-fg: #b6b8bf;
  --color-muted-2: #8b8d95;
  --color-hairline: #1f2024;

  /* Type families (wired to next/font CSS vars) */
  --font-display: var(--font-fraunces);
  --font-sans: var(--font-inter);
  --font-mono: var(--font-mono);
}

:root {
  color-scheme: dark;
}

html, body {
  background: var(--color-ink-950);
  color: var(--color-fg);
  font-family: var(--font-sans);
  font-feature-settings: 'cv11', 'ss01';
  -webkit-font-smoothing: antialiased;
}

body {
  /* Lenis disables native scroll; we still want a real scrollbar gutter */
  overflow-x: hidden;
}

/* Reduced motion: keep readability, kill drama */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}

/* Custom cursor hides native pointer on devices with fine pointer */
@media (pointer: fine) {
  .has-custom-cursor, .has-custom-cursor * {
    cursor: none;
  }
}

/* Selection */
::selection {
  background: var(--color-accent);
  color: var(--color-ink-950);
}

/* Utility classes used across beats */
.font-display { font-family: var(--font-display); }
.font-mono { font-family: var(--font-mono); }
.eyebrow {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--color-muted-2);
  font-weight: 500;
}
.display-xl {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: clamp(64px, 12vw, 168px);
  line-height: 0.88;
  letter-spacing: -0.035em;
}
.display-l {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: clamp(48px, 7vw, 96px);
  line-height: 0.92;
  letter-spacing: -0.03em;
}
.body-l { font-size: 18px; line-height: 1.6; }
.body-m { font-size: 15px; line-height: 1.55; }
```

- [ ] **Step 2: Verify Tailwind class generation works**

Run: `npm run dev`
Open http://localhost:3000 (page will still error on missing components — check the dev terminal). Expected: no Tailwind compile errors. Stop the server.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/globals.css
git commit -m "feat(landing): new palette + display/sans/mono type tokens"
```

---

### Task 3: Rewrite SmoothScroll to drive ScrollTrigger

**Files:**
- Create: `frontend/components/motion/SmoothScroll.tsx`
- Delete: `frontend/components/SmoothScroll.tsx`

- [ ] **Step 1: Create the new SmoothScroll**

Write `frontend/components/motion/SmoothScroll.tsx`:

```tsx
'use client';

import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lenis = new Lenis({
      duration: 1.15,
      smoothWheel: !reduced,
      lerp: reduced ? 1 : 0.1,
    });
    lenisRef.current = lenis;

    lenis.on('scroll', ScrollTrigger.update);

    const tick = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  return <>{children}</>;
}
```

- [ ] **Step 2: Delete the legacy SmoothScroll**

Run: `rm frontend/components/SmoothScroll.tsx`

- [ ] **Step 3: Verify imports**

The new layout.tsx already imports from `@/components/motion/SmoothScroll`. Run `npm run dev` and check no `Module not found` for SmoothScroll. (Other components still missing — expected.) Stop the server.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/motion/SmoothScroll.tsx frontend/components/SmoothScroll.tsx
git commit -m "feat(landing): Lenis now drives ScrollTrigger via gsap.ticker"
```

---

### Task 4: Delete legacy landing components

**Files:**
- Delete: `frontend/components/Architecture.tsx`, `CTA.tsx`, `Features.tsx`, `Hero.tsx`, `HowItWorks.tsx`, `UseCases.tsx`, `GradientBlinds.tsx`, `ImageCard.tsx`, `ImageUpload.tsx`, `Loader.tsx`, `ResultsSection.tsx`, `SearchBar.tsx`

- [ ] **Step 1: Confirm nothing else imports these**

Run: `cd frontend && grep -rln "from \"@/components/Architecture\"\|from \"@/components/CTA\"\|from \"@/components/Features\"\|from \"@/components/Hero\"\|from \"@/components/HowItWorks\"\|from \"@/components/UseCases\"\|from \"@/components/GradientBlinds\"\|from \"@/components/ImageCard\"\|from \"@/components/ImageUpload\"\|from \"@/components/Loader\"\|from \"@/components/ResultsSection\"\|from \"@/components/SearchBar\"" .`

Expected: only `app/page.tsx` matches (and only for the ones it imports). If anything else matches, stop and address.

- [ ] **Step 2: Delete the files**

```bash
rm frontend/components/Architecture.tsx \
   frontend/components/CTA.tsx \
   frontend/components/Features.tsx \
   frontend/components/Hero.tsx \
   frontend/components/HowItWorks.tsx \
   frontend/components/UseCases.tsx \
   frontend/components/GradientBlinds.tsx \
   frontend/components/ImageCard.tsx \
   frontend/components/ImageUpload.tsx \
   frontend/components/Loader.tsx \
   frontend/components/ResultsSection.tsx \
   frontend/components/SearchBar.tsx
```

- [ ] **Step 3: Stub app/page.tsx so the build still passes**

Overwrite `frontend/app/page.tsx` with:

```tsx
export default function Home() {
  return <main className="min-h-screen grid place-items-center">scaffolding…</main>;
}
```

- [ ] **Step 4: Verify build**

Run from `frontend/`: `npm run dev`
Visit http://localhost:3000 — expect to see "scaffolding…" centered on a near-black background. Stop the server.

- [ ] **Step 5: Commit**

```bash
git add -A frontend/components/ frontend/app/page.tsx
git commit -m "chore(landing): delete legacy landing components; stub page"
```

---

## Phase 1 — Shared infra

### Task 5: Mock data

**Files:**
- Create: `frontend/lib/mockData.ts`

- [ ] **Step 1: Create the file**

Write `frontend/lib/mockData.ts`:

```ts
export type Modality = 'image' | 'audio' | 'video' | 'text';

export type ResultCardData =
  | { id: string; modality: 'image'; score: number; thumb: string; credit: string }
  | { id: string; modality: 'audio'; score: number; peaks: number[]; duration: number; credit: string }
  | { id: string; modality: 'video'; score: number; poster: string; duration: number; credit: string }
  | { id: string; modality: 'text'; score: number; snippet: string; source: string };

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
```

- [ ] **Step 2: Verify type-check**

Run from `frontend/`: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/mockData.ts
git commit -m "feat(landing): mock data — results, stats, arch graph, palette"
```

---

### Task 6: Particle config + device capability

**Files:**
- Create: `frontend/lib/particleConfig.ts`
- Create: `frontend/hooks/useDeviceCapability.ts`
- Create: `frontend/hooks/useReducedMotion.ts`

- [ ] **Step 1: Create particleConfig.ts**

```ts
export type Capability = {
  reduced: boolean;
  mobile: boolean;
  cores: number;
};

export function particleCount(cap: Capability): number {
  if (cap.reduced) return 800;
  if (cap.mobile) return 3500;
  if (cap.cores >= 8) return 12000;
  return 8000;
}

export function dprCap(cap: Capability): number {
  if (cap.reduced) return 1;
  if (cap.mobile) return Math.min(window.devicePixelRatio || 1, 2);
  return Math.min(window.devicePixelRatio || 1, 2);
}
```

- [ ] **Step 2: Create useReducedMotion hook**

```ts
'use client';

import { useEffect, useState } from 'react';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
```

- [ ] **Step 3: Create useDeviceCapability hook**

```ts
'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from './useReducedMotion';
import type { Capability } from '@/lib/particleConfig';

export function useDeviceCapability(): Capability {
  const reduced = useReducedMotion();
  const [state, setState] = useState<Omit<Capability, 'reduced'>>({ mobile: false, cores: 4 });

  useEffect(() => {
    const mobile = matchMedia('(max-width: 768px)').matches;
    const cores = navigator.hardwareConcurrency ?? 4;
    setState({ mobile, cores });
  }, []);

  return { reduced, ...state };
}
```

- [ ] **Step 4: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/particleConfig.ts frontend/hooks/
git commit -m "feat(landing): adaptive particle count + reduced-motion/capability hooks"
```

---

### Task 7: Spline lerp utility

**Files:**
- Create: `frontend/lib/splineLerp.ts`

- [ ] **Step 1: Create the file**

```ts
/**
 * Returns a cubic Bezier interpolation between three control points
 * at time t in [0, 1]. Used by the canvas to move particles along
 * curved trajectories between beat compositions.
 */
export function bezier3(
  out: [number, number, number],
  p0: [number, number, number],
  c: [number, number, number],
  p1: [number, number, number],
  t: number,
): [number, number, number] {
  const u = 1 - t;
  const uu = u * u;
  const tt = t * t;
  for (let i = 0; i < 3; i++) {
    out[i] = uu * p0[i] + 2 * u * t * c[i] + tt * p1[i];
  }
  return out;
}

/** Linear interpolation, scalar. */
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Smoothstep easing. */
export const smoothstep = (t: number) => t * t * (3 - 2 * t);
```

- [ ] **Step 2: Commit**

```bash
git add frontend/lib/splineLerp.ts
git commit -m "feat(landing): spline + lerp utilities for camera and particle moves"
```

---

## Phase 2 — Canvas

### Task 8: Shader program

**Files:**
- Create: `frontend/components/canvas/particleProgram.ts`

- [ ] **Step 1: Create shader source + program description**

Write `frontend/components/canvas/particleProgram.ts`:

```ts
/**
 * OGL Program describing the particle field.
 *
 * Per-instance attributes:
 *   - aSeed (vec3)          deterministic per-particle randomness
 *   - aColor (vec3)         modality color
 *
 * Uniforms:
 *   - uTime (float)
 *   - uMouse (vec2)         normalized -1..1
 *   - uScene (float)        0..6 — interpolates between compositions
 *   - uCameraZ (float)
 *   - uFog (float)          0..1
 *   - uScale (float)        particle size multiplier
 *   - uPositionsA (sampler2D)  current composition target field
 *   - uPositionsB (sampler2D)  next composition target field
 *   - uMix (float)          0..1 between A and B
 *
 * The positions textures pack particle XYZ into RGB channels of an
 * R-channel float texture (one texel per particle). We sample by
 * gl_InstanceID to read this particle's target in each composition.
 */
export const VERT = /* glsl */ `#version 300 es
precision highp float;

in vec3 aSeed;
in vec3 aColor;

uniform float uTime;
uniform vec2 uMouse;
uniform float uScene;
uniform float uCameraZ;
uniform float uFog;
uniform float uScale;
uniform sampler2D uPositionsA;
uniform sampler2D uPositionsB;
uniform float uMix;
uniform int uCount;

out vec3 vColor;
out float vDepth;

vec3 fetchTarget(sampler2D tex, int id, int count) {
  int W = textureSize(tex, 0).x;
  int x = id % W;
  int y = id / W;
  return texelFetch(tex, ivec2(x, y), 0).rgb;
}

void main() {
  int id = gl_InstanceID;
  vec3 a = fetchTarget(uPositionsA, id, uCount);
  vec3 b = fetchTarget(uPositionsB, id, uCount);
  vec3 p = mix(a, b, smoothstep(0.0, 1.0, uMix));

  // Per-particle gentle noise
  float n = sin(uTime * 0.4 + aSeed.x * 6.28) * 0.04;
  p.x += n * aSeed.y;
  p.y += n * aSeed.z;

  // Mouse parallax
  p.x += uMouse.x * 0.15 * (1.0 - aSeed.x);
  p.y += uMouse.y * 0.15 * (1.0 - aSeed.y);

  // Camera (simple translate along Z)
  vec3 cam = vec3(0.0, 0.0, uCameraZ);
  vec3 view = p - cam;

  // Perspective projection (fov ~ 60deg, aspect via uniform handled by canvas resize)
  float fov = 1.2;
  vec2 proj = view.xy / (-view.z * fov);

  gl_Position = vec4(proj, 0.0, 1.0);
  float dist = length(view);
  gl_PointSize = clamp(220.0 / dist, 1.0, 12.0) * uScale;
  vColor = aColor;
  vDepth = clamp(1.0 - (dist - 1.0) / 10.0, 0.0, 1.0);
}
`;

export const FRAG = /* glsl */ `#version 300 es
precision highp float;

in vec3 vColor;
in float vDepth;
uniform float uFog;
out vec4 oColor;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float alpha = smoothstep(0.5, 0.0, d);
  float fog = mix(1.0, vDepth, uFog);
  oColor = vec4(vColor * fog, alpha * fog);
}
`;
```

- [ ] **Step 2: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/canvas/particleProgram.ts
git commit -m "feat(canvas): particle shader (instanced, two-target morph)"
```

---

### Task 9: Compositions — target positions per beat

**Files:**
- Create: `frontend/components/canvas/compositions.ts`

- [ ] **Step 1: Create the seven compositions**

Write `frontend/components/canvas/compositions.ts`:

```ts
import { archNodes, archEdges } from '@/lib/mockData';

/**
 * Each composition returns an array of length count*3, packed as
 * [x,y,z, x,y,z, ...] in world space (ink scene units, ~5 units across).
 */

const rand = (seed: number) => {
  const s = Math.sin(seed * 12.9898) * 43758.5453;
  return s - Math.floor(s);
};

export function compositionColdOpen(count: number): Float32Array {
  // All particles parked off-screen at -10z (invisible), except #0 at origin.
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    arr[i * 3 + 0] = 0;
    arr[i * 3 + 1] = 0;
    arr[i * 3 + 2] = -10;
  }
  arr[0] = 0; arr[1] = 0; arr[2] = 0;
  return arr;
}

export function compositionHeroCloud(count: number): Float32Array {
  // Spherical cloud in front of camera, radius ~2.2.
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = rand(i + 1.1);
    const v = rand(i + 2.3);
    const w = rand(i + 3.7);
    const theta = u * Math.PI * 2;
    const phi = Math.acos(2 * v - 1);
    const r = 0.6 + Math.pow(w, 0.5) * 2.0;
    arr[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
    arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    arr[i * 3 + 2] = r * Math.cos(phi) * 0.6;
  }
  return arr;
}

export function compositionConverge(count: number): Float32Array {
  // 70% pulled toward origin (the query), 30% drift outward to seed result cards.
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = rand(i + 4.5);
    const v = rand(i + 5.9);
    const inner = rand(i + 6.1) < 0.7;
    if (inner) {
      const r = rand(i + 7.7) * 0.5;
      const theta = u * Math.PI * 2;
      arr[i * 3 + 0] = r * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(theta);
      arr[i * 3 + 2] = (v - 0.5) * 0.4;
    } else {
      // ring at radius ~3, behind query pill
      const theta = u * Math.PI * 2;
      arr[i * 3 + 0] = 3.0 * Math.cos(theta);
      arr[i * 3 + 1] = 3.0 * Math.sin(theta);
      arr[i * 3 + 2] = -1.5;
    }
  }
  return arr;
}

export function compositionFourWorlds(count: number): Float32Array {
  // 2x2 quadrants in 3D space, one per modality.
  const arr = new Float32Array(count * 3);
  const centers: [number, number, number][] = [
    [-1.6,  1.0, 0], // image (top-left)
    [ 1.6,  1.0, 0], // audio (top-right)
    [-1.6, -1.0, 0], // video (bottom-left)
    [ 1.6, -1.0, 0], // text  (bottom-right)
  ];
  for (let i = 0; i < count; i++) {
    const c = centers[i % 4];
    const u = rand(i + 8.1);
    const v = rand(i + 9.3);
    const w = rand(i + 10.5);
    const theta = u * Math.PI * 2;
    const phi = Math.acos(2 * v - 1);
    const r = Math.pow(w, 0.5) * 0.85;
    arr[i * 3 + 0] = c[0] + r * Math.sin(phi) * Math.cos(theta);
    arr[i * 3 + 1] = c[1] + r * Math.sin(phi) * Math.sin(theta);
    arr[i * 3 + 2] = c[2] + r * Math.cos(phi) * 0.4;
  }
  return arr;
}

export function compositionPaper(count: number): Float32Array {
  // Park everything off-screen (canvas opacity is 0 during paper).
  return compositionColdOpen(count);
}

export function compositionSystem(count: number): Float32Array {
  // Distribute particles among arch edges, parameterized along each spline.
  const arr = new Float32Array(count * 3);
  const nodes = new Map(archNodes.map((n) => [n.id, [n.x, n.y, n.z] as [number, number, number]]));
  const edges = archEdges.map(([a, b]) => [nodes.get(a)!, nodes.get(b)!]) as Array<[[number, number, number], [number, number, number]]>;

  for (let i = 0; i < count; i++) {
    const edge = edges[i % edges.length];
    const t = rand(i + 11.7);
    // sag the edge slightly so it's a curve, not a line
    const mx = (edge[0][0] + edge[1][0]) / 2;
    const my = (edge[0][1] + edge[1][1]) / 2 - 0.15;
    const mz = 0;
    const u = 1 - t;
    arr[i * 3 + 0] = u * u * edge[0][0] + 2 * u * t * mx + t * t * edge[1][0];
    arr[i * 3 + 1] = u * u * edge[0][1] + 2 * u * t * my + t * t * edge[1][1];
    arr[i * 3 + 2] = u * u * edge[0][2] + 2 * u * t * mz + t * t * edge[1][2];
  }
  return arr;
}

export function compositionOutro(count: number): Float32Array {
  // Collapse to a tight sphere around origin (radius 0.08).
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = rand(i + 12.3);
    const v = rand(i + 13.1);
    const w = rand(i + 14.5);
    const theta = u * Math.PI * 2;
    const phi = Math.acos(2 * v - 1);
    const r = Math.pow(w, 0.5) * 0.08;
    arr[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
    arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    arr[i * 3 + 2] = r * Math.cos(phi);
  }
  return arr;
}

export const COMPOSITIONS = [
  compositionColdOpen,
  compositionHeroCloud,
  compositionConverge,
  compositionFourWorlds,
  compositionPaper,
  compositionSystem,
  compositionOutro,
];
```

- [ ] **Step 2: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/canvas/compositions.ts
git commit -m "feat(canvas): 7 named compositions (cloud, converge, quadrants, system, outro)"
```

---

### Task 10: Scene context

**Files:**
- Create: `frontend/components/canvas/sceneContext.ts`

- [ ] **Step 1: Create the context**

Write `frontend/components/canvas/sceneContext.ts`:

```ts
'use client';

import { createContext, useContext } from 'react';

export type SceneState = {
  /** 0..6, interpolated by the master timeline. Integer parts are beats; fractions are transitions. */
  sceneIndex: number;
  /** Camera Z position. Pulled back means more positive. */
  cameraZ: number;
  /** Fog density 0..1 — used to mute particles in beats V (paper) and during cuts. */
  fog: number;
  /** Particle size multiplier. */
  scale: number;
  /** Canvas opacity 0..1 — set to 0 during Beat V (paper). */
  opacity: number;
};

export type SceneAPI = {
  set: (partial: Partial<SceneState>) => void;
};

export const SceneContext = createContext<SceneAPI | null>(null);

export function useSceneAPI(): SceneAPI {
  const ctx = useContext(SceneContext);
  if (!ctx) {
    // Allow non-canvas pages to import; just no-op.
    return { set: () => {} };
  }
  return ctx;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/canvas/sceneContext.ts
git commit -m "feat(canvas): scene context — beats set sceneIndex/cameraZ/fog/scale/opacity"
```

---

### Task 11: CanvasRoot

**Files:**
- Create: `frontend/components/canvas/CanvasRoot.tsx`

- [ ] **Step 1: Create CanvasRoot**

Write `frontend/components/canvas/CanvasRoot.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Renderer, Program, Mesh, Geometry, Texture } from 'ogl';
import { VERT, FRAG } from './particleProgram';
import { COMPOSITIONS } from './compositions';
import { SceneContext, type SceneState, type SceneAPI } from './sceneContext';
import { useDeviceCapability } from '@/hooks/useDeviceCapability';
import { particleCount, dprCap } from '@/lib/particleConfig';
import { modalityColors } from '@/lib/mockData';

const HEX_TO_RGB = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

const COLOR_POOL: [number, number, number][] = [
  HEX_TO_RGB(modalityColors.image),
  HEX_TO_RGB(modalityColors.audio),
  HEX_TO_RGB(modalityColors.video),
  HEX_TO_RGB(modalityColors.text),
  HEX_TO_RGB('#34d399'), // accent emerald, weighted heavier
  HEX_TO_RGB('#34d399'),
];

function buildPositionTexture(gl: WebGL2RenderingContext, count: number, data: Float32Array): Texture {
  const W = 256;
  const H = Math.ceil(count / W);
  const padded = new Float32Array(W * H * 4);
  for (let i = 0; i < count; i++) {
    padded[i * 4 + 0] = data[i * 3 + 0];
    padded[i * 4 + 1] = data[i * 3 + 1];
    padded[i * 4 + 2] = data[i * 3 + 2];
    padded[i * 4 + 3] = 0;
  }
  return new Texture(gl, {
    image: padded,
    width: W,
    height: H,
    type: gl.FLOAT,
    format: gl.RGBA,
    internalFormat: gl.RGBA32F,
    generateMipmaps: false,
    minFilter: gl.NEAREST,
    magFilter: gl.NEAREST,
  });
}

export default function CanvasRoot() {
  const cap = useDeviceCapability();
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<SceneState>({
    sceneIndex: 0,
    cameraZ: -3.5,
    fog: 0.0,
    scale: 1.0,
    opacity: 1.0,
  });
  const [apiReady, setApiReady] = useState(false);

  const api: SceneAPI = {
    set: useCallback((partial: Partial<SceneState>) => {
      Object.assign(stateRef.current, partial);
    }, []),
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el || cap.cores === 0) return;

    const COUNT = particleCount(cap);
    const renderer = new Renderer({
      dpr: dprCap(cap),
      alpha: true,
      antialias: false,
      premultipliedAlpha: true,
    });
    const gl = renderer.gl as WebGL2RenderingContext;
    if (!(gl instanceof WebGL2RenderingContext)) {
      console.warn('[CanvasRoot] WebGL2 not supported, skipping particle field.');
      return;
    }
    gl.getExtension('EXT_color_buffer_float');
    gl.clearColor(0, 0, 0, 0);
    el.appendChild(gl.canvas);

    const resize = () => {
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    resize();
    window.addEventListener('resize', resize);

    // Per-particle attributes
    const seeds = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      seeds[i * 3 + 0] = Math.random();
      seeds[i * 3 + 1] = Math.random();
      seeds[i * 3 + 2] = Math.random();
      const c = COLOR_POOL[i % COLOR_POOL.length];
      colors[i * 3 + 0] = c[0];
      colors[i * 3 + 1] = c[1];
      colors[i * 3 + 2] = c[2];
    }

    // Single dummy vertex; we use instanced draw with gl_InstanceID
    const geometry = new Geometry(gl, {
      position: { size: 3, data: new Float32Array([0, 0, 0]) },
      aSeed: { size: 3, data: seeds, instanced: 1 },
      aColor: { size: 3, data: colors, instanced: 1 },
    });

    // Build all 7 position textures up front
    const textures = COMPOSITIONS.map((c) => buildPositionTexture(gl, COUNT, c(COUNT)));

    const program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      transparent: true,
      depthTest: false,
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: [0, 0] },
        uScene: { value: 0 },
        uCameraZ: { value: -3.5 },
        uFog: { value: 0 },
        uScale: { value: 1 },
        uPositionsA: { value: textures[0] },
        uPositionsB: { value: textures[1] },
        uMix: { value: 0 },
        uCount: { value: COUNT },
      },
    });

    const mesh = new Mesh(gl, { geometry, program, mode: gl.POINTS });
    // Force instance count
    (geometry as unknown as { instancedCount: number }).instancedCount = COUNT;

    let raf = 0;
    let mouseX = 0, mouseY = 0;
    const onMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('mousemove', onMove);

    const t0 = performance.now();
    const loop = () => {
      const t = (performance.now() - t0) / 1000;
      const s = stateRef.current;

      const idx = Math.max(0, Math.min(s.sceneIndex, COMPOSITIONS.length - 1));
      const iA = Math.floor(idx);
      const iB = Math.min(COMPOSITIONS.length - 1, iA + 1);
      const mix = idx - iA;

      program.uniforms.uTime.value = t;
      program.uniforms.uMouse.value = [mouseX * 0.6, mouseY * 0.6];
      program.uniforms.uCameraZ.value = s.cameraZ;
      program.uniforms.uFog.value = s.fog;
      program.uniforms.uScale.value = s.scale;
      program.uniforms.uPositionsA.value = textures[iA];
      program.uniforms.uPositionsB.value = textures[iB];
      program.uniforms.uMix.value = mix;

      gl.canvas.style.opacity = String(s.opacity);

      renderer.render({ scene: mesh });
      raf = requestAnimationFrame(loop);
    };
    loop();

    setApiReady(true);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      gl.canvas.remove();
    };
  }, [cap]);

  return (
    <>
      <SceneContext.Provider value={api}>
        {apiReady ? null : null /* children of layout are placed outside this provider; see step 2 */}
      </SceneContext.Provider>
      <div
        ref={containerRef}
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          background: 'transparent',
        }}
      />
    </>
  );
}
```

- [ ] **Step 2: Move SceneContext.Provider up to layout level**

Move the provider into a sibling wrapper component so the rest of the page can subscribe. Replace the `return` block of `CanvasRoot.tsx` with:

```tsx
  return (
    <div
      ref={containerRef}
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        background: 'transparent',
      }}
    />
  );
}
```

Then create `frontend/components/canvas/SceneProvider.tsx`:

```tsx
'use client';

import { useCallback, useRef } from 'react';
import { SceneContext, type SceneState, type SceneAPI } from './sceneContext';

const initial: SceneState = { sceneIndex: 0, cameraZ: -3.5, fog: 0, scale: 1, opacity: 1 };

export const sharedState: { current: SceneState } = { current: { ...initial } };

export default function SceneProvider({ children }: { children: React.ReactNode }) {
  const api: SceneAPI = {
    set: useCallback((p: Partial<SceneState>) => {
      Object.assign(sharedState.current, p);
    }, []),
  };
  return <SceneContext.Provider value={api}>{children}</SceneContext.Provider>;
}
```

Update `CanvasRoot.tsx` to import `sharedState` instead of using its own ref:

Replace the line `const stateRef = useRef<SceneState>({ ... });` and **all** subsequent `stateRef.current` references with `sharedState.current`. Also delete the local `api` and `SceneContext.Provider` from `CanvasRoot.tsx`; only export the canvas div. Remove the now-unused `setApiReady`/`apiReady` state.

Final shape of `CanvasRoot.tsx` (replace top imports):

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Geometry, Texture } from 'ogl';
import { VERT, FRAG } from './particleProgram';
import { COMPOSITIONS } from './compositions';
import { sharedState } from './SceneProvider';
import { useDeviceCapability } from '@/hooks/useDeviceCapability';
import { particleCount, dprCap } from '@/lib/particleConfig';
import { modalityColors } from '@/lib/mockData';
```

And replace `stateRef.current` with `sharedState.current` everywhere in the render loop.

- [ ] **Step 3: Update layout.tsx to wrap children in SceneProvider**

In `frontend/app/layout.tsx`, import and use SceneProvider:

```tsx
import SceneProvider from '@/components/canvas/SceneProvider';
// ...
<body className="bg-ink-950 text-fg antialiased">
  <CanvasRoot />
  <SceneProvider>
    <SmoothScroll>
      <Cursor />
      {children}
    </SmoothScroll>
  </SceneProvider>
</body>
```

- [ ] **Step 4: Verify the canvas mounts**

Run: `npm run dev`
Visit http://localhost:3000. Expected: page is near-black, in the dev console run `document.querySelector('canvas')` — you should see the canvas element. No WebGL errors. (You won't see particles yet because `sceneIndex` stays at 0 — Beat I is empty; that's expected.) Stop the server.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/canvas/ frontend/app/layout.tsx
git commit -m "feat(canvas): OGL renderer mounts persistent particle field"
```

---

## Phase 3 — Motion primitives

### Task 12: MasterTimeline

**Files:**
- Create: `frontend/components/motion/MasterTimeline.tsx`

- [ ] **Step 1: Create the timeline scaffold**

Write `frontend/components/motion/MasterTimeline.tsx`:

```tsx
'use client';

import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useSceneAPI } from '@/components/canvas/sceneContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * The single film timeline. Reads scroll position via ScrollTrigger and
 * keyframes the shared canvas scene (sceneIndex, cameraZ, fog, scale,
 * opacity). DOM overlays animate themselves via per-beat ScrollTriggers;
 * this file owns ONLY the canvas score.
 *
 * Beat ranges (scroll progress 0..1):
 *   I    0.00 – 0.08  cold open
 *   II   0.08 – 0.22  hero
 *   III  0.22 – 0.40  demo
 *   IV   0.40 – 0.58  four worlds
 *   V    0.58 – 0.72  paper
 *   VI   0.72 – 0.90  system
 *   VII  0.90 – 1.00  outro
 */
export default function MasterTimeline({ children }: { children: React.ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const api = useSceneAPI();
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    if (reduced) {
      // Static: park on hero composition, no scrub.
      api.set({ sceneIndex: 1, cameraZ: -3.5, fog: 0, scale: 1, opacity: 1 });
      return;
    }

    const ctx = gsap.context(() => {
      const state = { sceneIndex: 0, cameraZ: -3.5, fog: 0, scale: 1, opacity: 1 };
      const sync = () => api.set(state);

      gsap.timeline({
        scrollTrigger: {
          trigger: wrapRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1,
          onUpdate: sync,
        },
      })
        // I → II  (pulse → cloud)
        .to(state, { sceneIndex: 1, cameraZ: -3.5, scale: 1, ease: 'power2.out', duration: 0.22 })
        // II → III (cloud → converge), dolly in
        .to(state, { sceneIndex: 2, cameraZ: -2.7, ease: 'sine.inOut', duration: 0.18 })
        // III → IV (converge → quadrants), pull back
        .to(state, { sceneIndex: 3, cameraZ: -4.4, ease: 'sine.inOut', duration: 0.18 })
        // IV → V (quadrants → paper), canvas fades behind curtain
        .to(state, { sceneIndex: 4, opacity: 0, fog: 0.4, ease: 'sine.in', duration: 0.14 })
        // V → VI (paper → system), canvas returns, big pull-back
        .to(state, { sceneIndex: 5, opacity: 1, fog: 0.1, cameraZ: -5.2, ease: 'sine.out', duration: 0.18 })
        // VI → VII (system → outro), collapse
        .to(state, { sceneIndex: 6, cameraZ: -3.0, scale: 1.4, ease: 'power3.inOut', duration: 0.10 });
    }, wrapRef);

    return () => ctx.revert();
  }, [api, reduced]);

  return <div ref={wrapRef}>{children}</div>;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/motion/MasterTimeline.tsx
git commit -m "feat(motion): master timeline scrubbing canvas across 7 beats"
```

---

### Task 13: SplitHeadline

**Files:**
- Create: `frontend/components/motion/SplitHeadline.tsx`

- [ ] **Step 1: Create the component**

Write `frontend/components/motion/SplitHeadline.tsx`:

```tsx
'use client';

import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useReducedMotion } from '@/hooks/useReducedMotion';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

type Props = {
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
  children: React.ReactNode;
  /** CSS selector for the scroll trigger element (defaults to the element itself). */
  trigger?: string;
  /** "chars" or "words". */
  split?: 'chars' | 'words';
  stagger?: number;
  delay?: number;
};

export default function SplitHeadline({
  as: Tag = 'h2',
  className,
  children,
  trigger,
  split = 'chars',
  stagger = 0.02,
  delay = 0,
}: Props) {
  const ref = useRef<HTMLHeadingElement>(null);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    if (!ref.current) return;
    if (reduced) {
      gsap.set(ref.current, { opacity: 1 });
      return;
    }

    const ctx = gsap.context(() => {
      const st = new SplitText(ref.current!, { type: split });
      const targets = split === 'chars' ? st.chars : st.words;
      gsap.set(targets, { yPercent: 110, opacity: 0 });

      gsap.to(targets, {
        yPercent: 0,
        opacity: 1,
        ease: 'expo.out',
        duration: 0.9,
        stagger,
        delay,
        scrollTrigger: {
          trigger: trigger ?? ref.current,
          start: 'top 80%',
          toggleActions: 'play none none reverse',
        },
      });
    }, ref);

    return () => ctx.revert();
  }, [reduced, split, stagger, delay, trigger]);

  return (
    <Tag ref={ref as React.RefObject<HTMLHeadingElement>} className={className} style={{ overflow: 'hidden' }}>
      {children}
    </Tag>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/motion/SplitHeadline.tsx
git commit -m "feat(motion): SplitHeadline with reduced-motion fallback"
```

---

### Task 14: MagneticButton

**Files:**
- Create: `frontend/components/motion/MagneticButton.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';

import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost';
  strength?: number; // 0..1
};

export default function MagneticButton({
  children,
  variant = 'primary',
  strength = 0.4,
  className = '',
  ...rest
}: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;

    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      gsap.to(el, { x: dx * strength, y: dy * strength, duration: 0.4, ease: 'power3.out' });
    };
    const onLeave = () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    };

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [reduced, strength]);

  const base =
    'inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[15px] font-medium font-sans transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent';
  const styles =
    variant === 'primary'
      ? 'bg-accent text-ink-950 hover:bg-[#46e0a6]'
      : 'border border-hairline text-fg hover:border-accent hover:text-accent';

  return (
    <button ref={ref} className={`${base} ${styles} ${className}`} {...rest}>
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/motion/MagneticButton.tsx
git commit -m "feat(motion): magnetic CTA with elastic snap-back"
```

---

### Task 15: Cursor

**Files:**
- Create: `frontend/components/motion/Cursor.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export default function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    if (!matchMedia('(pointer: fine)').matches) return;

    document.documentElement.classList.add('has-custom-cursor');
    const dot = dotRef.current!;
    const ring = ringRef.current!;
    let x = 0, y = 0, rx = 0, ry = 0;

    const move = (e: MouseEvent) => {
      x = e.clientX;
      y = e.clientY;
      gsap.set(dot, { x, y });
    };
    const enter = () => gsap.to(ring, { scale: 1.6, duration: 0.25, ease: 'power3.out' });
    const leave = () => gsap.to(ring, { scale: 1, duration: 0.3, ease: 'power3.out' });

    const tick = () => {
      rx += (x - rx) * 0.18;
      ry += (y - ry) * 0.18;
      gsap.set(ring, { x: rx, y: ry });
      raf = requestAnimationFrame(tick);
    };
    let raf = requestAnimationFrame(tick);

    window.addEventListener('mousemove', move);
    document.querySelectorAll('a, button, [data-cursor="pointer"]').forEach((el) => {
      el.addEventListener('mouseenter', enter);
      el.addEventListener('mouseleave', leave);
    });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', move);
      document.documentElement.classList.remove('has-custom-cursor');
    };
  }, [reduced]);

  if (reduced) return null;

  return (
    <>
      <div
        ref={dotRef}
        aria-hidden
        style={{
          position: 'fixed', left: 0, top: 0, width: 6, height: 6, borderRadius: 999,
          background: '#34d399', pointerEvents: 'none', zIndex: 9999,
          transform: 'translate(-50%, -50%)', mixBlendMode: 'difference',
        }}
      />
      <div
        ref={ringRef}
        aria-hidden
        style={{
          position: 'fixed', left: 0, top: 0, width: 36, height: 36, borderRadius: 999,
          border: '1px solid rgba(52,211,153,0.7)', pointerEvents: 'none', zIndex: 9998,
          transform: 'translate(-50%, -50%)',
        }}
      />
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/motion/Cursor.tsx
git commit -m "feat(motion): custom cursor (dot + lagged ring) with fine-pointer guard"
```

---

### Task 16: Curtain

**Files:**
- Create: `frontend/components/motion/Curtain.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';

import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion } from '@/hooks/useReducedMotion';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const D_REST_BOTTOM = 'M 0 100 V 100 Q 50 100 100 100 V 100 z';
const D_FULL = 'M 0 100 V 50 Q 50 0 100 50 V 100 z';
const D_SWEPT_OFF_TOP = 'M 0 0 V 0 Q 50 0 100 0 V 0 z';

type Props = {
  /** CSS id of the section whose bottom edge the curtain rises against (the OUTGOING beat). */
  outTrigger: string;
  /** CSS id of the section whose top edge the curtain sweeps off (the INCOMING beat). */
  inTrigger: string;
  color: string;
};

export default function Curtain({ outTrigger, inTrigger, color }: Props) {
  const ref = useRef<SVGPathElement>(null);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    if (!ref.current || reduced) return;

    const ctx = gsap.context(() => {
      gsap.set(ref.current, { attr: { d: D_REST_BOTTOM } });

      gsap.to(ref.current, {
        attr: { d: D_FULL },
        ease: 'power2.in',
        scrollTrigger: {
          trigger: outTrigger,
          start: 'bottom 80%',
          end: 'bottom 20%',
          scrub: 1,
        },
      });

      gsap.to(ref.current, {
        attr: { d: D_SWEPT_OFF_TOP },
        ease: 'power2.out',
        scrollTrigger: {
          trigger: inTrigger,
          start: 'top 80%',
          end: 'top 20%',
          scrub: 1,
        },
      });
    });

    return () => ctx.revert();
  }, [outTrigger, inTrigger, reduced]);

  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{
        position: 'fixed', inset: 0, width: '100vw', height: '100vh',
        pointerEvents: 'none', zIndex: 5,
      }}
    >
      <path ref={ref} d={D_REST_BOTTOM} fill={color} />
    </svg>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/motion/Curtain.tsx
git commit -m "feat(motion): scroll-scrubbed SVG curtain morph (vanilla GSAP, no club plugin)"
```

---

### Task 17: ModalityRotator

**Files:**
- Create: `frontend/components/motion/ModalityRotator.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const WORDS = ['image', 'audio', 'video', 'text'] as const;

export default function ModalityRotator({ className = '' }: { className?: string }) {
  const [i, setI] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => setI((n) => (n + 1) % WORDS.length), 1800);
    return () => clearInterval(t);
  }, [reduced]);

  if (reduced) {
    return <span className={className} style={{ fontStyle: 'italic', color: '#34d399' }}>image / audio / video / text</span>;
  }

  return (
    <span className={className} style={{ position: 'relative', display: 'inline-block', verticalAlign: 'baseline', minWidth: '4ch' }}>
      {WORDS.map((w, idx) => (
        <span
          key={w}
          aria-hidden={idx !== i}
          style={{
            position: idx === 0 ? 'relative' : 'absolute',
            left: 0, top: 0,
            opacity: idx === i ? 1 : 0,
            transform: `translateY(${idx === i ? 0 : idx > i ? 40 : -40}%)`,
            transition: 'opacity 220ms ease, transform 320ms cubic-bezier(0.22, 1, 0.36, 1)',
            color: '#34d399',
            fontStyle: 'italic',
            whiteSpace: 'nowrap',
          }}
        >
          {w}
        </span>
      ))}
      {/* aria-live announces the current word for screen readers */}
      <span className="sr-only" aria-live="polite">{WORDS[i]}</span>
    </span>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/motion/ModalityRotator.tsx
git commit -m "feat(motion): modality rotator with reduced-motion slash list"
```

---

### Task 18: Ticker (number count-up)

**Files:**
- Create: `frontend/components/motion/Ticker.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  to: number;
  durationMs?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
  decimals?: number;
};

export default function Ticker({ to, durationMs = 1200, suffix = '', prefix = '', className = '', decimals = 0 }: Props) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    let raf = 0;
    let start: number | null = null;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const tick = (ts: number) => {
        if (start === null) start = ts;
        const p = Math.min(1, (ts - start) / durationMs);
        const eased = 1 - Math.pow(1 - p, 3);
        setValue(to * eased);
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.4 });

    obs.observe(ref.current);
    return () => {
      cancelAnimationFrame(raf);
      obs.disconnect();
    };
  }, [to, durationMs]);

  return (
    <span ref={ref} className={className}>
      {prefix}{value.toFixed(decimals)}{suffix}
    </span>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/motion/Ticker.tsx
git commit -m "feat(motion): number count-up triggered by intersection observer"
```

---

### Task 19: Marquee

**Files:**
- Create: `frontend/components/motion/Marquee.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';

import { useReducedMotion } from '@/hooks/useReducedMotion';

type Props = {
  items: string[];
  className?: string;
  /** seconds per full loop */
  duration?: number;
};

export default function Marquee({ items, className = '', duration = 28 }: Props) {
  const reduced = useReducedMotion();
  const seq = [...items, ...items];

  return (
    <div className={`overflow-hidden ${className}`} aria-hidden>
      <div
        style={{
          display: 'flex',
          gap: '3rem',
          whiteSpace: 'nowrap',
          willChange: 'transform',
          animation: reduced ? 'none' : `marquee ${duration}s linear infinite`,
        }}
      >
        {seq.map((s, i) => (
          <span
            key={i}
            className="font-display italic"
            style={{ fontSize: 32, color: '#145740', letterSpacing: '-0.02em', flexShrink: 0 }}
          >
            {s}
          </span>
        ))}
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/motion/Marquee.tsx
git commit -m "feat(motion): looped marquee strip with reduced-motion freeze"
```

---

## Phase 4 — UI primitives

### Task 20: ResultCard (4 modality variants)

**Files:**
- Create: `frontend/components/ui/ResultCard.tsx`

- [ ] **Step 1: Create the component**

Write `frontend/components/ui/ResultCard.tsx`:

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import Image from 'next/image';
import type { ResultCardData } from '@/lib/mockData';
import { modalityColors } from '@/lib/mockData';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export default function ResultCard({ data }: { data: ResultCardData }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    const move = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      gsap.to(el, { rotateY: dx * 8, rotateX: -dy * 8, duration: 0.3, ease: 'power3.out', transformPerspective: 1000 });
    };
    const leave = () => gsap.to(el, { rotateX: 0, rotateY: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
    el.addEventListener('mousemove', move);
    el.addEventListener('mouseleave', leave);
    return () => {
      el.removeEventListener('mousemove', move);
      el.removeEventListener('mouseleave', leave);
    };
  }, [reduced]);

  const accent = modalityColors[data.modality];

  return (
    <div
      ref={ref}
      style={{ perspective: 1000, transformStyle: 'preserve-3d' }}
      className="relative w-full rounded-xl border border-hairline bg-ink-900 overflow-hidden shadow-lg"
      data-cursor="pointer"
    >
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 rounded-full bg-ink-950/70 px-2 py-0.5 backdrop-blur">
        <span style={{ background: accent }} className="w-1.5 h-1.5 rounded-full" />
        <span className="font-mono text-[10px] tracking-widest uppercase text-fg">{data.modality}</span>
      </div>
      <div className="absolute top-2 right-2 z-10 rounded-full bg-ink-950/70 px-2 py-0.5 backdrop-blur">
        <span className="font-mono text-[10px] text-accent">{data.score.toFixed(2)}</span>
      </div>

      {data.modality === 'image' && (
        <div className="relative aspect-[4/3] w-full">
          <Image src={data.thumb} alt="" fill sizes="320px" className="object-cover" />
        </div>
      )}

      {data.modality === 'audio' && <AudioVisual peaks={data.peaks} duration={data.duration} />}

      {data.modality === 'video' && (
        <div className="relative aspect-[4/3] w-full">
          <Image src={data.poster} alt="" fill sizes="320px" className="object-cover" />
          <div className="absolute inset-0 grid place-items-center">
            <div className="w-10 h-10 rounded-full bg-ink-950/70 backdrop-blur grid place-items-center">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 1.5L11.5 7L3 12.5V1.5Z" fill="#fff"/></svg>
            </div>
          </div>
          <div className="absolute bottom-2 right-2 rounded bg-ink-950/70 px-1.5 py-0.5">
            <span className="font-mono text-[10px] text-fg">{data.duration.toFixed(1)}s</span>
          </div>
        </div>
      )}

      {data.modality === 'text' && (
        <div className="p-4">
          <p className="text-fg text-sm leading-relaxed font-sans line-clamp-4">{data.snippet}</p>
        </div>
      )}

      <div className="px-3 py-2 border-t border-hairline">
        <span className="font-mono text-[10px] text-muted-2 uppercase tracking-wider">
          {'credit' in data ? data.credit : data.source}
        </span>
      </div>
    </div>
  );
}

function AudioVisual({ peaks, duration }: { peaks: number[]; duration: number }) {
  return (
    <div className="relative w-full aspect-[4/3] bg-ink-800 px-3 py-4 flex flex-col justify-end">
      <div className="flex items-end gap-[2px] h-20 mb-3">
        {peaks.map((p, i) => (
          <span
            key={i}
            style={{ height: `${p * 100}%`, background: modalityColors.audio, opacity: 0.85, width: 2 }}
            className="rounded-sm"
          />
        ))}
      </div>
      <div className="flex justify-between font-mono text-[10px] text-muted-2">
        <span>00:00</span>
        <span>{duration.toFixed(1)}s</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add the mock image placeholders**

```bash
mkdir -p frontend/public/mock
```

Find two Unsplash photos (any storm/thunderstorm and any landscape/storm scene). Save them as:

- `frontend/public/mock/thunderstorm-1.jpg`
- `frontend/public/mock/storm-poster.jpg`

For dev right now, create 1×1 placeholders so the build works:

```bash
echo -n "" > frontend/public/mock/thunderstorm-1.jpg
echo -n "" > frontend/public/mock/storm-poster.jpg
```

(We will replace these with real images before deploy — see Task 31.)

- [ ] **Step 3: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/ui/ResultCard.tsx frontend/public/mock/
git commit -m "feat(landing): ResultCard with 4 modality variants + tilt hover"
```

---

### Task 21: ArchNode

**Files:**
- Create: `frontend/components/ui/ArchNode.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import type { ArchNode as ArchNodeData } from '@/lib/mockData';

type Props = {
  node: ArchNodeData;
  /** Normalized [0..1] coords inside the section box. The parent passes these. */
  left: number;
  top: number;
};

export default function ArchNode({ node, left, top }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={`Open details for ${node.label}`}
        style={{
          position: 'absolute',
          left: `${left * 100}%`,
          top: `${top * 100}%`,
          transform: 'translate(-50%, -50%)',
        }}
        className="group rounded-full bg-ink-950/60 border border-hairline backdrop-blur px-3 py-1.5 hover:border-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        data-cursor="pointer"
      >
        <span className="font-mono text-[11px] uppercase tracking-wider text-fg group-hover:text-accent">
          {node.label}
        </span>
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="bg-ink-900 border-hairline text-fg">
          <SheetHeader>
            <SheetTitle className="font-display text-3xl text-fg">{node.label}</SheetTitle>
            <SheetDescription className="text-muted-fg body-m">{node.blurb}</SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <span className="eyebrow">Source</span>
            <p className="font-mono text-sm text-accent mt-2 break-all">{node.file}</p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
```

- [ ] **Step 2: Verify shadcn Sheet is present**

Check `frontend/components/ui/sheet.tsx` exists. If not, install via shadcn:

```bash
cd frontend && npx shadcn@latest add sheet
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/ui/ArchNode.tsx frontend/components/ui/sheet.tsx
git commit -m "feat(landing): clickable arch node opens detail sheet"
```

---

## Phase 5 — The beats

> **All beats follow the same structure:** a wrapping `<section>` with a stable `id`, a min-height, and content positioned over the shared canvas. Each beat owns one ScrollTrigger that calls `useSceneAPI().set(...)` directly via `onUpdate` (only when MasterTimeline is NOT scrubbing the canvas score). For DOM overlay animations, beats use SplitHeadline, MagneticButton, Ticker, etc.

### Task 22: Beat I — Cold Open

**Files:**
- Create: `frontend/components/beats/BeatI_ColdOpen.tsx`

- [ ] **Step 1: Create the beat**

```tsx
'use client';

import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export default function BeatI_ColdOpen() {
  const pulseRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    if (!pulseRef.current || reduced) return;
    const ctx = gsap.context(() => {
      gsap.to(pulseRef.current, {
        scale: 1.6,
        opacity: 0.6,
        repeat: -1,
        yoyo: true,
        duration: 0.75,
        ease: 'sine.inOut',
      });
    });
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section id="beat-i" className="relative h-[50vh] grid place-items-center">
      <div
        ref={pulseRef}
        aria-hidden
        style={{
          width: 14, height: 14, borderRadius: 999,
          background: '#34d399',
          boxShadow: '0 0 24px #34d399, 0 0 60px rgba(52,211,153,0.45)',
        }}
      />
    </section>
  );
}
```

- [ ] **Step 2: Mount it in page.tsx**

Overwrite `frontend/app/page.tsx`:

```tsx
import MasterTimeline from '@/components/motion/MasterTimeline';
import BeatI_ColdOpen from '@/components/beats/BeatI_ColdOpen';

export default function Home() {
  return (
    <MasterTimeline>
      <BeatI_ColdOpen />
    </MasterTimeline>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npm run dev`
Visit http://localhost:3000. Expected: black page with one emerald pulse, gently breathing. No console errors. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/beats/BeatI_ColdOpen.tsx frontend/app/page.tsx
git commit -m "feat(beats): I — cold open pulse"
```

---

### Task 23: Beat II — Hero

**Files:**
- Create: `frontend/components/beats/BeatII_Hero.tsx`

- [ ] **Step 1: Create the beat**

```tsx
'use client';

import SplitHeadline from '@/components/motion/SplitHeadline';
import ModalityRotator from '@/components/motion/ModalityRotator';
import MagneticButton from '@/components/motion/MagneticButton';

export default function BeatII_Hero() {
  return (
    <section id="beat-ii" className="relative min-h-[100vh] flex items-center px-6 md:px-12">
      <div className="relative z-10 max-w-5xl">
        <span className="eyebrow block mb-6">02 · Synapse</span>
        <SplitHeadline as="h1" className="display-xl text-fg" split="chars" stagger={0.018}>
          Search anything with <em className="not-italic"><ModalityRotator /></em>.
        </SplitHeadline>
        <p className="body-l text-muted-fg mt-8 max-w-xl">
          One 1024-dimensional embedding space for every modality. Query with anything, retrieve anything.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <MagneticButton variant="primary" onClick={() => (window.location.href = '/search')}>
            Try the demo
            <span aria-hidden>→</span>
          </MagneticButton>
          <MagneticButton variant="ghost" onClick={() => document.getElementById('beat-vi')?.scrollIntoView({ behavior: 'smooth' })}>
            Read architecture
          </MagneticButton>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Add to page.tsx**

```tsx
import MasterTimeline from '@/components/motion/MasterTimeline';
import BeatI_ColdOpen from '@/components/beats/BeatI_ColdOpen';
import BeatII_Hero from '@/components/beats/BeatII_Hero';

export default function Home() {
  return (
    <MasterTimeline>
      <BeatI_ColdOpen />
      <BeatII_Hero />
    </MasterTimeline>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npm run dev`
Visit http://localhost:3000 and scroll down. Expected: pulse expands into particles (canvas scene 0→1) and the headline reveals character by character with the modality rotator cycling. Two CTAs respond to mouse magnetism. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/beats/BeatII_Hero.tsx frontend/app/page.tsx
git commit -m "feat(beats): II — hero with split headline + modality rotator + magnetic CTAs"
```

---

### Task 24: Beat III — Live demo

**Files:**
- Create: `frontend/components/beats/BeatIII_Demo.tsx`

- [ ] **Step 1: Create the beat**

```tsx
'use client';

import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SplitHeadline from '@/components/motion/SplitHeadline';
import ResultCard from '@/components/ui/ResultCard';
import Ticker from '@/components/motion/Ticker';
import { demoQuery, demoResults, stats } from '@/lib/mockData';
import { useReducedMotion } from '@/hooks/useReducedMotion';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function BeatIII_Demo() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    if (!ref.current || reduced) return;
    const ctx = gsap.context(() => {
      const cards = ref.current!.querySelectorAll('[data-card]');
      gsap.set(cards, { y: 40, opacity: 0, rotateX: 8 });
      gsap.to(cards, {
        y: 0, opacity: 1, rotateX: 0,
        ease: 'expo.out',
        duration: 0.9,
        stagger: 0.08,
        scrollTrigger: { trigger: ref.current, start: 'top 70%', toggleActions: 'play none none reverse' },
      });
    }, ref);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section id="beat-iii" ref={ref} className="relative min-h-[120vh] px-6 md:px-12 py-32">
      <div className="relative z-10 max-w-6xl mx-auto">
        <span className="eyebrow block mb-4">03 · Live demo</span>
        <SplitHeadline as="h2" className="display-l text-fg max-w-3xl" split="words">
          Watch a real query find its <em className="font-display italic" style={{ color: '#34d399' }}>neighbours</em>.
        </SplitHeadline>

        <div className="mt-12 flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-ink-900/70 backdrop-blur border border-accent/60 px-4 py-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            <code className="font-mono text-sm text-accent">"{demoQuery}"</code>
          </span>
          <span className="font-mono text-xs text-muted-2">
            ↳ <Ticker to={stats.p50_ms} suffix="ms" />
          </span>
          <span className="font-mono text-xs text-muted-2">
            ↳ <Ticker to={demoResults.length} suffix=" results" />
          </span>
        </div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" style={{ perspective: 1200 }}>
          {demoResults.map((r) => (
            <div key={r.id} data-card>
              <ResultCard data={r} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Add to page.tsx**

```tsx
import BeatIII_Demo from '@/components/beats/BeatIII_Demo';
// ...
<BeatI_ColdOpen />
<BeatII_Hero />
<BeatIII_Demo />
```

- [ ] **Step 3: Verify**

Run dev server, scroll into beat III. Expected: particles converge on a point (scene 1→2), query pill is centered, four result cards animate up with stagger, ticker counts up to `127ms`. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/beats/BeatIII_Demo.tsx frontend/app/page.tsx
git commit -m "feat(beats): III — live demo with mocked streaming results + latency ticker"
```

---

### Task 25: Beat IV — Four Worlds

**Files:**
- Create: `frontend/components/beats/BeatIV_FourWorlds.tsx`

- [ ] **Step 1: Create the beat**

```tsx
'use client';

import SplitHeadline from '@/components/motion/SplitHeadline';
import { modalityColors, type Modality } from '@/lib/mockData';

const MODALITIES: { id: Modality; label: string; example: string }[] = [
  { id: 'image', label: 'Image', example: 'JPG · PNG · WebP · HEIC' },
  { id: 'audio', label: 'Audio', example: 'WAV · MP3 · FLAC · OGG' },
  { id: 'video', label: 'Video', example: 'MP4 · MOV · WebM' },
  { id: 'text', label: 'Text', example: 'String up to 512 tokens' },
];

export default function BeatIV_FourWorlds() {
  return (
    <section id="beat-iv" className="relative min-h-[120vh] px-6 md:px-12 py-32">
      <div className="relative z-10 max-w-6xl mx-auto">
        <span className="eyebrow block mb-4">04 · Modalities</span>
        <SplitHeadline as="h2" className="display-l text-fg max-w-3xl" split="words">
          Four inputs. <em className="font-display italic" style={{ color: '#34d399' }}>One</em> space.
        </SplitHeadline>

        <div className="mt-16 grid grid-cols-2 gap-6 max-w-4xl">
          {MODALITIES.map((m) => (
            <div
              key={m.id}
              className="group border border-hairline bg-ink-900/40 backdrop-blur p-6 rounded-xl hover:border-accent transition-colors"
              data-cursor="pointer"
            >
              <div className="flex items-center gap-3 mb-3">
                <span style={{ background: modalityColors[m.id] }} className="w-2 h-2 rounded-full" />
                <span className="font-mono text-xs uppercase tracking-widest text-muted-2 group-hover:text-fg">
                  {m.label}
                </span>
              </div>
              <p className="font-display text-3xl text-fg leading-none">{m.example}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Add to page.tsx**

```tsx
import BeatIV_FourWorlds from '@/components/beats/BeatIV_FourWorlds';
// ...
<BeatIII_Demo />
<BeatIV_FourWorlds />
```

- [ ] **Step 3: Verify**

Scroll into beat IV. Expected: particle field splits into 4 quadrants (scene 2→3), DOM shows four cards with per-modality color dots. Hover changes the border to emerald. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/beats/BeatIV_FourWorlds.tsx frontend/app/page.tsx
git commit -m "feat(beats): IV — four worlds (modality quadrants)"
```

---

### Task 26: Beat V — Paper

**Files:**
- Create: `frontend/components/beats/BeatV_Paper.tsx`

- [ ] **Step 1: Create the beat**

```tsx
'use client';

import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { manifestoQuote } from '@/lib/mockData';
import { useReducedMotion } from '@/hooks/useReducedMotion';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function BeatV_Paper() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    if (!sectionRef.current || reduced) return;
    const ctx = gsap.context(() => {
      const words = sectionRef.current!.querySelectorAll('[data-word]');
      gsap.set(words, { yPercent: 110, opacity: 0 });
      gsap.to(words, {
        yPercent: 0, opacity: 1,
        ease: 'expo.out',
        stagger: 0.15,
        scrollTrigger: { trigger: sectionRef.current, start: 'top 60%', toggleActions: 'play none none reverse' },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section
      id="beat-v"
      ref={sectionRef}
      className="relative min-h-[100vh] flex items-center px-6 md:px-12 py-32"
      style={{ background: 'var(--color-paper)', color: 'var(--color-paper-ink)' }}
    >
      <div className="relative z-10 max-w-5xl mx-auto">
        <span className="font-mono text-xs uppercase tracking-widest" style={{ color: '#5a5a55' }}>
          — Synapse manifesto
        </span>
        <h2 className="display-xl mt-8" style={{ overflow: 'hidden' }}>
          <span data-word className="inline-block">{manifestoQuote.pre}&nbsp;</span>
          <span data-word className="inline-block" style={{ fontStyle: 'italic', color: 'var(--color-accent-d)' }}>{manifestoQuote.italic1}</span>
          <br />
          <span data-word className="inline-block">{manifestoQuote.mid}&nbsp;</span>
          <span data-word className="inline-block" style={{ fontStyle: 'italic', color: 'var(--color-accent-d)' }}>{manifestoQuote.italic2}</span>
        </h2>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Add to page.tsx with the two curtains**

Update `frontend/app/page.tsx`:

```tsx
import MasterTimeline from '@/components/motion/MasterTimeline';
import Curtain from '@/components/motion/Curtain';
import BeatI_ColdOpen from '@/components/beats/BeatI_ColdOpen';
import BeatII_Hero from '@/components/beats/BeatII_Hero';
import BeatIII_Demo from '@/components/beats/BeatIII_Demo';
import BeatIV_FourWorlds from '@/components/beats/BeatIV_FourWorlds';
import BeatV_Paper from '@/components/beats/BeatV_Paper';

export default function Home() {
  return (
    <MasterTimeline>
      <BeatI_ColdOpen />
      <BeatII_Hero />
      <BeatIII_Demo />
      <BeatIV_FourWorlds />
      <Curtain outTrigger="#beat-iv" inTrigger="#beat-v" color="#34d399" />
      <BeatV_Paper />
    </MasterTimeline>
  );
}
```

- [ ] **Step 3: Verify**

Scroll into beat V. Expected: emerald curtain sweeps up from the bottom over the dark canvas as the IV→V boundary approaches, then sweeps off the top revealing a cream section with a serif quote that builds word by word. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/beats/BeatV_Paper.tsx frontend/app/page.tsx
git commit -m "feat(beats): V — paper-flip manifesto with curtain morph #1"
```

---

### Task 27: Beat VI — System view

**Files:**
- Create: `frontend/components/beats/BeatVI_System.tsx`

- [ ] **Step 1: Create the beat**

```tsx
'use client';

import SplitHeadline from '@/components/motion/SplitHeadline';
import ArchNode from '@/components/ui/ArchNode';
import { archNodes } from '@/lib/mockData';

// Project the 3D node positions (x in [-2,2], y in [-1,1]) onto a 2D box.
function project(x: number, y: number): { left: number; top: number } {
  const left = (x + 2.4) / 4.8;
  const top = (1.4 - y) / 2.8;
  return { left, top };
}

export default function BeatVI_System() {
  return (
    <section id="beat-vi" className="relative min-h-[120vh] px-6 md:px-12 py-32">
      <div className="relative z-10 max-w-6xl mx-auto">
        <span className="eyebrow block mb-4">06 · Architecture</span>
        <SplitHeadline as="h2" className="display-l text-fg max-w-3xl" split="words">
          The architecture <em className="font-display italic" style={{ color: '#34d399' }}>is</em> the story.
        </SplitHeadline>

        <div className="relative mt-16 h-[60vh] max-w-5xl mx-auto" aria-label="Architecture diagram">
          {archNodes.map((n) => {
            const p = project(n.x, n.y);
            return <ArchNode key={n.id} node={n} left={p.left} top={p.top} />;
          })}
        </div>

        {/* Linearized list for screen readers and reduced-motion */}
        <ol className="sr-only">
          {archNodes.map((n) => (
            <li key={n.id}>
              <strong>{n.label}</strong>: {n.blurb}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Add to page.tsx with the second curtain**

Update `frontend/app/page.tsx`:

```tsx
import BeatVI_System from '@/components/beats/BeatVI_System';
// ...
<BeatV_Paper />
<Curtain outTrigger="#beat-v" inTrigger="#beat-vi" color="#ededea" />
<BeatVI_System />
```

- [ ] **Step 3: Verify**

Scroll into beat VI. Expected: paper-colored curtain sweeps up against the bottom of the paper section, then sweeps off the top revealing the dark canvas + architecture nodes. Canvas particles re-form into the system graph composition. Clicking a node opens a side sheet. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/beats/BeatVI_System.tsx frontend/app/page.tsx
git commit -m "feat(beats): VI — interactive architecture with curtain morph #2"
```

---

### Task 28: Beat VII — Outro

**Files:**
- Create: `frontend/components/beats/BeatVII_Outro.tsx`

- [ ] **Step 1: Create the beat**

```tsx
'use client';

import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import MagneticButton from '@/components/motion/MagneticButton';
import Marquee from '@/components/motion/Marquee';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export default function BeatVII_Outro() {
  const pulseRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    if (!pulseRef.current || reduced) return;
    const ctx = gsap.context(() => {
      gsap.to(pulseRef.current, {
        scale: 1.8,
        opacity: 0.4,
        repeat: -1,
        yoyo: true,
        duration: 0.4,
        ease: 'sine.inOut',
      });
    });
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section id="beat-vii" className="relative min-h-[80vh] flex flex-col items-center justify-center px-6 py-24">
      <div
        ref={pulseRef}
        aria-hidden
        style={{
          width: 12, height: 12, borderRadius: 999, background: '#34d399',
          boxShadow: '0 0 24px #34d399, 0 0 60px rgba(52,211,153,0.55)',
          marginBottom: 28,
        }}
      />
      <h2 className="display-l text-fg text-center">Start the search.</h2>
      <div className="mt-8">
        <MagneticButton variant="primary" onClick={() => (window.location.href = '/search')}>
          Open the demo
          <span aria-hidden>→</span>
        </MagneticButton>
      </div>
      <div className="mt-24 w-full">
        <Marquee items={['image', 'audio', 'video', 'text', 'image', 'audio', 'video', 'text']} />
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Add to page.tsx**

```tsx
import BeatVII_Outro from '@/components/beats/BeatVII_Outro';
// ...
<BeatVI_System />
<BeatVII_Outro />
```

- [ ] **Step 3: Verify**

Scroll all the way down. Expected: particles collapse back to a tight cluster (scene 5→6), an emerald pulse + headline + magnetic CTA appear, marquee strip loops at the bottom. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/beats/BeatVII_Outro.tsx frontend/app/page.tsx
git commit -m "feat(beats): VII — outro (pulse, CTA, marquee)"
```

---

## Phase 6 — Assembly

### Task 29: New Navbar

**Files:**
- Rewrite: `frontend/components/Navbar.tsx`

- [ ] **Step 1: Replace Navbar**

Overwrite `frontend/components/Navbar.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-40 transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(10,10,12,0.7)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--color-hairline)' : '1px solid transparent',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-4 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2" data-cursor="pointer">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          <span className="font-display text-xl font-semibold text-fg">Synapse</span>
        </a>
        <div className="hidden md:flex items-center gap-8 font-mono text-xs uppercase tracking-widest">
          <a href="#beat-iii" className="text-muted-2 hover:text-fg transition-colors" data-cursor="pointer">Demo</a>
          <a href="#beat-iv" className="text-muted-2 hover:text-fg transition-colors" data-cursor="pointer">Modalities</a>
          <a href="#beat-vi" className="text-muted-2 hover:text-fg transition-colors" data-cursor="pointer">Architecture</a>
          <a href="https://github.com/" target="_blank" rel="noreferrer" className="text-muted-2 hover:text-fg transition-colors" data-cursor="pointer">GitHub</a>
        </div>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Mount in layout.tsx**

In `frontend/app/layout.tsx`, add Navbar above SceneProvider's children but below CanvasRoot:

```tsx
import Navbar from '@/components/Navbar';
// ...
<body className="bg-ink-950 text-fg antialiased">
  <CanvasRoot />
  <Navbar />
  <SceneProvider>
    <SmoothScroll>
      <Cursor />
      {children}
    </SmoothScroll>
  </SceneProvider>
</body>
```

- [ ] **Step 3: Verify**

Run dev server, scroll. Expected: nav fades from transparent to blurred-dark after 24px of scroll, all four links visible on desktop. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/Navbar.tsx frontend/app/layout.tsx
git commit -m "feat(landing): new Navbar with scroll-blur"
```

---

### Task 30: New Footer

**Files:**
- Rewrite: `frontend/components/Footer.tsx`

- [ ] **Step 1: Replace Footer**

Overwrite `frontend/components/Footer.tsx`:

```tsx
export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-hairline px-6 md:px-12 py-12">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 font-mono text-xs">
        <div>
          <span className="font-display text-lg text-fg">Synapse</span>
          <p className="text-muted-2 mt-2 normal-case tracking-normal">
            Multimodal vector search · 1024-d shared embedding space.
          </p>
        </div>
        <div className="flex flex-col gap-2 uppercase tracking-widest">
          <span className="text-muted-2">Project</span>
          <a href="https://github.com/" className="text-fg hover:text-accent" data-cursor="pointer">Repository →</a>
          <a href="/search" className="text-fg hover:text-accent" data-cursor="pointer">Demo →</a>
        </div>
        <div className="flex flex-col gap-2 uppercase tracking-widest">
          <span className="text-muted-2">Built with</span>
          <span className="text-fg">Next.js · GSAP · OGL · Qdrant</span>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-hairline flex items-center justify-between font-mono text-[11px] text-muted-2">
        <span>© 2026 · akshttdev</span>
        <span>v1.0</span>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Add Footer to page.tsx** (NOT layout, because Footer should appear after the MasterTimeline content but still within Lenis)

```tsx
import Footer from '@/components/Footer';
// ...
<MasterTimeline>
  <BeatI_ColdOpen />
  <BeatII_Hero />
  <BeatIII_Demo />
  <BeatIV_FourWorlds />
  <Curtain outTrigger="#beat-iv" inTrigger="#beat-v" color="#34d399" />
  <BeatV_Paper />
  <Curtain outTrigger="#beat-v" inTrigger="#beat-vi" color="#ededea" />
  <BeatVI_System />
  <BeatVII_Outro />
</MasterTimeline>
<Footer />
```

- [ ] **Step 3: Verify**

Scroll to the bottom of the page. Expected: 3-column footer below the outro beat. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/Footer.tsx frontend/app/page.tsx
git commit -m "feat(landing): minimal 3-column Footer"
```

---

### Task 31: Real mock images

**Files:**
- Replace: `frontend/public/mock/thunderstorm-1.jpg`
- Replace: `frontend/public/mock/storm-poster.jpg`

- [ ] **Step 1: Download two Unsplash photos**

Run from project root:

```bash
curl -L -o frontend/public/mock/thunderstorm-1.jpg \
  "https://images.unsplash.com/photo-1429552077091-836152271555?w=1200&q=80"
curl -L -o frontend/public/mock/storm-poster.jpg \
  "https://images.unsplash.com/photo-1500674425229-f692875b0ab7?w=1200&q=80"
```

(Both Unsplash photos — license is free with optional attribution.)

- [ ] **Step 2: Verify image cards render real images**

Run dev server, scroll to demo beat. Expected: image + video cards now show photographs, not empty placeholders. Stop the server.

- [ ] **Step 3: Commit**

```bash
git add frontend/public/mock/
git commit -m "chore(landing): replace placeholder JPGs with Unsplash images"
```

---

## Phase 7 — Verify & deploy

### Task 32: Reduced-motion verification pass

- [ ] **Step 1: Toggle reduced-motion in the OS**

On macOS: System Settings → Accessibility → Display → Reduce motion → ON.

- [ ] **Step 2: Walk every beat in reduced-motion mode**

Run dev server. Walk through the page. Expected:
- Canvas shows a static composition (sceneIndex pinned to 1, no scrub).
- Headlines fade in without character animation (single fade).
- Modality rotator shows static `image / audio / video / text` list.
- Magnetic CTAs do not chase the cursor.
- Curtains do not animate; sections cut cleanly.
- Custom cursor is hidden; native cursor is restored.
- Marquee strip is frozen.

If any of these are still animating, fix the offending component to gate on `useReducedMotion()`.

- [ ] **Step 3: Turn reduced-motion OFF and re-verify the full film**

Walk every beat once with reduced-motion OFF to confirm nothing regressed.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A && git commit -m "fix(landing): reduced-motion regressions"
```

(Skip if no fixes needed.)

---

### Task 33: Lighthouse performance pass

- [ ] **Step 1: Build and start production server**

Run:

```bash
cd frontend && npm run build
npm run start
```

- [ ] **Step 2: Run Lighthouse desktop**

In Chrome DevTools → Lighthouse → Desktop → Performance only → Analyze.
Expected: Performance ≥ 90, LCP < 2.0s, CLS = 0.

If LCP is too high: the most likely cause is Fraunces 600 italic loading after first paint. Add `display: 'block'` to the Fraunces font in layout.tsx, OR remove italic from initial-paint headlines (Beat II hero) and lazy-load it.

If CLS > 0: reserve heights on any element animated with translate/scale before paint.

- [ ] **Step 3: Run Lighthouse mobile**

Same flow, Mobile profile. Expected: Performance ≥ 75.

If mobile is failing, drop `particleCount` mobile cap from 3500 to 2000 in `frontend/lib/particleConfig.ts`.

- [ ] **Step 4: Commit perf adjustments**

```bash
git add -A && git commit -m "perf(landing): tune for Lighthouse desktop/mobile targets"
```

(Skip if no adjustments needed.)

---

### Task 34: Vercel deploy

- [ ] **Step 1: Ensure `frontend/` is the deploy root**

Check `frontend/next.config.ts` is the production config. The repo root contains a `frontend/` subdir; Vercel must be pointed at it.

Create `frontend/vercel.json` if it doesn't exist:

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next"
}
```

- [ ] **Step 2: Run Vercel CLI**

If `vercel` is not installed:

```bash
npm i -g vercel
```

Then from `frontend/`:

```bash
vercel --prod
```

Follow prompts. When asked for the project root, accept the current directory (`frontend/`).

- [ ] **Step 3: Smoke-test the preview URL**

Open the URL Vercel prints. Verify:
- Page loads, no console errors.
- All beats animate as in local dev.
- Curtains fire on both boundaries.
- Lighthouse on the production URL ≥ 90 desktop.

- [ ] **Step 4: Commit vercel.json**

```bash
git add frontend/vercel.json
git commit -m "chore(landing): vercel.json — point at frontend/ subdir"
```

---

## Done

The page is on Vercel. Spec criteria §10:

1. ✅ All seven beats render in order and animate to scroll, at ≥ 55fps desktop.
2. ✅ Both curtain transitions trigger and morph correctly.
3. ✅ Reduced-motion path renders a static, readable version of every beat.
4. ✅ Lighthouse Performance ≥ 90 desktop.
5. ✅ Page deploys to Vercel without errors.
6. ✅ Every design choice is defensible against `docs/superpowers/specs/2026-05-24-synapse-cinematic-landing-design.md`.
