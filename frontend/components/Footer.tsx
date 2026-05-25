import Flower from '@/components/icons/Flower';

const LINKS: { heading: string; items: { label: string; href: string }[] }[] = [
  {
    heading: 'Product',
    items: [
      { label: 'Live Demo', href: '#demo' },
      { label: 'Architecture', href: '#architecture' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  {
    heading: 'Build',
    items: [
      { label: 'Docs', href: '#docs' },
      { label: 'GitHub', href: 'https://github.com/akshttdev/synapse' },
      { label: 'Changelog', href: '#' },
    ],
  },
  {
    heading: 'Reach',
    items: [
      { label: 'Twitter', href: 'https://x.com/akshttdev' },
      { label: 'LinkedIn', href: 'https://www.linkedin.com/in/akshatdhami/' },
      { label: 'Contact', href: 'mailto:akshttt.dev@gmail.com' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="relative bg-[#02110f] text-white overflow-hidden">
      {/* Subtle dot grid background */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.18]"
        style={{
          backgroundImage:
            'radial-gradient(rgba(255,255,255,0.55) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-24 pb-10">
        {/* Big wordmark */}
        <div className="flex items-end justify-between gap-8 flex-wrap pb-16 border-b border-white/12">
          <div>
            <div className="flex items-center gap-3">
              <Flower className="text-white" size={28} />
              <span className="font-display text-[clamp(32px,3.4vw,48px)] tracking-tight leading-none">
                Synapse
              </span>
            </div>
            <p className="mt-5 font-mono uppercase tracking-[0.22em] text-[11px] leading-[1.85] text-white/65 max-w-md">
              One 1024-Dimensional Embedding Space For Image · Audio · Video ·
              Text. Search Anything With Anything.
            </p>
          </div>
          <a
            href="#demo"
            className="inline-flex items-center gap-2.5 rounded-lg bg-[#2563eb] text-white px-6 py-3 font-mono uppercase tracking-[0.18em] text-[11.5px] leading-none transition-[background-color] duration-300 ease-out hover:bg-[#1d4ed8]"
          >
            Try The Demo
            <span aria-hidden>→</span>
          </a>
        </div>

        {/* Link columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 pt-14">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">
              Build · 2026
            </span>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-white/70 leading-[1.6]">
              v1.0 ·{' '}
              <span className="text-[#2563eb]">stable</span>
            </p>
          </div>
          {LINKS.map((col) => (
            <div key={col.heading}>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">
                {col.heading}
              </span>
              <ul className="mt-4 flex flex-col gap-2.5">
                {col.items.map((item) => {
                  const isExternal =
                    item.href.startsWith('http') ||
                    item.href.startsWith('mailto:');
                  return (
                    <li key={item.label}>
                      <a
                        href={item.href}
                        target={isExternal ? '_blank' : undefined}
                        rel={isExternal ? 'noreferrer' : undefined}
                        className="font-mono uppercase tracking-[0.18em] text-[11.5px] text-white/80 hover:text-white transition-colors duration-200"
                      >
                        {item.label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/45">
          <span>© 2026 · Synapse · Built By Akshat</span>
          <span>Next · GSAP · Lenis · Qdrant · ImageBind</span>
        </div>
      </div>
    </footer>
  );
}
