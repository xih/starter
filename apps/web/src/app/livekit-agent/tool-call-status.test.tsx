import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  ToolCallStatusPanel,
  toolCallStatusReducer,
  type ToolCallStatus,
} from "./tool-call-status";

describe("ToolCallStatusPanel", () => {
  it("shows the active web search tool call without exposing secrets", () => {
    const status: ToolCallStatus = {
      provider: "parallel",
      startedAt: 1_789_270_400_000,
      state: "running",
      summary: "Comparing current web search pricing",
    };

    render(<ToolCallStatusPanel status={status} />);

    expect(screen.getByText("Searching the web")).toBeInTheDocument();
    expect(
      screen.getByText("Comparing current web search pricing"),
    ).toBeInTheDocument();
    expect(screen.getByText("parallel")).toBeInTheDocument();
    expect(screen.queryByText(/API_KEY|secret|token/i)).not.toBeInTheDocument();
  });

  it("clears status when the agent reports completion", () => {
    const running: ToolCallStatus = {
      provider: "exa",
      startedAt: 1_789_270_400_000,
      state: "running",
      summary: "Looking up Exa docs",
    };

    const next = toolCallStatusReducer(running, {
      type: "completed",
    });

    expect(next).toBeNull();
  });

  it("shows a failed tool call until the next session reset", () => {
    const next = toolCallStatusReducer(null, {
      error: "Search provider timed out",
      provider: "perplexity",
      summary: "Looking up current docs",
      type: "failed",
    });

    expect(next?.error).toBe("Search provider timed out");
    expect(next?.provider).toBe("perplexity");
    expect(typeof next?.startedAt).toBe("number");
    expect(next?.state).toBe("failed");
    expect(next?.summary).toBe("Looking up current docs");
  });
});
