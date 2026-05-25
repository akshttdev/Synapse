/**
 * Global daisy-petal burst system.
 *
 * `burstAt(x, y)` spawns a flurry of petals from a viewport coordinate.
 * A single <BurstLayer/> mounted at the root subscribes and renders them
 * in a portal, so any component anywhere can request a burst without
 * carrying its own particle state.
 */

export type Particle = {
  id: number;
  startX: number;
  startY: number;
  size: number;
  drift: number;
  launchHeight: number;
  rotation: number;
  petal: string;
  center: string;
  core: string;
};

const PETAL_OPTIONS = ['#ffffff', '#fef9c3', '#fef3c7', '#ffffff', '#fefce8'];
const CENTER_OPTIONS = ['#fbbf24', '#facc15', '#f59e0b', '#fde047'];
const CORE_OPTIONS = ['#f59e0b', '#d97706', '#ca8a04'];

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

let nextId = 0;
const listeners = new Set<(p: Particle) => void>();

export function subscribe(fn: (p: Particle) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function burstAt(x: number, y: number, count?: number): void {
  const n = count ?? 8 + Math.floor(Math.random() * 6);
  for (let i = 0; i < n; i++) {
    const particle: Particle = {
      id: nextId++,
      startX: x,
      startY: y,
      size: 16 + Math.random() * 32,
      drift: (Math.random() - 0.5) * 320,
      launchHeight: 90 + Math.random() * 180,
      rotation: (Math.random() - 0.5) * 1080,
      petal: pick(PETAL_OPTIONS),
      center: pick(CENTER_OPTIONS),
      core: pick(CORE_OPTIONS),
    };
    listeners.forEach((fn) => fn(particle));
  }
}
