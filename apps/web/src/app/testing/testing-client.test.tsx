import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TestingClient } from "./testing-client";
import type { TestingSessionProps } from "./testing-session";

vi.mock("next-themes", () => ({
  useTheme: () => ({
    setTheme: vi.fn(),
  }),
}));

vi.mock("./testing-session", () => ({
  TestingSession: ({ roomName, tokenEndpoint }: TestingSessionProps) => (
    <div data-room-name={roomName} data-testid="testing-session">
      {tokenEndpoint}
    </div>
  ),
}));

describe("TestingClient", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        json: async () => ({ personas: [] }),
      })),
    );
    window.history.replaceState(null, "", "/testing");
  });

  it("preserves a URL-supplied room name on initial start", async () => {
    window.history.replaceState(
      null,
      "",
      "/testing?tokenEndpoint=/api/livekit/token&roomName=my-test-room",
    );

    render(<TestingClient />);

    fireEvent.click(screen.getByRole("button", { name: /^start$/i }));

    const session = await screen.findByTestId("testing-session");

    await waitFor(() => {
      expect(session).toHaveAttribute("data-room-name", "my-test-room");
    });
    expect(session).toHaveTextContent("/api/livekit/token");
  });
});
