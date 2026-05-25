'use client';

import SplitHeadline from '@/components/motion/SplitHeadline';
import ArchNode from '@/components/ui/ArchNode';
import { archNodes } from '@/lib/mockData';

function project(x: number, y: number): { left: number; top: number } {
  // x in roughly [-2, 2], y in [-1, 1] → normalized to [0, 1]
  const left = (x + 2.4) / 4.8;
  const top = (1.4 - y) / 2.8;
  return { left, top };
}

export default function BeatVI_System() {
  return (
    <section id="beat-vi" className="relative min-h-[120vh] px-6 md:px-12 py-32">
      <div className="relative z-10 max-w-6xl mx-auto">
        <span className="eyebrow block mb-4">06 · Architecture</span>
        <SplitHeadline as="h2" className="display-l text-[var(--color-fg)] max-w-3xl" split="words">
          The architecture is the story.
        </SplitHeadline>

        <div className="relative mt-16 h-[60vh] max-w-5xl mx-auto" aria-label="Architecture diagram">
          {archNodes.map((n) => {
            const p = project(n.x, n.y);
            return <ArchNode key={n.id} node={n} left={p.left} top={p.top} />;
          })}
        </div>

        <ol className="sr-only">
          {archNodes.map((n) => (
            <li key={n.id}>
              <strong>{n.label}</strong>: {n.blurb}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
