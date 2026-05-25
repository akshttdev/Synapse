'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap';
import Daisy from '@/components/icons/Daisy';
import { subscribe, type Particle } from '@/lib/burst';

const LIFETIME_MS = 2400;

export default function BurstLayer() {
  const [mounted, setMounted] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    return subscribe((p) => {
      setParticles((prev) => [...prev, p]);
      window.setTimeout(() => {
        setParticles((prev) => prev.filter((x) => x.id !== p.id));
      }, LIFETIME_MS);
    });
  }, []);

  if (!mounted) return null;

  return createPortal(
    <>
      {particles.map((p) => (
        <FlyingDaisy key={p.id} particle={p} />
      ))}
    </>,
    document.body,
  );
}

function FlyingDaisy({ particle }: { particle: Particle }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.set(el, {
        x: particle.startX,
        y: particle.startY,
        xPercent: -50,
        yPercent: -50,
        scale: 0.4,
        rotation: 0,
        opacity: 1,
      });
      gsap
        .timeline()
        .to(el, {
          y: particle.startY - particle.launchHeight,
          x: particle.startX + particle.drift * 0.35,
          rotation: particle.rotation * 0.3,
          scale: 1,
          duration: 0.65 + Math.random() * 0.2,
          ease: 'power2.out',
        })
        .to(el, {
          y: particle.startY + 460,
          x: particle.startX + particle.drift,
          rotation: particle.rotation,
          opacity: 0,
          duration: 1.3 + Math.random() * 0.3,
          ease: 'power2.in',
        });
    }, ref);
    return () => ctx.revert();
  }, [particle]);

  return (
    <div
      ref={ref}
      aria-hidden
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        opacity: 0,
        pointerEvents: 'none',
        zIndex: 9999,
        willChange: 'transform, opacity',
      }}
    >
      <Daisy
        size={particle.size}
        petalColor={particle.petal}
        centerColor={particle.center}
        coreColor={particle.core}
      />
    </div>
  );
}
