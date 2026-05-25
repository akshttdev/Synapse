'use client';

import SplitHeadline from '@/components/motion/SplitHeadline';
import { modalityColors, type Modality } from '@/lib/mockData';

const MODALITIES: { id: Modality; label: string; example: string }[] = [
  { id: 'image', label: 'Image', example: 'JPG · PNG · WebP · HEIC' },
  { id: 'audio', label: 'Audio', example: 'WAV · MP3 · FLAC · OGG' },
  { id: 'video', label: 'Video', example: 'MP4 · MOV · WebM' },
  { id: 'text', label: 'Text', example: 'String up to 512 tokens' },
];

export default function BeatIV_FourWorlds() {
  return (
    <section id="beat-iv" className="relative min-h-[120vh] px-6 md:px-12 py-32">
      <div className="relative z-10 max-w-6xl mx-auto">
        <span className="eyebrow block mb-4">04 · Modalities</span>
        <SplitHeadline as="h2" className="display-l text-[var(--color-fg)] max-w-3xl" split="words">
          Four inputs. One space.
        </SplitHeadline>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl">
          {MODALITIES.map((m) => (
            <div
              key={m.id}
              className="group border border-[var(--color-hairline)] bg-[var(--color-ink-900)]/40 backdrop-blur p-6 rounded-xl hover:border-[var(--color-accent)] transition-colors"
              data-cursor="pointer"
            >
              <div className="flex items-center gap-3 mb-3">
                <span style={{ background: modalityColors[m.id] }} className="w-2 h-2 rounded-full" />
                <span className="font-mono text-xs uppercase tracking-widest text-[var(--color-muted-2)] group-hover:text-[var(--color-fg)]">
                  {m.label}
                </span>
              </div>
              <p className="font-display text-3xl text-[var(--color-fg)] leading-none">
                {m.example}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
