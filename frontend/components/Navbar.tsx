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
        WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled
          ? '1px solid var(--color-hairline)'
          : '1px solid transparent',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-4 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2" data-cursor="pointer">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
          <span className="font-display text-xl font-semibold text-[var(--color-fg)]">
            Synapse
          </span>
        </a>
        <div className="hidden md:flex items-center gap-8 font-mono text-xs uppercase tracking-widest">
          <a
            href="#beat-iii"
            className="text-[var(--color-muted-2)] hover:text-[var(--color-fg)] transition-colors"
            data-cursor="pointer"
          >
            Demo
          </a>
          <a
            href="#beat-iv"
            className="text-[var(--color-muted-2)] hover:text-[var(--color-fg)] transition-colors"
            data-cursor="pointer"
          >
            Modalities
          </a>
          <a
            href="#beat-vi"
            className="text-[var(--color-muted-2)] hover:text-[var(--color-fg)] transition-colors"
            data-cursor="pointer"
          >
            Architecture
          </a>
          <a
            href="https://github.com/"
            target="_blank"
            rel="noreferrer"
            className="text-[var(--color-muted-2)] hover:text-[var(--color-fg)] transition-colors"
            data-cursor="pointer"
          >
            GitHub
          </a>
        </div>
      </div>
    </nav>
  );
}
