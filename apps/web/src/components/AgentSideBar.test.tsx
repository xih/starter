import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AgentSideBar, type AgentSideBarMessage } from "./AgentSideBar";

const messages: AgentSideBarMessage[] = [
  {
    id: "agent-greeting",
    role: "agent",
    text: "Hello!",
  },
  {
    id: "user-search",
    role: "user",
    text: "Who won the Argentina England game today and who scored?",
  },
  {
    id: "agent-answer",
    role: "agent",
    text: "Argentina beat England 2-1 today.",
  },
];

describe("AgentSideBar", () => {
  it("renders completed web search sources under the latest agent message", () => {
    render(
      <AgentSideBar
        latestSearchSources={[
          {
            description: "Match report with the final score and scorers.",
            provider: "parallel",
            title:
              "Messi's Argentina stun England in comeback to reach World Cup final",
            url: "https://example.com/argentina-england",
          },
        ]}
        messages={messages}
        state="idle"
      />,
    );

    expect(screen.getByText("Argentina beat England 2-1 today.")).toBeVisible();
    expect(
      screen.getByRole("link", { name: /Argentina stun England/i }),
    ).toHaveAttribute("href", "https://example.com/argentina-england");
  });
});
