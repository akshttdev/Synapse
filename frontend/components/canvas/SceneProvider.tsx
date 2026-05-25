'use client';

import { useCallback } from 'react';
import { SceneContext, type SceneState, type SceneAPI } from './sceneContext';

const initial: SceneState = { sceneIndex: 0, cameraZ: -3.5, fog: 0, scale: 1, opacity: 1 };

/**
 * Shared mutable state object read by the canvas render loop on every frame.
 * Beats and the master timeline write to it via the SceneAPI.
 */
export const sharedState: { current: SceneState } = { current: { ...initial } };

export default function SceneProvider({ children }: { children: React.ReactNode }) {
  const api: SceneAPI = {
    set: useCallback((p: Partial<SceneState>) => {
      Object.assign(sharedState.current, p);
    }, []),
  };
  return <SceneContext.Provider value={api}>{children}</SceneContext.Provider>;
}
