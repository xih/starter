import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SkeuomorphicClock } from ".";

describe("SkeuomorphicClock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("preserves the displayed time while paused and resumes from that time", () => {
    const { rerender } = render(
      <SkeuomorphicClock initialTime="08:00:00" running />,
    );

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    expect(screen.getByRole("img")).toHaveAccessibleName(
      "Analog clock showing 08:00:02",
    );

    rerender(<SkeuomorphicClock initialTime="08:00:00" running={false} />);

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.getByRole("img")).toHaveAccessibleName(
      "Analog clock showing 08:00:02",
    );

    rerender(<SkeuomorphicClock initialTime="08:00:00" running />);

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    expect(screen.getByRole("img")).toHaveAccessibleName(
      "Analog clock showing 08:00:03",
    );
  });
});
