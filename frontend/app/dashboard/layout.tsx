'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Flower from '@/components/icons/Flower';

type NavItem = {
  label: string;
  href: string;
  badge?: string;
  disabled?: boolean;
};

const NAV: NavItem[] = [
  { label: 'Overview', href: '/dashboard' },
  { label: 'Search', href: '/dashboard/search' },
  { label: 'Upload', href: '/dashboard/upload' },
  { label: 'Collections', href: '/dashboard/collections', badge: 'soon', disabled: true },
  { label: 'Activity', href: '/dashboard/activity', badge: 'soon', disabled: true },
  { label: 'Settings', href: '/dashboard/settings', badge: 'soon', disabled: true },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname?.startsWith(href);
  };

  const closeMobile = () => setOpen(false);

  return (
    <div className="min-h-screen bg-[#f6f5f0] text-[#0a0a0c]">
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between px-5 py-3 bg-[#0a0a0c] text-white border-b border-white/10">
        <Link href="/dashboard" className="flex items-center gap-2.5" onClick={closeMobile}>
          <Flower className="text-white" size={18} />
          <span className="font-mono text-[12px] uppercase tracking-[0.22em] leading-none">Synapse</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-white/25 bg-white/5"
        >
          <Flower
            className={`text-white transition-transform duration-300 ${
              open ? 'rotate-[135deg]' : 'rotate-0'
            }`}
            size={16}
          />
        </button>
      </div>

      <div className="flex">
        {/* Sidebar — desktop sticky, mobile slide-in */}
        <aside
          className={`fixed md:sticky top-0 left-0 z-20 h-screen w-[230px] shrink-0 bg-[#0a0a0c] text-white border-r border-white/10 flex flex-col transform transition-transform duration-400 ease-out ${
            open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        >
          {/* Brand */}
          <div className="px-5 pt-6 pb-8 hidden md:block">
            <Link href="/" className="group flex items-center gap-2.5">
              <Flower
                className="text-white transition-transform duration-500 group-hover:rotate-90"
                size={20}
              />
              <span className="font-mono text-[13px] uppercase tracking-[0.22em] leading-none">
                Synapse
              </span>
            </Link>
            <p className="mt-4 font-mono text-[9.5px] uppercase tracking-[0.22em] text-white/45">
              Dashboard · v1.0
            </p>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 pt-6 md:pt-0 flex flex-col gap-0.5 overflow-y-auto">
            <span className="px-3 pb-2 font-mono text-[9px] uppercase tracking-[0.24em] text-white/35">
              Workspace
            </span>
            {NAV.map((item) => {
              const active = isActive(item.href);
              const disabled = item.disabled;
              const cls = `group flex items-center justify-between px-3 py-2.5 rounded-md font-mono text-[11.5px] uppercase tracking-[0.18em] transition-colors duration-200 ${
                active
                  ? 'bg-white/[0.10] text-white'
                  : disabled
                    ? 'text-white/30 cursor-not-allowed'
                    : 'text-white/70 hover:text-white hover:bg-white/[0.05]'
              }`;
              const inner = (
                <>
                  <span className="flex items-center gap-2.5">
                    <span
                      aria-hidden
                      className={`w-1 h-4 rounded-full transition-colors ${
                        active ? 'bg-[#60a5fa]' : 'bg-transparent'
                      }`}
                    />
                    {item.label}
                  </span>
                  {item.badge && (
                    <span className="font-mono text-[8.5px] uppercase tracking-[0.2em] px-1.5 py-0.5 rounded bg-white/10 text-white/55">
                      {item.badge}
                    </span>
                  )}
                </>
              );
              if (disabled) {
                return (
                  <span key={item.href} className={cls} aria-disabled>
                    {inner}
                  </span>
                );
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobile}
                  className={cls}
                >
                  {inner}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="px-3 pb-5 pt-4 border-t border-white/10">
            <div className="px-3 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#2563eb] grid place-items-center font-mono uppercase text-[12px] text-white">
                A
              </div>
              <div className="min-w-0">
                <div className="font-mono text-[10.5px] text-white truncate">
                  akshat
                </div>
                <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/40 truncate">
                  default workspace
                </div>
              </div>
            </div>
            <Link
              href="/"
              onClick={closeMobile}
              className="mt-4 inline-flex w-full items-center justify-center gap-1.5 px-3 py-2 rounded-md font-mono text-[10px] uppercase tracking-[0.2em] text-white/70 hover:text-white border border-white/15 hover:border-white/40 transition-colors"
            >
              ← Back To Site
            </Link>
          </div>
        </aside>

        {/* Mobile overlay scrim */}
        {open && (
          <button
            type="button"
            aria-label="Close menu"
            onClick={closeMobile}
            className="md:hidden fixed inset-0 z-10 bg-black/40"
          />
        )}

        {/* Main */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
