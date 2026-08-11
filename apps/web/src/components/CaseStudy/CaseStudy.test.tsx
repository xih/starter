import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CaseStudy } from "./CaseStudy";
import { getCaseStudy } from "./cases";

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
    const expectedImages = assets.length - expectedVideos;

    expect(container.querySelectorAll("video")).toHaveLength(expectedVideos);
    expect(screen.getAllByRole("img")).toHaveLength(expectedImages);
    expect(expectedVideos).toBeGreaterThan(0);
  });
});
