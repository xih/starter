import { describe, expect, it } from "vitest";

import {
  archiveTimelinePattern,
  filterInteractionPatterns,
  getCenteredProgressScrollTop,
  getScrollProgress,
  getSectionTargetProgress,
  getSectionTargetScrollTop,
  getTimelinePhases,
} from ".";

describe("timeline utilities", () => {
  it("calculates scroll progress from a scroll container", () => {
    expect(
      getScrollProgress({
        clientHeight: 500,
        scrollHeight: 1500,
        scrollTop: 250,
      }),
    ).toBe(0.25);
  });

  it("returns complete progress when the container cannot scroll", () => {
    expect(
      getScrollProgress({
        clientHeight: 500,
        scrollHeight: 500,
        scrollTop: 0,
      }),
    ).toBe(1);
  });

  it("calculates target scrollTop from normalized section progress", () => {
    expect(
      getSectionTargetScrollTop({
        clientHeight: 500,
        progress: 0.5,
        scrollHeight: 2500,
      }),
    ).toBe(1000);
  });

  it("calculates target scrollTop with the progress depth centered in the viewport", () => {
    expect(
      getCenteredProgressScrollTop({
        clientHeight: 500,
        progress: 0.5,
        scrollHeight: 2500,
      }),
    ).toBe(1000);
    expect(
      getCenteredProgressScrollTop({
        clientHeight: 500,
        progress: 0.9,
        scrollHeight: 2500,
      }),
    ).toBe(2000);
  });

  it("finds target progress for a section id", () => {
    expect(
      getSectionTargetProgress(archiveTimelinePattern.sections, "era-two"),
    ).toBe(0.58);
  });

  it("uses the full animation state machine unless reduced motion is active", () => {
    expect(getTimelinePhases({ reducedMotion: false })).toEqual([
      "zoomingOut",
      "traveling",
      "zoomingIn",
      "idle",
    ]);
    expect(getTimelinePhases({ reducedMotion: true })).toEqual(["idle"]);
  });

  it("filters interaction patterns by query and category", () => {
    expect(
      filterInteractionPatterns(
        [archiveTimelinePattern],
        "timeline",
        "Reading navigation",
      ),
    ).toHaveLength(1);
    expect(
      filterInteractionPatterns([archiveTimelinePattern], "shader", "All"),
    ).toHaveLength(0);
  });
});
