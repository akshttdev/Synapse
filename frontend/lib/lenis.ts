import type Lenis from 'lenis';

/**
 * Module-level handle to the single Lenis instance created by
 * <SmoothScroll>. Components like the nav header use this to trigger
 * programmatic smooth scrolls. Unsubscribed on unmount.
 */
let instance: Lenis | null = null;

export function setLenis(l: Lenis | null): void {
  instance = l;
}

export function getLenis(): Lenis | null {
  return instance;
}

/**
 * Smooth-scroll to a section by id. Falls back to native scroll if
 * Lenis isn't ready (SSR, JS disabled, reduced motion).
 */
export function scrollToId(id: string, offset = 0): void {
  if (typeof window === 'undefined') return;
  const target = document.getElementById(id);
  if (!target) return;
  if (instance) {
    // Make sure Lenis isn't paused (e.g. by an open mobile menu) so the
    // scrollTo actually runs.
    instance.start();
    instance.scrollTo(target, {
      offset,
      duration: 2.2,
      easing: (t: number) => 1 - Math.pow(1 - t, 4),
    });
  } else {
    target.scrollIntoView({ behavior: 'smooth' });
  }
}
