'use client';

import SplitHeadline from '@/components/motion/SplitHeadline';
import ModalityRotator from '@/components/motion/ModalityRotator';
import MagneticButton from '@/components/motion/MagneticButton';

export default function BeatII_Hero() {
  return (
    <section id="beat-ii" className="relative min-h-[100vh] flex items-center px-6 md:px-12">
      <div className="relative z-10 max-w-5xl">
        <span className="eyebrow block mb-6">02 · Synapse</span>
        <h1 className="display-xl text-[var(--color-fg)] mb-8">
          <SplitHeadline as="span" className="block" split="chars" stagger={0.018}>
            Search anything
          </SplitHeadline>
          <span className="block mt-1">
            with{' '}
            <em className="not-italic">
              <ModalityRotator />
            </em>
            .
          </span>
        </h1>
        <p className="body-l text-[var(--color-muted-fg)] mt-2 max-w-xl">
          One 1024-dimensional embedding space for every modality. Query with anything, retrieve anything.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <MagneticButton
            variant="primary"
            onClick={() => {
              window.location.href = '/search';
            }}
          >
            Try the demo
            <span aria-hidden>→</span>
          </MagneticButton>
          <MagneticButton
            variant="ghost"
            onClick={() => {
              document.getElementById('beat-vi')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Read architecture
          </MagneticButton>
        </div>
      </div>
    </section>
  );
}
