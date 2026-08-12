import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CaseStudy } from "./CaseStudy";
import { getCaseStudy, getCaseStudySlugs } from "./cases";

vi.mock("@starter/design-system", () => ({
  PortfolioFooter: () => <footer data-testid="portfolio-footer" />,
}));

vi.mock("~/components/SkeuomorphicClock", () => ({
  SkeuomorphicClock: () => <div data-testid="clock" />,
}));

const nell = getCaseStudy("nell")!;

afterEach(cleanup);

describe("CaseStudy", () => {
  it("renders the sidebar intro and overline title", () => {
    render(<CaseStudy study={nell} />);

    expect(screen.getByText("Nell")).toBeInTheDocument();
    expect(screen.getByText("Founding Product Designer")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Selected Screens" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Product Surfaces")).toBeInTheDocument();
  });

  it("aligns the desktop navigation and product surfaces left rail", () => {
    const { container } = render(<CaseStudy study={nell} />);

    expect(
      screen.getByRole("navigation", { name: "Portfolio navigation" }),
    ).toHaveClass("md:px-[92px]");
    expect(
      container.querySelector("main > div > div:nth-child(2)"),
    ).toHaveClass("md:grid-cols-[236px_minmax(0,1fr)]", "md:px-[92px]");
    expect(container.querySelector("aside")).toHaveClass("md:pr-[8px]");
    expect(container.querySelector("aside")).not.toHaveClass("md:text-right");
    expect(
      screen.getByRole("navigation", { name: "Product surfaces" }),
    ).toBeInTheDocument();
  });

  it("renders every section with a labelled heading", () => {
    render(<CaseStudy study={nell} />);

    for (const section of nell.sections) {
      expect(
        screen.getByRole("heading", { level: 2, name: section.label }),
      ).toBeInTheDocument();
    }
  });

  it("links surfaces that map to a section and renders plain text otherwise", () => {
    render(<CaseStudy study={nell} />);

    const homeLink = screen.getByRole("link", { name: "Home screen" });
    expect(homeLink).toHaveAttribute("href", "#home");

    // "Search" has no matching section, so it is not a link.
    expect(
      screen.queryByRole("link", { name: "Search" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Search")).toBeInTheDocument();
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

  it("preserves YouTube start offsets for curated walkthrough moments", () => {
    const skydio = getCaseStudy("skydio")!;
    const { container } = render(<CaseStudy study={skydio} />);

    const srcs = Array.from(container.querySelectorAll("iframe")).map(
      (embed) => embed.getAttribute("src") ?? "",
    );

    expect(srcs.some((src) => src.includes("start=16"))).toBe(true);
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

  it("registers the agi and krea case studies", () => {
    expect(getCaseStudySlugs()).toEqual(
      expect.arrayContaining(["nell", "agi", "krea"]),
    );
  });

  it.each(["agi", "krea"])(
    "renders every section for the %s case study",
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
});
