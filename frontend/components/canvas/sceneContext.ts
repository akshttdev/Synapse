'use client';

import { createContext, useContext } from 'react';

export type SceneState = {
  /** 0..6, interpolated by the master timeline. Integer parts are beats; fractions are transitions. */
  sceneIndex: number;
  /** Camera Z position. Pulled back means more negative. */
  cameraZ: number;
  /** Fog density 0..1. */
  fog: number;
  /** Particle size multiplier. */
  scale: number;
  /** Canvas opacity 0..1 — set to 0 during Beat V (paper). */
  opacity: number;
};

export type SceneAPI = {
  set: (partial: Partial<SceneState>) => void;
};

export const SceneContext = createContext<SceneAPI | null>(null);

export function useSceneAPI(): SceneAPI {
  const ctx = useContext(SceneContext);
  if (!ctx) {
    return { set: () => {} };
  }
  return ctx;
}
