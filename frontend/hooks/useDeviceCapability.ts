'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from './useReducedMotion';
import type { Capability } from '@/lib/particleConfig';

export function useDeviceCapability(): Capability {
  const reduced = useReducedMotion();
  const [state, setState] = useState<Omit<Capability, 'reduced'>>({ mobile: false, cores: 0 });

  useEffect(() => {
    const mobile = matchMedia('(max-width: 768px)').matches;
    const cores = navigator.hardwareConcurrency ?? 4;
    setState({ mobile, cores });
  }, []);

  return { reduced, ...state };
}
