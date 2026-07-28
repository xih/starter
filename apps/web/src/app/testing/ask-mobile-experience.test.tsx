import {
  agentControlBarLayout,
  AskMobileExperience,
} from "@starter/design-system";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

describe("AskMobileExperience", () => {
  it("uses the design-system section header and routes control interactions", () => {
    const onBack = vi.fn();
    const onChangeInput = vi.fn();
    const onSend = vi.fn();

    render(
      <AskMobileExperience
        inputValue="hello"
        onBack={onBack}
        onChangeInput={onChangeInput}
        onSend={onSend}
      />,
    );

    expect(screen.getByTestId("ask-mobile-experience")).toHaveAttribute(
      "role",
      "dialog",
    );
    expect(screen.getByTestId("ask-mobile-experience")).toHaveAttribute(
      "aria-modal",
      "true",
    );
    expect(screen.getByTestId("ask-mobile-experience")).toHaveFocus();
    expect(screen.getByTestId("section-header")).toBeInTheDocument();
    expect(
      screen.getByText("Hi, what would you like to ask?"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Go back"));
    expect(onBack).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "hello there" },
    });
    expect(onChangeInput).toHaveBeenCalledWith("hello there");
    expect(screen.getByLabelText("Message")).toHaveClass(
      "text-[16px]",
      "scale-[0.875]",
    );

    fireEvent.click(screen.getByLabelText("Send message"));
    expect(onSend).toHaveBeenCalledWith("hello");
  });

  it("switches to compact conversation mode and shows the pending thinking row", () => {
    render(
      <AskMobileExperience
        messages={[{ id: "user-1", role: "user", text: "hello" }]}
        pending
      />,
    );

    expect(
      screen.queryByText("Hi, what would you like to ask?"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("hello")).toBeInTheDocument();
    expect(screen.getByText("Thinking")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-chat-transcript")).toHaveClass(
      "bottom-0",
      "pb-[calc(20px_+_var(--ds-agent-control-bar-height)_+_var(--ds-agent-mobile-orb-gap)_+_var(--ds-agent-mobile-orb-size)_+_var(--ds-agent-mobile-transcript-gap)_+_env(safe-area-inset-bottom))]",
    );
  });

  it("moves the ask orb with the safe-area-adjusted controls", () => {
    render(
      <AskMobileExperience
        messages={[{ id: "user-1", role: "user", text: "hello" }]}
        renderOrb={<div />}
      />,
    );

    expect(screen.getByTestId("mobile-agent-orb")).toHaveClass(
      "bottom-[calc(20px_+_var(--ds-agent-control-bar-height)_+_var(--ds-agent-mobile-orb-gap)_+_env(safe-area-inset-bottom))]",
    );
  });

  it("keeps tab focus inside the full-screen ask dialog", () => {
    render(<AskMobileExperience />);

    const backButton = screen.getByLabelText("Go back");
    const sendButton = screen.getByLabelText("Send message");

    backButton.focus();
    fireEvent.keyDown(screen.getByTestId("ask-mobile-experience"), {
      key: "Tab",
      shiftKey: true,
    });
    expect(sendButton).toHaveFocus();

    fireEvent.keyDown(screen.getByTestId("ask-mobile-experience"), {
      key: "Tab",
    });
    expect(backButton).toHaveFocus();
  });

  it("keeps the mobile orb size stable across connection states", () => {
    expect(agentControlBarLayout.mobileConnectingOrbSize).toBe(66);
    expect(agentControlBarLayout.mobileOrbSize).toBe(66);
  });
});
