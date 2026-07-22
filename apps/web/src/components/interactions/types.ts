import type { ReactNode } from "react";

export type InteractionStatus = "study" | "prototype" | "production";

export type InteractionSection = {
  id: string;
  label: string;
  title: string;
  summary: string;
  progress: number;
};

export type TimelineTimingDefaults = {
  hoverRevealDuration: number;
  minimapScale: number;
  railSpringStiffness: number;
  railSpringDamping: number;
  zoomSpringStiffness: number;
  zoomSpringDamping: number;
  zoomDurationMs: number;
  travelSpringStiffness: number;
  travelSpringDamping: number;
  travelStartDelayMs: number;
  travelDurationMs: number;
  travelEasePower: number;
  pressSpringStiffness: number;
  pressSpringDamping: number;
  sameRegionPulseDurationMs: number;
  labelActiveScale: number;
  labelPressedScale: number;
  indicatorBlue: string;
  sideGray: string;
};

export type InteractionPattern = {
  slug: string;
  title: string;
  sourceName: string;
  sourceUrl: string;
  category: string;
  tags: string[];
  status: InteractionStatus;
  summary: string;
  interactionNotes: string[];
  implementationNotes: string[];
  sections: InteractionSection[];
  timingDefaults: TimelineTimingDefaults;
};

export type TimelinePhase = "idle" | "zoomingOut" | "traveling" | "zoomingIn";

export type InteractionPatternRenderer = (
  pattern: InteractionPattern,
) => ReactNode;
