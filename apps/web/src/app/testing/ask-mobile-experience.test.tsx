import { AskMobileExperience } from "@starter/design-system";
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
  });
});
