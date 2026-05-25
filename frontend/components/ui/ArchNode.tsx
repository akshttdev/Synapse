'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import type { ArchNode as ArchNodeData } from '@/lib/mockData';

type Props = {
  node: ArchNodeData;
  /** Normalized [0..1] coords inside the section box. */
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
        className="group rounded-full bg-[var(--color-ink-950)]/60 border border-[var(--color-hairline)] backdrop-blur px-3 py-1.5 hover:border-[var(--color-accent)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        data-cursor="pointer"
      >
        <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--color-fg)] group-hover:text-[var(--color-accent)]">
          {node.label}
        </span>
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="bg-[var(--color-ink-900)] border-[var(--color-hairline)] text-[var(--color-fg)]">
          <SheetHeader>
            <SheetTitle className="font-display text-3xl text-[var(--color-fg)]">
              {node.label}
            </SheetTitle>
            <SheetDescription className="text-[var(--color-muted-fg)] body-m">
              {node.blurb}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 px-6">
            <span className="eyebrow">Source</span>
            <p className="font-mono text-sm text-[var(--color-accent)] mt-2 break-all">
              {node.file}
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
