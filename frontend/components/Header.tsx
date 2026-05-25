'use client';

import { useEffect, useState } from 'react';
import { getLenis, scrollToId } from '@/lib/lenis';
import Flower from '@/components/icons/Flower';

const NAV_LINKS: { label: string; id: string }[] = [
  { label: 'Demo', id: 'demo' },
  { label: 'Architecture', id: 'architecture' },
  { label: 'Docs', id: 'docs' },
  { label: 'FAQ', id: 'faq' },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  const handleNav = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    // Restore overflow + resume Lenis synchronously so the scrollTo isn't
    // swallowed by the still-stopped instance / locked html element. The
    // useEffect cleanup will also run these as `open` flips, but we can't
    // wait for it — the click handler needs scroll to fire now.
    document.documentElement.style.overflow = '';
    getLenis()?.start();
    setOpen(false);
    // Defer one frame so the menu starts collapsing before the page scrolls.
    requestAnimationFrame(() => scrollToId(id));
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const lenis = getLenis();
    lenis?.stop();
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      lenis?.start();
      document.documentElement.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 w-full bg-transparent">
      <div className="relative flex items-center px-5 md:px-10 py-4">
        {/* Brand */}
        <a href="/" className="flex items-center gap-2.5 group">
          <Flower
            className="text-white transition-transform duration-500 ease-out group-hover:rotate-90"
            size={20}
          />
          <span className="font-display text-[20px] md:text-[22px] leading-none tracking-tight text-white">
            Synapse
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-7 font-mono text-[10.5px] uppercase tracking-[0.22em]">
          {NAV_LINKS.map(({ label, id }) => (
            <a
              key={label}
              href={`#${id}`}
              onClick={(e) => handleNav(e, id)}
              className="group relative py-1 transition-colors duration-200 text-white/75 hover:text-white cursor-pointer"
            >
              {label}
              <span
                aria-hidden
                className="pointer-events-none absolute left-0 right-0 -bottom-0.5 h-px origin-center scale-x-0 transition-transform duration-300 ease-out group-hover:scale-x-100 bg-white"
              />
            </a>
          ))}
        </nav>

        {/* Desktop GitHub button */}
        <a
          href="https://github.com/akshttdev/synapse"
          target="_blank"
          rel="noreferrer"
          className="ml-auto hidden md:inline-flex group items-center gap-2 rounded-lg px-4 py-2 text-[11px] font-mono uppercase tracking-[0.18em] transition-[background-color,color,border-color,box-shadow] duration-300 ease-out bg-white border border-white text-black hover:bg-transparent hover:text-white hover:border-white/55 hover:shadow-[0_0_28px_-2px_rgba(255,255,255,0.25)]"
        >
          <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.13c-3.2.7-3.87-1.36-3.87-1.36-.52-1.34-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.78 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.58.23 2.75.11 3.04.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.13v3.16c0 .31.21.67.79.55C20.71 21.39 24 17.08 24 12 24 5.65 18.85.5 12 .5z" />
          </svg>
          GitHub
        </a>

        {/* Mobile menu trigger — rotating flower (above the overlay so it stays clickable) */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          className={`ml-auto md:hidden relative z-[60] inline-flex items-center justify-center w-10 h-10 rounded-full border cursor-pointer transition-colors duration-300 ${
            open
              ? 'border-[#0a0a0c]/25 bg-white'
              : 'border-white/25 bg-white/5 backdrop-blur-sm'
          }`}
        >
          <Flower
            className={`transition-transform duration-500 ease-out ${
              open ? 'rotate-[135deg] text-[#0a0a0c]' : 'rotate-0 text-white'
            }`}
            size={20}
          />
        </button>
      </div>

      {/* Mobile full-screen overlay — slides in from the right */}
      <div
        aria-hidden={!open}
        className={`md:hidden fixed inset-0 z-50 bg-white text-[#0a0a0c] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Subtle dot grid */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-[0.35]"
          style={{
            backgroundImage:
              'radial-gradient(rgba(10,10,12,0.08) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative h-full flex flex-col px-5 pt-24 pb-10">
          {/* Section tag */}
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#0a0a0c]/45">
            00 · Menu
          </span>

          {/* Big nav links */}
          <nav className="mt-8 flex flex-col">
            {NAV_LINKS.map(({ label, id }, i) => (
              <a
                key={label}
                href={`#${id}`}
                onClick={(e) => handleNav(e, id)}
                className="group relative flex items-baseline justify-between py-5 border-t border-[#0a0a0c]/10 last:border-b last:border-b-[#0a0a0c]/10 cursor-pointer"
                style={{
                  transitionProperty: 'opacity, transform',
                  transitionDuration: '500ms',
                  transitionTimingFunction: 'ease-out',
                  transitionDelay: open ? `${120 + i * 60}ms` : '0ms',
                  opacity: open ? 1 : 0,
                  transform: open ? 'translateX(0)' : 'translateX(20px)',
                }}
              >
                <span className="font-display text-[clamp(36px,11vw,56px)] leading-[1] tracking-tight uppercase group-hover:text-[#2563eb] transition-colors duration-200">
                  {label}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#0a0a0c]/40">
                  0{i + 1}
                </span>
              </a>
            ))}
          </nav>

          {/* Footer of the menu */}
          <div className="mt-auto pt-10 flex items-center justify-between gap-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#0a0a0c]/45">
              Synapse · 2026
            </span>
            <a
              href="https://github.com/akshttdev/synapse"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg px-4 py-3 text-[11px] font-mono uppercase tracking-[0.18em] bg-[#0a0a0c] text-white cursor-pointer transition-colors hover:bg-[#1a1a1c]"
            >
              <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.13c-3.2.7-3.87-1.36-3.87-1.36-.52-1.34-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.78 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.58.23 2.75.11 3.04.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.13v3.16c0 .31.21.67.79.55C20.71 21.39 24 17.08 24 12 24 5.65 18.85.5 12 .5z" />
              </svg>
              GitHub
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
