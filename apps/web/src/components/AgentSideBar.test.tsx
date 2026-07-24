import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AgentSideBar, type AgentSideBarMessage } from "./AgentSideBar";
import { fallbackPersonaVoiceOptions } from "./PersonaVoiceSwitcher";

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

  it("dismisses the desktop voice panel when clicking outside", () => {
    render(
      <div>
        <AgentSideBar
          messages={[]}
          onSelectPersona={vi.fn()}
          personas={fallbackPersonaVoiceOptions}
          selectedPersonaId="portfolio-agent"
          state="idle"
        />
        <button type="button">Outside target</button>
      </div>,
    );

    fireEvent.click(screen.getByRole("button", { name: /select voice/i }));
    expect(screen.getByText("Wife E2E")).toBeVisible();

    fireEvent.pointerDown(
      screen.getByRole("button", { name: /outside target/i }),
    );

    expect(screen.queryByText("Wife E2E")).not.toBeInTheDocument();
  });

  it("does not append Thinking during agent streaming unless a reply is pending", () => {
    const { rerender } = render(
      <AgentSideBar messages={messages} state="agent-streaming" />,
    );

    expect(screen.queryByText("Thinking")).not.toBeInTheDocument();

    rerender(
      <AgentSideBar
        messages={messages}
        showThinkingMessage
        state="agent-streaming"
      />,
    );

    expect(screen.getByText("Thinking")).toBeVisible();
  });
});
