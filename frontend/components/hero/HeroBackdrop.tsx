import Image from 'next/image';

/**
 * Hero background — the green ASCII art image, full-bleed.
 */
export default function HeroBackdrop() {
  return (
    <div className="absolute inset-0 z-0">
      <Image
        src="/synapse-hero.jpeg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      {/* Right-edge vignette so the labels and headline sit on darker pixels */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, rgba(2,17,15,0) 55%, rgba(2,17,15,0.85) 100%)',
        }}
      />
      {/* Bottom vignette so the scattered labels read */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg, rgba(2,17,15,0) 55%, rgba(2,17,15,0.7) 100%)',
        }}
      />
    </div>
  );
}
