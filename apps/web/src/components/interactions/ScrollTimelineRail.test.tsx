import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { archiveTimelinePattern, ScrollTimelineRail } from ".";

describe("ScrollTimelineRail", () => {
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
});
