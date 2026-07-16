import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  fallbackPersonaVoiceOptions,
  PersonaVoiceSwitcher,
} from "./PersonaVoiceSwitcher";

function renderSwitcher({
  onSelectPersona = vi.fn(),
  selectedPersonaId = "portfolio-agent",
}: {
  onSelectPersona?: (personaId: string) => void;
  selectedPersonaId?: string;
} = {}) {
  render(
    <div>
      <PersonaVoiceSwitcher
        onSelectPersona={onSelectPersona}
        personas={fallbackPersonaVoiceOptions}
        selectedPersonaId={selectedPersonaId}
      />
      <button type="button">Outside target</button>
    </div>,
  );

  return { onSelectPersona };
}

describe("PersonaVoiceSwitcher", () => {
  it("dismisses the persona menu when clicking outside", () => {
    renderSwitcher();

    fireEvent.click(
      screen.getByRole("button", { name: /select persona voice/i }),
    );
    expect(screen.getByRole("listbox")).toBeTruthy();

    fireEvent.pointerDown(
      screen.getByRole("button", { name: /outside target/i }),
    );

    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("dismisses the persona menu when pressing Escape", () => {
    renderSwitcher();

    fireEvent.click(
      screen.getByRole("button", { name: /select persona voice/i }),
    );
    expect(screen.getByRole("listbox")).toBeTruthy();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("selects a persona and closes the menu", () => {
    const onSelectPersona = vi.fn();
    renderSwitcher({ onSelectPersona });

    fireEvent.click(
      screen.getByRole("button", { name: /select persona voice/i }),
    );
    fireEvent.click(screen.getByRole("option", { name: /wife e2e/i }));

    expect(onSelectPersona).toHaveBeenCalledWith("wife-e2e");
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});
