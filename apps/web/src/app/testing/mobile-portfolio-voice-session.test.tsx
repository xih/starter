import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MobilePortfolioVoiceSession } from "./mobile-portfolio-voice-session";

const voice = {
  avatar: "/agent-sidebar/avatar-1.png",
  description: "Softbank founder",
  name: "Masa Son",
};

describe("MobilePortfolioVoiceSession", () => {
  it("lets the transcript scroll behind the bottom anchored controls", () => {
    render(
      <MobilePortfolioVoiceSession
        chatMessages={[{ id: "user-1", role: "user", text: "hello" }]}
        controlState="default"
        onSelectVoice={vi.fn()}
        voice={voice}
        voiceOptions={[voice]}
      />,
    );

    expect(screen.getByTestId("mobile-agent-control-stack")).toHaveClass(
      "bottom-[env(safe-area-inset-bottom)]",
    );
    expect(screen.getByTestId("mobile-portfolio-transcript")).toHaveClass(
      "bottom-0",
    );
    expect(
      screen.getByTestId("mobile-portfolio-transcript").firstElementChild
        ?.firstElementChild,
    ).toHaveClass(
      "pb-[calc(var(--ds-agent-control-bar-height)_+_var(--ds-agent-mobile-orb-gap)_+_var(--ds-agent-mobile-orb-size)_+_var(--ds-agent-mobile-transcript-gap)_+_env(safe-area-inset-bottom))]",
    );
  });
});
