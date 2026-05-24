# Synapse — Cinematic Landing Page Design

**Date:** 2026-05-24
**Owner:** akshttdev
**Scope:** Single route (`/`) replacement. Killer landing page only. No other routes touched in this push.
**Status:** Design — pending implementation plan.

---

## 1. Purpose

A single landing page that, on its own, vouches for the author's frontend craft. The page is also the marketing surface for **Synapse**, a multimodal vector search engine described in `SYNAPSE_PLAN.md`. The route ships to Vercel.

Two non-negotiables drive every decision below:

1. **The whole page must feel like one film, not seven stacked sections.** Scenes flow into one another via a continuous shared canvas; transitions are part of the storytelling.
2. **Both major and micro motion** must be present and consistent throughout. Major motion carries narrative; micro motion makes every element feel alive.

Backend is currently broken; this spec assumes all data is mocked locally. No API integration is in scope.

## 2. Visual System

### 2.1 Typography

| Role | Family | Weights | Notes |
|---|---|---|---|
| Display | **Fraunces** | 500, 600 + italics | All headlines. Italic used for the accent word in every headline. |
| Body | **Inter** | 400, 500, 600 | All paragraph copy, buttons, nav. |
| Eyebrows / numbers | **JetBrains Mono** | 500 | Section labels, latency ticker, stats values, "↳" annotations. |

Fonts load via `next/font/google` with `display: 'swap'`, preloaded. Critical headlines render with `font-display: optional` to avoid FOUT in the cold-open beat.

Type scale (clamp-based):

- Display XL: `clamp(64px, 12vw, 168px)` — used in Hero (Beat II) and Paper (Beat V).
- Display L: `clamp(48px, 7vw, 96px)` — used in Beats III, IV, VI, VII.
- Body L: `18px / 1.6`
- Body M: `15px / 1.55`
- Eyebrow: `12px / 1`, letter-spacing `0.18em`, uppercase.

### 2.2 Palette

```
ink-950   #03070a    page bg (default scenes)
ink-900   #0a0a0c    cards / panels
ink-800   #0d0e11    elevated surfaces
paper     #ededea    paper-flip section bg
paper-ink #0a0a0c    paper-flip text
accent    #34d399    emerald (CTAs, italic accent word, accent particles)
accent-d  #145740    emerald used on cream
image     #6366f1    indigo  — modality color
audio     #f472b6    pink    — modality color
video     #38bdf8    sky     — modality color
text      #fbbf24    amber   — modality color
muted-fg  #b6b8bf    body copy on dark
muted-2   #8b8d95    eyebrows, secondary text
hairline  #1f2024    borders, dashed dividers
```

The page is ink-default. **Beat V (Paper)** is the only cream scene. Curtain transitions in/out of paper are the two scripted "cuts" in the film (see §4.4 and §4.5).

### 2.3 Motion vocab

**Major (timeline-keyed, scrub:1):**

- M1 — Single shared OGL particle field that morphs between compositions
- M2 — Camera motion (dolly-in, pull-back, lock) driven by ScrollTrigger scrub
- M3 — Scroll-pinned sections (Lenis + ScrollTrigger `pin: true`)
- M4 — GSAP SplitText character/word reveals on each headline
- M5 — Modality word-rotator inside the hero headline
- M6 — Curtain morph transitions at two beat boundaries

**Micro (interaction-keyed, immediate):**

- m1 — Magnetic CTAs (mouse-follow with spring damp)
- m2 — Custom cursor (small dot, expands over interactive elements)
- m3 — Hover tilts on demo cards (3d-transform, perspective 1000px)
- m4 — Number count-ups on stats (intersection-observer triggered)
- m5 — Marquee strip (continuous CSS animation, paused on hover)
- m6 — Live "ms" ticker on the demo card, ramping `0 → 127` over 1.2s
- m7 — Lenis smooth scroll, throughout the page
- m8 — Mouse parallax on the particle field (±2-3° rotation, easeOutQuad)

## 3. Technical Architecture

### 3.1 The single-canvas, single-timeline pattern

The whole film is governed by **one shared `<canvas>` element** and **one master GSAP timeline** that ScrollTrigger scrubs to scroll position.

- The canvas is a **fixed-position OGL renderer** sitting beneath the DOM tree at `z-index: 0`. It is mounted once at `app/layout.tsx` level and never unmounts.
- The OGL scene contains:
  - One `Mesh` of `~8000` GPU-instanced particles (each: position vec3, color vec3, target vec3, modality int8).
  - Shader uniforms for: camera position, fog density, particle scale, mouse offset, scene index (float, interpolated by GSAP).
  - The vertex shader interpolates between *current* and *target* positions using `mix(pos, target, sceneT)`. The CPU never moves particles; the GPU does.
- The master timeline keyframes the scene index, camera position, fog density, and particle scale on a 0→1 scroll progress.
- DOM overlays (headlines, demo cards, system diagram, footer) live above the canvas at `z-index: 10` and are also scrubbed by the same timeline — their `y` translates and opacities are part of the same scroll progress.

**Why one canvas / one timeline:** unmounting and remounting a canvas between sections kills the cinematic continuity (a one-frame black flash, no momentum carryover). One canvas means particles physically rearrange into the next composition — the core of the "one film" feel.

### 3.2 Stack

All already installed in `frontend/package.json`:

- **GSAP 3.13** — animation engine + ScrollTrigger + SplitText (free in v3.13).
- **Lenis 1.3** — smooth scroll, fed into ScrollTrigger via `lenis.on('scroll', ScrollTrigger.update)`.
- **OGL 1.0** — WebGL renderer for the particle field (lighter than three.js, fits the "show me your craft" framing).
- **Next.js 16** App Router, React 19, Tailwind v4.
- **shadcn/ui** primitives for nav, buttons, sheet — but used sparingly; this page is mostly custom.

No new dependencies are required. **MorphSVG is NOT used** (paid). The two curtain morphs animate the SVG `d` attribute directly via GSAP — point counts match between start and end states, so this works without a plugin.

### 3.3 File layout (within existing `frontend/`)

```
frontend/
  app/
    layout.tsx                   # mounts <CanvasRoot/> and <SmoothScroll/> once
    page.tsx                     # composes the 7 beats
  components/
    canvas/
      CanvasRoot.tsx             # fixed canvas, OGL renderer, exposes scene API
      particleProgram.ts         # vertex + fragment shaders, attrs, uniforms
      compositions.ts            # named target-position arrays per beat
      useCanvasScene.ts          # client hook → scrolls scene index + camera
    motion/
      MasterTimeline.tsx         # creates the gsap.timeline + ScrollTriggers
      SplitHeadline.tsx          # SplitText wrapper with reduced-motion fallback
      MagneticButton.tsx         # CTA with mouse-follow spring
      Cursor.tsx                 # custom cursor dot
      Curtain.tsx                # SVG curtain morph between two beats
      ModalityRotator.tsx        # cycles "image | audio | video | text"
      Ticker.tsx                 # number count-up
      Marquee.tsx                # infinite CSS marquee
    beats/
      BeatI_ColdOpen.tsx
      BeatII_Hero.tsx
      BeatIII_Demo.tsx
      BeatIV_FourWorlds.tsx
      BeatV_Paper.tsx
      BeatVI_System.tsx
      BeatVII_Outro.tsx
    ui/
      ResultCard.tsx             # mocked search result card variants
      ArchNode.tsx               # interactive node in the system diagram
  lib/
    mockData.ts                  # canned demo query results, system nodes, stats
    splineLerp.ts                # cubic-bezier path util for camera moves
```

Existing components (`Hero.tsx`, `Features.tsx`, `Architecture.tsx`, `HowItWorks.tsx`, `UseCases.tsx`, `CTA.tsx`) are **deleted** at the end of the implementation. `Navbar.tsx` and `Footer.tsx` are rewritten in place.

### 3.4 Scroll math

Total scroll height is `~700vh` (configurable, this gives ~6-7 viewport-pages of scroll, comfortable on a trackpad). Beats occupy these progress windows on the master timeline:

| Beat | Scroll % | Section height |
|---|---|---|
| I — Cold open | 0 – 8% | ~50vh, with 3s autoplay before scroll engages |
| II — Hero | 8 – 22% | ~100vh, pinned |
| III — Demo | 22 – 40% | ~120vh, pinned during card reveal |
| IV — Four worlds | 40 – 58% | ~120vh, pinned through camera pull-back |
| V — Paper | 58 – 72% | ~100vh, pinned through word-morph |
| VI — System | 72 – 90% | ~120vh, pinned during edge animation |
| VII — Outro | 90 – 100% | ~80vh |

`prefers-reduced-motion`: all `scrub` values are dropped, sections become naturally-flowing 100vh blocks, particles are reduced to a static background, and all transforms become opacity fades.

## 4. The Film — Beat-by-beat

> Every beat names: **the canvas state**, **the camera state**, **the DOM overlay**, and **the transition into the next beat**. Headlines below are final copy.

### 4.1 Beat I — Cold open (0–8%)

- **Canvas:** 1 particle visible (the rest cluster off-screen behind camera). Slow heartbeat pulse at 0.8 Hz via `scale` shader uniform.
- **Camera:** locked at origin, looking forward.
- **DOM:** none — no nav, no copy. Just the pulse on black.
- **Behavior:** the first **3 seconds** ignore scroll; the heartbeat plays. After 3s (or on first scroll input), nav fades in from top (`opacity` + `translateY(-8px)`) and the scroll-driven timeline begins.
- **Transition out:** the pulse "explodes" — particles fan outward into their hero positions over the next ~6% of scroll.

### 4.2 Beat II — Hero / Reveal (8–22%) — pinned

- **Canvas:** all ~8000 particles distributed across a wide cloud composition. Subtle drift (per-particle noise via shader time).
- **Camera:** wide static, looking at the cloud.
- **DOM overlay:**
  - **Headline (Display XL):** `Search anything with anything.`
  - The word `anything` (the second occurrence) is a `ModalityRotator` cycling through `image · audio · video · text` every 1.6s with a 200ms enter/exit (italic, accent emerald).
  - **Sub (Body L, muted-fg):** `One 1024-dimensional embedding space for every modality. Query with anything, retrieve anything.`
  - **Two CTAs:** `[Try the demo →]` (primary, magnetic) and `[Read architecture]` (ghost).
- **Headline reveal:** `SplitHeadline` reveals char-by-char with `stagger: 0.02s`, `y: 100%`, `ease: 'expo.out'`, triggered as Beat II enters its pinned range.
- **Mouse parallax:** ±2-3° rotation on the particle field, eased.
- **Transition out:** particles begin gravitational pull toward viewport center (the demo query pill).

### 4.3 Beat III — Live demo (22–40%) — pinned

- **Canvas:** particles converge along curved trajectories toward a central point, dragging short trails (shader-side: position lerps to `target`, alpha = `1.0 - distance / convergence_radius`).
- **Camera:** dolly-in to ~60% of original framing.
- **DOM overlay:**
  - A floating **query pill** drops into the center: `"thunderstorm"` in JetBrains Mono, emerald border, glassy backdrop-blur.
  - Below it, **mocked result cards** materialise in a perspective grid (image card, audio waveform card, video poster card, text snippet card). Cards have:
    - Modality badge top-left (per-modality color)
    - Score badge top-right (`0.91`, `0.87`, etc.)
    - Hover tilt (3d perspective)
  - Cards animate in with `stagger: 0.08s`, `y: 30px`, `opacity: 0 → 1`, `rotateX: 8deg → 0deg`.
  - **Live latency ticker** above the grid: `↳ 0…127ms` (JetBrains Mono, count-up via `useTransform`).
- **Mock data:** 4 cards, hardcoded in `lib/mockData.ts`. Image URLs from Unsplash via `next/image` with their inline placeholders.
- **Transition out:** as scroll advances, the cards push outward to the four corners, becoming the seeds of the four modality clusters in Beat IV.

### 4.4 Beat IV — Four worlds (40–58%) — pinned

- **Canvas:** the single cloud splits into 4 clusters arranged 2×2 in 3D space. Each cluster colored by its modality (indigo / pink / sky / amber).
- **Camera:** pulls back ~1.4x, rotates slightly so the four clusters are visible as separate volumes.
- **DOM overlay:**
  - **Eyebrow:** `04 · MODALITIES`
  - **Headline (Display L):** `Four inputs. *One* space.`
  - **Four floating labels** anchored over their respective clusters: `IMAGE`, `AUDIO`, `VIDEO`, `TEXT`. Hover any label: that cluster's particles ripple outward in a wave (`distance * sin(time - distance * k)`), and a small example artifact reveals (audio waveform stub, video frame strip, image grid, text snippet) in a side panel.
- **Transition out:** **CURTAIN MORPH #1** fires — emerald (`#34d399`) curtain rises from the bottom using the user's exact path morph:
  - Start: `M 0 100 V 100 Q 50 100 100 100 V 100 z` (flat at bottom)
  - Mid: `M 0 100 V 50 Q 50 0 100 50 V 100 z` (curve up) — `power2.in`
  - End: `M 0 0 V 0 Q 50 0 100 0 V 0 z` (swept off top) — `power2.out`
  - Scroll-scrubbed across the Beat IV → V boundary. Behind the curtain, the canvas opacity drops to 0 and the body bg transitions to `paper`.

### 4.5 Beat V — Paper (58–72%) — pinned

- **Canvas:** invisible (opacity 0).
- **DOM (cream scene):**
  - Body background `paper`, text `paper-ink`.
  - **Eyebrow (mono, muted):** `— Synapse manifesto`
  - **Quote (Display XL, serif):** `Search is not a feature. It is a fabric.`
  - The italic words `feature` and `fabric` are emerald (`accent-d` on cream).
  - Word-by-word morph: each word swaps from its previous position to its final position via SplitText. As scroll advances inside the pin, the quote builds line by line.
- **Transition out:** **CURTAIN MORPH #2** — same path, but in **paper color** (`#ededea`) sweeping down to reveal the dark canvas re-emerging behind it.

### 4.6 Beat VI — System view (72–90%) — pinned

- **Canvas:** the 4 clusters re-form, but now arranged as **nodes in an architecture graph**: `Browser → Next.js → FastAPI → Redis/Celery → ImageBind → Qdrant → S3`. Edges between nodes are rendered with a second OGL primitive (line geometry).
- **Particles flow along edges** as if real requests are happening: position interpolated along each edge's spline at a per-edge rate.
- **Camera:** pulls all the way back, slight orbit.
- **DOM overlay:**
  - **Eyebrow:** `06 · ARCHITECTURE`
  - **Headline (Display L):** `The architecture *is* the story.`
  - Each node has a clickable hotspot. On click, a `Sheet` slides in from the right with: rationale (1 paragraph), repo file path (link), alternatives considered. Hotspots positions are derived from node 3D coords projected to 2D each frame.
- **Transition out:** all particles begin to drift inward toward viewport center.

### 4.7 Beat VII — Outro (90–100%)

- **Canvas:** all particles collapse into a single bright emerald pulse at viewport center. Heartbeat pulse identical to Beat I, but now at 1.6 Hz (faster, building energy).
- **Camera:** locked back to origin.
- **DOM overlay:**
  - **Headline (Display L, centered):** `Start the search.`
  - **CTA:** a single magnetic button — the pulse from the canvas appears to *be* the button (DOM circle 12px overlaying the canvas particle, both pulsing). Click → `/search` (404 for now, that's fine; we're shipping the film, not the app).
  - **Footer slides in from below:** minimal 3-column (links, repo, credit).
- **Marquee strip** above footer: looping `image · audio · video · text · image · audio · …` in serif italic, 32px, `accent-d` on ink.

## 5. Mocked data

`lib/mockData.ts` exports:

```ts
export const demoQuery = 'thunderstorm';
export const demoResults: ResultCard[] = [
  { id: 'r1', modality: 'image', score: 0.91, thumb: '/mock/thunderstorm-1.jpg', credit: 'Unsplash' },
  { id: 'r2', modality: 'audio', score: 0.88, waveformPeaks: [/* 128 floats */], duration: 12.4 },
  { id: 'r3', modality: 'video', score: 0.85, poster: '/mock/storm-poster.jpg', duration: 8.1 },
  { id: 'r4', modality: 'text', score: 0.82, snippet: 'A thunderstorm is a storm characterized by…', source: 'Wikipedia' },
];

export const stats = { p50_ms: 127, p99_ms: 312, points: 1742, gpu_seconds: 38 };

export const archNodes = [
  { id: 'browser', label: 'Browser', x: -2, y: 0,    z: 0 },
  { id: 'next',    label: 'Next.js', x: -1, y: 0.5,  z: 0 },
  { id: 'api',     label: 'FastAPI', x: 0,  y: 0,    z: 0 },
  { id: 'queue',   label: 'Celery',  x: 0,  y: -0.8, z: 0 },
  { id: 'model',   label: 'ImageBind', x: 1, y: 0.5, z: 0 },
  { id: 'vec',     label: 'Qdrant',    x: 2, y: 0,   z: 0 },
  { id: 's3',      label: 'S3',        x: 0.5, y: 0.9, z: 0 },
];

export const archEdges = [
  ['browser','next'], ['next','api'], ['api','queue'], ['queue','model'],
  ['model','vec'], ['api','vec'], ['api','s3'],
];
```

3-5 mock images live in `frontend/public/mock/` (committed; sourced from Unsplash with credit in the source comments). Audio waveform peaks are inline floats — no actual audio file. The video poster is a still JPG; no video plays.

## 6. Accessibility

- `prefers-reduced-motion: reduce`:
  - All `scrub` timelines drop to `scrub: false`, sections become discrete, headlines opacity-fade in (no SplitText).
  - Particle field is rendered statically (no per-frame updates).
  - Curtain morphs collapse to instant color swaps.
  - Modality rotator becomes a static `image / audio / video / text` slash-list.
- All interactive elements are real `<button>` / `<a>`, keyboard-focusable, `focus-visible: ring-2 ring-accent`.
- Architecture nodes (Beat VI) are also reachable via tab; the Sheet opens on `Enter`.
- Headlines remain as real `<h1>`/`<h2>` text; SplitText wraps characters in `<span aria-hidden>` while keeping a visually-hidden full version for screen readers.
- The custom cursor is purely additive — the native cursor is never hidden on touch devices or when reduced-motion is set.

## 7. Performance budget

| Metric | Target | Mechanism |
|---|---|---|
| First contentful paint | < 1.2s | Server-render nav + hero text; defer canvas to client; preload Fraunces 600 italic only |
| Largest contentful paint | < 2.0s | Headline is the LCP, served as plain text before canvas mounts |
| Cumulative layout shift | 0 | Reserve canvas height with fixed positioning; reserve image heights |
| Total JS (gzipped) | < 220 KB | GSAP ~75KB, Lenis ~5KB, OGL ~25KB, app code ~100KB |
| Frame rate | ≥ 55 fps desktop, ≥ 45 fps mobile | Single canvas, instanced rendering, 8K particles, no per-frame allocations |
| Lighthouse Performance | ≥ 90 desktop, ≥ 75 mobile | Vercel Edge serves static page; only the canvas is client |

Particle count is **configurable per device**:

```ts
const PARTICLE_COUNT = (() => {
  if (typeof window === 'undefined') return 0;
  const cores = navigator.hardwareConcurrency ?? 4;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = matchMedia('(max-width: 768px)').matches;
  if (reduced) return 800;
  if (mobile) return 3500;
  if (cores >= 8) return 12000;
  return 8000;
})();
```

## 8. Out of scope

- Any route other than `/`.
- Real backend integration; no `/search` endpoint hit, no `/api/v1/*` calls.
- Audio playback (waveforms are visual only).
- Video playback.
- The architecture node `Sheet` showing real benchmark charts (the sheet is shipped; the chart inside is a placeholder line).
- Mobile-specific touch interactions for the architecture diagram (it falls back to a static list under `md:`).
- Internationalization. English only.
- Dark/light mode toggle. Page is mostly dark with one cream beat — that's the system.
- SEO meta beyond `<title>`, `<meta name="description">`, OG tags.

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| 8K particles + scrub timeline tanks on low-end laptops | `PARTICLE_COUNT` adapts to `hardwareConcurrency`; the shader is the only per-frame work |
| Lenis + ScrollTrigger pin desync on Safari | Use `lenis.on('scroll', ScrollTrigger.update)` and `ScrollTrigger.scrollerProxy(...)` — known working pattern |
| Canvas under DOM causes click-through issues | Canvas is `pointer-events: none` always; interactive overlays own their own pointer events |
| `next/font` blocks first paint with Fraunces 600 italic | Use `display: 'swap'`, accept brief Times New Roman fallback; reduce Fraunces subset to Latin-only |
| OGL hot reload during dev causes WebGL context leaks | Single canvas mounted once at `layout.tsx`; OGL renderer guards against double-init |
| Vercel build time blows up | All assets static; Next.js 16 turbopack build should complete < 30s |

## 10. Success criteria

The page ships when:

1. All seven beats render in order and animate to scroll, on desktop Chrome at ≥ 55 fps.
2. Both curtain transitions trigger and morph correctly between dark/paper scenes.
3. Reduced-motion path renders a static, readable version of every beat.
4. Lighthouse Performance ≥ 90 desktop.
5. Page deploys to Vercel without errors and is reachable at the project's preview URL.
6. The author can show the page in a portfolio review and credibly defend every design choice in this document.

