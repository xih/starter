import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CaseStudy } from "./CaseStudy";
import { getCaseStudy, getCaseStudySlugs } from "./cases";

vi.mock("@starter/design-system", () => ({
  PortfolioFooter: () => <footer data-testid="portfolio-footer" />,
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

vi.mock("~/components/SkeuomorphicClock", () => ({
  SkeuomorphicClock: () => <div data-testid="clock" />,
}));

const nell = getCaseStudy("nell")!;

function stubMotionPreference(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      removeEventListener: vi.fn(),
    })),
  );
}

function defineScrollGeometry({ scrollY }: { scrollY: number }) {
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: 800,
  });
  Object.defineProperty(window, "scrollY", {
    configurable: true,
    value: scrollY,
  });
  Object.defineProperty(document.documentElement, "scrollHeight", {
    configurable: true,
    value: 4_000,
  });
  Object.defineProperty(document.body, "scrollHeight", {
    configurable: true,
    value: 4_000,
  });
}

function mockSectionTop(id: string, top: number) {
  const target = document.getElementById(id);
  if (!target) throw new Error(`Expected ${id} section to render`);

  vi.spyOn(target, "getBoundingClientRect").mockReturnValue({
    bottom: top + 602,
    height: 602,
    left: 0,
    right: 1_012,
    toJSON: () => undefined,
    top,
    width: 1_012,
    x: 0,
    y: top,
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("CaseStudy", () => {
  it("renders the sidebar intro and overline title", () => {
    render(<CaseStudy study={nell} />);

    expect(screen.getByText("Nell")).toBeInTheDocument();
    expect(screen.getByText("Founding Product Designer")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Designing a Generative AI Podcasting App/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Selected Screens" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Product Surfaces")).toBeInTheDocument();
  });

  it("aligns the desktop navigation and product surfaces left rail", () => {
    const { container } = render(<CaseStudy study={nell} />);

    expect(
      screen.getByRole("navigation", { name: "Portfolio navigation" }),
    ).toHaveClass("md:px-[116px]");
    expect(
      container.querySelector("main > div > div:nth-child(2)"),
    ).toHaveClass("md:grid-cols-[192px_minmax(0,1012px)]", "md:px-[117px]");
    expect(container.querySelector("aside")).toHaveClass("md:pt-[71px]");
    expect(container.querySelector("aside")).not.toHaveClass("md:text-right");
    expect(
      screen.getByRole("navigation", { name: "Product surfaces" }),
    ).toBeInTheDocument();
  });

  it("renders every section with a labelled heading", () => {
    render(<CaseStudy study={nell} />);

    for (const section of nell.sections) {
      expect(
        screen.getByRole("heading", { level: 3, name: section.label }),
      ).toBeInTheDocument();
    }
  });

  it("links Nell surfaces in product surface order", () => {
    render(<CaseStudy study={nell} />);

    const surfaceLinks = screen
      .getByRole("navigation", { name: "Product surfaces" })
      .querySelectorAll("a");
    const linkedSurfaces = nell.surfaces.filter((surface) => surface.target);

    expect(Array.from(surfaceLinks).map((link) => link.textContent)).toEqual(
      linkedSurfaces.map((surface) => surface.label),
    );
    expect(
      Array.from(surfaceLinks).map((link) => link.getAttribute("href")),
    ).toEqual(linkedSurfaces.map((surface) => `#${surface.target}`));
    expect(screen.getByText("Search")).toBeInTheDocument();
    expect(screen.getByText("Public and Private Shows")).toBeInTheDocument();
    expect(screen.getByText("Host Selection")).toBeInTheDocument();
  });

  it("does not mark a product surface current while the intro is active", async () => {
    const originalObserver = window.IntersectionObserver;
    const instances: Array<{
      callback: IntersectionObserverCallback;
      observed: Element[];
    }> = [];

    class MockIntersectionObserver implements IntersectionObserver {
      readonly root = null;
      readonly rootMargin = "";
      readonly thresholds = [];
      readonly observed: Element[] = [];

      constructor(
        readonly callback: IntersectionObserverCallback,
        readonly options?: IntersectionObserverInit,
      ) {
        instances.push({ callback, observed: this.observed });
      }

      disconnect = vi.fn();
      observe = vi.fn((element: Element) => this.observed.push(element));
      takeRecords = vi.fn((): IntersectionObserverEntry[] => []);
      unobserve = vi.fn();
    }

    window.IntersectionObserver = MockIntersectionObserver;

    try {
      render(<CaseStudy study={nell} />);

      const surfaceNav = screen.getByRole("navigation", {
        name: "Product surfaces",
      });
      const showCreationLink = screen.getByRole("link", {
        name: "Show creation",
      });

      expect(surfaceNav.querySelector("[aria-current='true']")).toBeNull();

      const sectionObserver = instances.find((instance) =>
        instance.observed.some((element) => element.id === "show-creation"),
      );
      const showCreationSection = sectionObserver?.observed.find(
        (element) => element.id === "show-creation",
      );

      if (!sectionObserver || !showCreationSection) {
        throw new Error("Expected the case-study sections to be observed");
      }

      await act(async () => {
        sectionObserver.callback(
          [
            {
              intersectionRatio: 0.5,
              target: showCreationSection,
            } as IntersectionObserverEntry,
          ],
          {} as IntersectionObserver,
        );
      });

      expect(showCreationLink).toHaveAttribute("aria-current", "true");

      await act(async () => {
        sectionObserver.callback(
          [
            {
              intersectionRatio: 0,
              target: showCreationSection,
            } as IntersectionObserverEntry,
          ],
          {} as IntersectionObserver,
        );
      });

      expect(surfaceNav.querySelector("[aria-current='true']")).toBeNull();
    } finally {
      window.IntersectionObserver = originalObserver;
    }
  });

  it("renders the Nell writing intro from the Figma section", () => {
    render(<CaseStudy study={nell} />);

    expect(
      screen.getByText(/short, high-signal podcast episodes/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /Podcast Creation Still Feels Too Hard/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "High-fidelity Xcode prototypes for testing mobile interactions",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/As of August 2026, Nell has launched in private beta/i),
    ).toBeInTheDocument();
  });

  it("renders a video for assets with a source and an image otherwise", () => {
    const { container } = render(<CaseStudy study={nell} />);

    const assets = nell.sections.flatMap((section) => section.images);
    const expectedVideos = assets.filter((asset) => asset.video).length;
    const expectedImages = assets.filter(
      (asset) => !asset.video && !asset.youtube,
    ).length;

    expect(container.querySelectorAll("video")).toHaveLength(expectedVideos);
    expect(screen.getAllByRole("img")).toHaveLength(expectedImages);
    expect(expectedVideos).toBeGreaterThan(0);
  });

  it("autoplays Skydio YouTube embeds without custom or native controls", () => {
    const skydio = getCaseStudy("skydio")!;
    const { container } = render(<CaseStudy study={skydio} />);

    const embeds = Array.from(container.querySelectorAll("iframe"));

    expect(embeds).toHaveLength(2);
    expect(
      screen.queryByRole("button", { name: /play cloud model viewer/i }),
    ).not.toBeInTheDocument();

    for (const embed of embeds) {
      const src = embed.getAttribute("src") ?? "";

      expect(src).toContain("autoplay=1");
      expect(src).toContain("mute=1");
      expect(src).toContain("controls=0");
      expect(src).not.toContain("modestbranding");
      expect(src).toContain("iv_load_policy=3");
      expect(embed).toHaveClass("pointer-events-none");
    }
  });

  it("renders the Figma-updated Skydio narrative and product surfaces", () => {
    const skydio = getCaseStudy("skydio")!;
    render(<CaseStudy study={skydio} />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Skydio Cloud: Designing the Enterprise Platform for Drone Fleet Operations",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /manage drone fleets, live operations, missions, media, licensing/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Customers: Public Safety, Infrastructure, Mining, Telecom, and Rail",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Selected Work" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Thermal Livestream" }),
    ).toBeInTheDocument();

    const surfaceLinks = screen
      .getByRole("navigation", { name: "Product surfaces" })
      .querySelectorAll("a");

    expect(Array.from(surfaceLinks).map((link) => link.textContent)).toEqual([
      "Thermal streaming",
      "Cloud model viewer",
      "Flight review",
      "Mission management",
      "Fleet management",
      "Drone flight logs",
      "Mobile livestreaming",
      "Media management",
    ]);
  });

  it("does not mark a product surface current before a section intersects", () => {
    const skydio = getCaseStudy("skydio")!;
    render(<CaseStudy study={skydio} />);

    expect(
      screen.getByRole("link", { name: "Thermal streaming" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("animates product surface clicks with momentum and updates the hash on arrival", () => {
    stubMotionPreference(false);
    vi.spyOn(performance, "now").mockReturnValue(0);
    const scrollTo = vi
      .spyOn(window, "scrollTo")
      .mockImplementation(() => undefined);
    const replaceState = vi
      .spyOn(window.history, "replaceState")
      .mockImplementation(() => undefined);
    const requestAnimationFrame = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback) => {
        callback(2_000);
        return 1;
      });

    defineScrollGeometry({ scrollY: 120 });

    const skydio = getCaseStudy("skydio")!;
    render(<CaseStudy study={skydio} />);
    mockSectionTop("fleet-management", 978);

    fireEvent.click(screen.getByRole("link", { name: "Fleet management" }));

    expect(requestAnimationFrame).toHaveBeenCalled();
    expect(scrollTo).toHaveBeenCalledWith({ top: 1_074, behavior: "auto" });
    expect(replaceState).toHaveBeenCalledWith(null, "", "#fleet-management");
  });

  it("skips surface scroll animation when reduced motion is preferred", () => {
    stubMotionPreference(true);
    defineScrollGeometry({ scrollY: 120 });
    const scrollTo = vi
      .spyOn(window, "scrollTo")
      .mockImplementation(() => undefined);
    const replaceState = vi
      .spyOn(window.history, "replaceState")
      .mockImplementation(() => undefined);
    const requestAnimationFrame = vi.spyOn(window, "requestAnimationFrame");

    const skydio = getCaseStudy("skydio")!;
    render(<CaseStudy study={skydio} />);
    mockSectionTop("fleet-management", 978);

    fireEvent.click(screen.getByRole("link", { name: "Fleet management" }));

    expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(scrollTo).toHaveBeenCalledWith({ top: 1_074, behavior: "auto" });
    expect(replaceState).toHaveBeenCalledWith(null, "", "#fleet-management");
  });

  it("preserves native behavior for modified product surface clicks", () => {
    stubMotionPreference(false);
    defineScrollGeometry({ scrollY: 120 });
    const scrollTo = vi
      .spyOn(window, "scrollTo")
      .mockImplementation(() => undefined);
    const replaceState = vi
      .spyOn(window.history, "replaceState")
      .mockImplementation(() => undefined);
    const requestAnimationFrame = vi.spyOn(window, "requestAnimationFrame");

    const skydio = getCaseStudy("skydio")!;
    render(<CaseStudy study={skydio} />);
    mockSectionTop("fleet-management", 978);

    fireEvent.click(screen.getByRole("link", { name: "Fleet management" }), {
      metaKey: true,
    });

    expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(scrollTo).not.toHaveBeenCalled();
    expect(replaceState).not.toHaveBeenCalled();
  });

  it("cancels a pending surface scroll when the user scrolls manually", () => {
    stubMotionPreference(false);
    defineScrollGeometry({ scrollY: 120 });
    const pendingFrames: FrameRequestCallback[] = [];
    const scrollTo = vi
      .spyOn(window, "scrollTo")
      .mockImplementation(() => undefined);
    const replaceState = vi
      .spyOn(window.history, "replaceState")
      .mockImplementation(() => undefined);
    const cancelAnimationFrame = vi
      .spyOn(window, "cancelAnimationFrame")
      .mockImplementation(() => undefined);

    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      pendingFrames.push(callback);
      return 7;
    });

    const skydio = getCaseStudy("skydio")!;
    render(<CaseStudy study={skydio} />);
    mockSectionTop("fleet-management", 978);

    fireEvent.click(screen.getByRole("link", { name: "Fleet management" }));
    fireEvent.wheel(window);

    expect(pendingFrames).toHaveLength(1);
    pendingFrames[0]!(16);

    expect(cancelAnimationFrame).toHaveBeenCalledWith(7);
    expect(scrollTo).not.toHaveBeenCalled();
    expect(replaceState).not.toHaveBeenCalled();
  });

  it("cancels a pending surface scroll before starting another one", () => {
    stubMotionPreference(false);
    defineScrollGeometry({ scrollY: 120 });
    const cancelAnimationFrame = vi
      .spyOn(window, "cancelAnimationFrame")
      .mockImplementation(() => undefined);
    vi.spyOn(window, "requestAnimationFrame").mockReturnValue(7);

    const skydio = getCaseStudy("skydio")!;
    render(<CaseStudy study={skydio} />);
    mockSectionTop("fleet-management", 978);
    mockSectionTop("media-management", 1_480);

    fireEvent.click(screen.getByRole("link", { name: "Fleet management" }));
    fireEvent.click(screen.getByRole("link", { name: "Media management" }));

    expect(cancelAnimationFrame).toHaveBeenCalledWith(7);
  });

  it("preserves YouTube start offsets for curated walkthrough moments", () => {
    const skydio = getCaseStudy("skydio")!;
    const { container } = render(<CaseStudy study={skydio} />);

    const srcs = Array.from(container.querySelectorAll("iframe")).map(
      (embed) => embed.getAttribute("src") ?? "",
    );

    expect(srcs.some((src) => src.includes("start=16"))).toBe(true);
  });

  it("waits to mount YouTube embeds until they approach the viewport", async () => {
    const originalObserver = window.IntersectionObserver;
    const instances: Array<{
      callback: IntersectionObserverCallback;
      observed: Element[];
    }> = [];

    class MockIntersectionObserver implements IntersectionObserver {
      readonly root = null;
      readonly rootMargin = "";
      readonly thresholds = [];
      readonly observed: Element[] = [];

      constructor(
        readonly callback: IntersectionObserverCallback,
        readonly options?: IntersectionObserverInit,
      ) {
        instances.push({ callback, observed: this.observed });
      }

      disconnect = vi.fn();
      observe = vi.fn((element: Element) => this.observed.push(element));
      takeRecords = vi.fn((): IntersectionObserverEntry[] => []);
      unobserve = vi.fn();
    }

    window.IntersectionObserver = MockIntersectionObserver;

    try {
      const skydio = getCaseStudy("skydio")!;
      const { container } = render(<CaseStudy study={skydio} />);

      expect(container.querySelectorAll("iframe")).toHaveLength(0);
      expect(screen.getAllByTestId("youtube-embed-gate")).toHaveLength(2);

      const youtubeObserver = instances.find((instance) =>
        instance.observed.some(
          (element) =>
            element instanceof HTMLElement &&
            element.dataset.testid === "youtube-embed-gate",
        ),
      );
      const youtubeTarget = youtubeObserver?.observed.find(
        (element) =>
          element instanceof HTMLElement &&
          element.dataset.testid === "youtube-embed-gate",
      );

      if (!youtubeObserver || !youtubeTarget) {
        throw new Error("Expected a YouTube embed gate to be observed");
      }

      await act(async () => {
        youtubeObserver.callback(
          [
            {
              isIntersecting: true,
              target: youtubeTarget,
            } as IntersectionObserverEntry,
          ],
          {} as IntersectionObserver,
        );
      });

      expect(container.querySelectorAll("iframe")).toHaveLength(1);
    } finally {
      window.IntersectionObserver = originalObserver;
    }
  });

  it("keeps lazy videos muted, inline, postered, and idle before observation", () => {
    const { container } = render(<CaseStudy study={nell} />);
    const video = container.querySelector("video");

    expect(video).not.toBeNull();
    expect(video).not.toHaveAttribute("autoplay");
    expect(video?.muted).toBe(true);
    expect(video).toHaveAttribute("playsinline");
    expect(video).toHaveAttribute("preload", "none");
    expect(video?.getAttribute("poster")).toContain("/work/nell/");
    expect(video?.getAttribute("src")).toContain("/work/nell/");
  });

  it("registers the combined agi and krea case study", () => {
    expect(getCaseStudySlugs()).toEqual(
      expect.arrayContaining(["nell", "agi-krea", "agi", "krea"]),
    );
  });

  it.each(["agi-krea", "agi", "krea"])(
    "renders every section for the %s case study route",
    (slug) => {
      const study = getCaseStudy(slug)!;
      render(<CaseStudy study={study} />);

      expect(
        screen.getByRole("heading", { level: 1, name: study.overline }),
      ).toBeInTheDocument();

      for (const section of study.sections) {
        expect(
          screen.getByRole("heading", { level: 2, name: section.label }),
        ).toBeInTheDocument();
      }
    },
  );

  it("renders combined AGI and Krea narrative links and visuals", () => {
    const study = getCaseStudy("agi-krea")!;
    render(<CaseStudy study={study} />);

    expect(screen.getByText("AGI and Krea")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "AGI (2025) - AI Agent Phones",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Android mobile agents are designed/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "Krea had $8M ARR as of April 2025",
      }),
    ).toHaveAttribute(
      "href",
      "https://startupfounderstories.com/stories/victor-perez-krea-ai",
    );
    expect(
      screen.getByRole("link", { name: "Boom times in San Francisco" }),
    ).toHaveAttribute(
      "href",
      "https://www.theinformation.com/articles/seeking-cerebral-valley-a-photographic-tour-of-san-franciscos-ai-underground?rc=odix4s",
    );
  });
});
