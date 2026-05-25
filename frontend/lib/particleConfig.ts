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
  if (typeof window === 'undefined') return 1;
  if (cap.reduced) return 1;
  return Math.min(window.devicePixelRatio || 1, 2);
}
