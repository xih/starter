import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PortfolioPage } from "./portfolio-page";

const testingSessionMock = vi.hoisted(() => vi.fn());

vi.mock("@paper-design/shaders-react", () => ({
  MeshGradient: () => <div data-testid="mesh-gradient" />,
}));

vi.mock("dialkit", () => ({
  useDialKit: (_name: string, controls: Record<string, unknown>) =>
    Object.fromEntries(
      Object.entries(controls).map(([key, value]) => [
        key,
        Array.isArray(value) ? value[0] : value,
      ]),
    ),
}));

vi.mock("@starter/design-system", () => ({
  AgentControlBar: ({ onUseVoice }: { onUseVoice?: () => void }) => (
    <button onClick={onUseVoice} type="button">
      Use Voice
    </button>
  ),
  LiveChat: () => <div data-testid="live-chat" />,
  PortfolioFooter: () => <footer data-testid="portfolio-footer" />,
  SectionHeader: () => <header data-testid="section-header" />,
}));

vi.mock("~/app/testing/testing-session", () => ({
  TestingSession: (props: {
    mobileLayout?: "portfolio" | "ask";
    onMobileBack?: () => void;
    onSessionEnded?: () => void;
  }) => {
    testingSessionMock(props);

    return (
      <section
        data-mobile-layout={props.mobileLayout}
        data-testid="testing-session"
      >
        <button onClick={props.onMobileBack} type="button">
          Mobile Back
        </button>
        <button onClick={props.onSessionEnded} type="button">
          End Session
        </button>
      </section>
    );
  },
}));

vi.mock("~/components/AgentSideBar", () => ({
  AgentSideBar: ({ onStart }: { onStart?: () => void }) => (
    <button onClick={onStart} type="button">
      Start Desktop
    </button>
  ),
}));

vi.mock("~/components/DialKitRoot", () => ({
  DialKitRoot: () => null,
}));

vi.mock("~/components/PortfolioCard", () => ({
  PortfolioCardGrid: () => <div data-testid="portfolio-card-grid" />,
}));

vi.mock("~/components/SkeuomorphicClock", () => ({
  SkeuomorphicClock: () => <div data-testid="clock" />,
}));

vi.mock("~/components/OrbShader", () => ({
  OrbShader: () => <div data-testid="orb-shader" />,
}));

function createMatchMediaController(matches: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  let currentMatches = matches;

  const matchMedia = vi.fn((query: string) => ({
    addEventListener: (
      event: string,
      listener: (event: MediaQueryListEvent) => void,
    ) => {
      if (event === "change") listeners.add(listener);
    },
    dispatchEvent: () => true,
    matches: currentMatches,
    media: query,
    onchange: null,
    removeEventListener: (
      event: string,
      listener: (event: MediaQueryListEvent) => void,
    ) => {
      if (event === "change") listeners.delete(listener);
    },
  }));

  return {
    matchMedia,
    setMatches(nextMatches: boolean) {
      currentMatches = nextMatches;
      const event = { matches: nextMatches } as MediaQueryListEvent;
      for (const listener of listeners) {
        listener(event);
      }
    },
  };
}

function latestTestingSessionProps() {
  const calls = testingSessionMock.mock.calls;
  return calls.at(-1)?.[0] as { mobileLayout?: "portfolio" | "ask" };
}

// The mobile "Use Voice" AgentControlBar entry point is currently commented out
// on the portfolio hero (see PortfolioLauncher in portfolio-page.tsx). These
// tests exercise the mobile-ask push/dismiss/scroll-lock flow that starts from
// that button, so they are skipped while the pill is disabled. Re-enable when
// the mobile voice entry point is restored.
describe.skip("PortfolioPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    testingSessionMock.mockClear();
    vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 128,
    });
  });

  afterEach(() => {
    cleanup();
    document.body.removeAttribute("style");
    document.documentElement.removeAttribute("style");
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("keeps mobile ask dismissed after cancelling a pending push", () => {
    const media = createMatchMediaController(true);
    vi.stubGlobal("matchMedia", media.matchMedia);

    render(<PortfolioPage />);

    fireEvent.click(screen.getByRole("button", { name: "Use Voice" }));
    expect(screen.getByTestId("testing-session")).toHaveAttribute(
      "data-mobile-layout",
      "portfolio",
    );

    fireEvent.click(screen.getByRole("button", { name: "Mobile Back" }));
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(latestTestingSessionProps().mobileLayout).toBe("portfolio");

    media.setMatches(false);
    media.setMatches(true);
    expect(latestTestingSessionProps().mobileLayout).toBe("portfolio");
  });

  it("opens mobile ask after the push transition completes", () => {
    const media = createMatchMediaController(true);
    vi.stubGlobal("matchMedia", media.matchMedia);

    render(<PortfolioPage />);

    fireEvent.click(screen.getByRole("button", { name: "Use Voice" }));
    act(() => {
      vi.advanceTimersByTime(340);
    });

    expect(latestTestingSessionProps().mobileLayout).toBe("ask");
  });

  it("dismisses mobile ask when browser history goes back", () => {
    const media = createMatchMediaController(true);
    const pushState = vi.spyOn(window.history, "pushState");
    vi.stubGlobal("matchMedia", media.matchMedia);

    render(<PortfolioPage />);

    fireEvent.click(screen.getByRole("button", { name: "Use Voice" }));
    act(() => {
      vi.advanceTimersByTime(340);
    });

    expect(pushState).toHaveBeenCalled();
    expect(latestTestingSessionProps().mobileLayout).toBe("ask");

    fireEvent(window, new PopStateEvent("popstate"));

    expect(latestTestingSessionProps().mobileLayout).toBe("portfolio");
    act(() => {
      vi.advanceTimersByTime(340);
    });
    expect(latestTestingSessionProps().mobileLayout).toBe("portfolio");
  });

  it("locks document scroll while mobile ask is active", () => {
    const media = createMatchMediaController(true);
    vi.stubGlobal("matchMedia", media.matchMedia);

    render(<PortfolioPage />);

    fireEvent.click(screen.getByRole("button", { name: "Use Voice" }));

    expect(document.documentElement.style.overflow).toBe("hidden");
    expect(document.body.style.position).toBe("fixed");
    expect(document.body.style.top).toBe("-128px");

    fireEvent.click(screen.getByRole("button", { name: "Mobile Back" }));
    act(() => {
      vi.advanceTimersByTime(340);
    });

    expect(document.documentElement.style.overflow).toBe("");
    expect(document.body.style.position).toBe("");
    expect(window.scrollTo).toHaveBeenCalledWith(0, 128);
  });
});
