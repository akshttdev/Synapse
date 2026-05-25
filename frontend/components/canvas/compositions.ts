import { archNodes, archEdges } from '@/lib/mockData';

/**
 * Each composition returns an array of length count*3, packed as
 * [x, y, z, x, y, z, ...] in world space (~5 units across).
 */

const rand = (seed: number) => {
  const s = Math.sin(seed * 12.9898) * 43758.5453;
  return s - Math.floor(s);
};

export function compositionColdOpen(count: number): Float32Array {
  // All particles parked off-screen behind camera, except #0 at origin.
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    arr[i * 3 + 0] = 0;
    arr[i * 3 + 1] = 0;
    arr[i * 3 + 2] = -10;
  }
  arr[0] = 0;
  arr[1] = 0;
  arr[2] = 0;
  return arr;
}

export function compositionHeroCloud(count: number): Float32Array {
  // Spherical cloud in front of camera, soft falloff.
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
  // 70% pulled toward origin (the query), 30% ring at radius ~3.
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
      const theta = u * Math.PI * 2;
      arr[i * 3 + 0] = 3.0 * Math.cos(theta);
      arr[i * 3 + 1] = 3.0 * Math.sin(theta);
      arr[i * 3 + 2] = -1.5;
    }
  }
  return arr;
}

export function compositionFourWorlds(count: number): Float32Array {
  // 2x2 quadrants, one per modality.
  const arr = new Float32Array(count * 3);
  const centers: [number, number, number][] = [
    [-1.6,  1.0, 0],
    [ 1.6,  1.0, 0],
    [-1.6, -1.0, 0],
    [ 1.6, -1.0, 0],
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
  // Park everything off-screen; canvas opacity is 0 during paper.
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
  // Collapse to a tight sphere around origin.
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
