import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  archiveTimelinePattern,
  InteractionPatternSidebar,
} from "~/components/interactions";

describe("InteractionPatternSidebar", () => {
  it("filters patterns by search query", () => {
    render(
      <InteractionPatternSidebar
        activeSlug={archiveTimelinePattern.slug}
        patterns={[archiveTimelinePattern]}
      />,
    );

    expect(
      screen.getByRole("link", { name: /archive scroll timeline/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "shader" },
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "No patterns match this search.",
    );
  });
});
