import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { archiveTimelinePattern, ScrollTimelineRail } from ".";

describe("ScrollTimelineRail", () => {
  beforeEach(() => {
    if (!HTMLElement.prototype.setPointerCapture) {
      HTMLElement.prototype.setPointerCapture = vi.fn();
    }
  });

  it("selects the activated section button instead of the current scrub progress", () => {
    const handleSelectSection = vi.fn();

    render(
      <ScrollTimelineRail
        activeSectionId="intro"
        forceVisible
        indicatorBlue={archiveTimelinePattern.timingDefaults.indicatorBlue}
        labelActiveScale={
          archiveTimelinePattern.timingDefaults.labelActiveScale
        }
        labelPressedScale={
          archiveTimelinePattern.timingDefaults.labelPressedScale
        }
        onSelectSection={handleSelectSection}
        progress={0}
        sections={archiveTimelinePattern.sections}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /jump to events/i }));

    expect(handleSelectSection).toHaveBeenCalledWith("events");
  });

  it("aborts canceled pointer scrubs without selecting a destination", () => {
    const handleScrubEnd = vi.fn();
    const handleSelectProgress = vi.fn();

    render(
      <ScrollTimelineRail
        activeSectionId="intro"
        forceVisible
        indicatorBlue={archiveTimelinePattern.timingDefaults.indicatorBlue}
        labelActiveScale={
          archiveTimelinePattern.timingDefaults.labelActiveScale
        }
        labelPressedScale={
          archiveTimelinePattern.timingDefaults.labelPressedScale
        }
        onScrubEnd={handleScrubEnd}
        onSelectProgress={handleSelectProgress}
        progress={0}
        sections={archiveTimelinePattern.sections}
      />,
    );

    fireEvent.pointerDown(screen.getByTestId("scroll-timeline-rail"), {
      clientY: 120,
      pointerId: 1,
    });
    fireEvent.pointerCancel(window);

    expect(handleScrubEnd).not.toHaveBeenCalled();
    expect(handleSelectProgress).not.toHaveBeenCalled();
  });
});
