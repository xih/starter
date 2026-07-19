"use client";

import { DialKitRoot } from "~/components/DialKitRoot";
import { type DialConfig, useDialKit } from "dialkit";
import type { ReactNode } from "react";

import { archiveTimelinePattern } from "./data";
import type { TimelineTimingDefaults } from "./types";

const TIMELINE_DEFAULTS = archiveTimelinePattern.timingDefaults;

const TIMELINE_CONTROLS = {
  hoverRevealDuration: [TIMELINE_DEFAULTS.hoverRevealDuration, 0.1, 1.2, 0.01],
  minimapScale: [TIMELINE_DEFAULTS.minimapScale, 0.28, 0.72, 0.01],
  railSpringStiffness: [TIMELINE_DEFAULTS.railSpringStiffness, 10, 240, 1],
  railSpringDamping: [TIMELINE_DEFAULTS.railSpringDamping, 5, 60, 1],
  zoomSpringStiffness: [TIMELINE_DEFAULTS.zoomSpringStiffness, 10, 240, 1],
  zoomSpringDamping: [TIMELINE_DEFAULTS.zoomSpringDamping, 5, 60, 1],
  zoomDurationMs: [TIMELINE_DEFAULTS.zoomDurationMs, 180, 1200, 10],
  travelSpringStiffness: [TIMELINE_DEFAULTS.travelSpringStiffness, 10, 260, 1],
  travelSpringDamping: [TIMELINE_DEFAULTS.travelSpringDamping, 5, 70, 1],
  travelStartDelayMs: [TIMELINE_DEFAULTS.travelStartDelayMs, 0, 600, 10],
  travelDurationMs: [TIMELINE_DEFAULTS.travelDurationMs, 120, 1600, 10],
  travelEasePower: [TIMELINE_DEFAULTS.travelEasePower, 1, 6, 0.1],
  pressSpringStiffness: [TIMELINE_DEFAULTS.pressSpringStiffness, 10, 320, 1],
  pressSpringDamping: [TIMELINE_DEFAULTS.pressSpringDamping, 5, 70, 1],
  sameRegionPulseDurationMs: [
    TIMELINE_DEFAULTS.sameRegionPulseDurationMs,
    120,
    600,
    10,
  ],
  labelActiveScale: [TIMELINE_DEFAULTS.labelActiveScale, 0.8, 1.1, 0.005],
  labelPressedScale: [TIMELINE_DEFAULTS.labelPressedScale, 0.75, 1.05, 0.005],
  indicatorBlue: {
    type: "select",
    default: TIMELINE_DEFAULTS.indicatorBlue,
    options: [
      { label: "Archive blue", value: "#009ee8" },
      { label: "Electric blue", value: "#008cff" },
      { label: "Cyan", value: "#00a7c7" },
    ],
  },
  sideGray: {
    type: "select",
    default: TIMELINE_DEFAULTS.sideGray,
    options: [
      { label: "Archive gray", value: "#eeeeee" },
      { label: "Cool gray", value: "#e5e7eb" },
      { label: "Warm gray", value: "#ece9e4" },
    ],
  },
} satisfies DialConfig;

type TimelinePhysicsControlsProps = {
  children: (controls: TimelineTimingDefaults) => ReactNode;
  showPanel?: boolean;
};

export function TimelinePhysicsControls({
  children,
  showPanel = true,
}: TimelinePhysicsControlsProps) {
  const controls = useDialKit("Archive Scroll Timeline", TIMELINE_CONTROLS, {
    persist: {
      key: "archive-scroll-timeline-v2",
      storage: "localStorage",
      presets: true,
    },
    shortcuts: {
      hoverRevealDuration: { key: "h", mode: "fine" },
      minimapScale: { key: "m", mode: "fine" },
      travelDurationMs: { key: "d", mode: "coarse" },
      travelStartDelayMs: { key: "s", mode: "coarse" },
      travelSpringStiffness: { key: "t", mode: "coarse" },
      zoomDurationMs: { key: "x", mode: "coarse" },
      zoomSpringStiffness: { key: "z", mode: "coarse" },
    },
  }) as TimelineTimingDefaults;

  return (
    <>
      {children(controls)}
      {showPanel ? <DialKitRoot /> : null}
    </>
  );
}
