"use client";

import { useDialKit } from "dialkit";

export const ASK_TRANSITION_STORAGE_KEY = "portfolio.askPushTransition";

export function useAskPushTransition() {
  return useDialKit("Ask push transition", {
    duration: [0.34, 0.1, 1.2, 0.01],
    easeX1: [0.22, 0, 1, 0.01],
    easeY1: [1, 0, 1, 0.01],
    easeX2: [0.36, 0, 1, 0.01],
    easeY2: [1, 0, 1, 0.01],
    offsetPercent: [100, 40, 140, 1],
  });
}

export function toAskTransition(
  params: ReturnType<typeof useAskPushTransition>,
) {
  return {
    duration: params.duration,
    ease: [params.easeX1, params.easeY1, params.easeX2, params.easeY2],
  } as const;
}
