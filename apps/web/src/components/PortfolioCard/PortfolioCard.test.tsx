import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PortfolioCard, PortfolioCardGrid, portfolioProjects } from ".";

describe("PortfolioCard", () => {
  it("renders portfolio metadata, copy, artwork label, and links", () => {
    render(<PortfolioCard {...portfolioProjects[0]!} />);

    expect(screen.getByText("2026")).toBeInTheDocument();
    expect(screen.getByText("Nell")).toBeInTheDocument();
    expect(screen.getByText("Founding Product Designer")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /nell mobile creation flow screen/i }),
    ).toHaveAttribute("href", "/work/nell");
    expect(screen.getByRole("link", { name: "Case Study" })).toHaveAttribute(
      "href",
      "/work/nell",
    );
  });

  it("links AGI and Krea cards to their internal case studies", () => {
    render(<PortfolioCardGrid />);

    const agiCard = screen.getByText("AGI").closest("article")!;
    const kreaCard = screen.getByText("Krea").closest("article")!;

    expect(
      within(agiCard).getByRole("link", { name: "Case Study" }),
    ).toHaveAttribute("href", "/work/agi");
    expect(
      within(kreaCard).getByRole("link", { name: "Case Study" }),
    ).toHaveAttribute("href", "/work/krea");
  });

  it("links the artwork thumbnail to the case study", () => {
    render(<PortfolioCard {...portfolioProjects[0]!} />);

    expect(
      screen.getByRole("link", { name: /nell case study/i }),
    ).toHaveAttribute("href", "/work/nell");
  });

  it("renders every configured project in the grid", () => {
    render(<PortfolioCardGrid />);

    for (const project of portfolioProjects) {
      expect(screen.getByText(project.company)).toBeInTheDocument();
    }
  });

  it("keeps the Figma selected-work order across the shared card data", () => {
    expect(portfolioProjects.map((project) => project.company)).toEqual([
      "Nell",
      "Skydio Cloud",
      "Krea",
      "AGI",
    ]);
  });

  it("uses the Figma-exported artwork assets for every card", () => {
    render(<PortfolioCardGrid />);

    const expectedArtwork = [
      ["Nell", "/portfolio/nell-creation-flow.png"],
      ["Skydio Cloud", "/portfolio/skydio-map.png"],
      ["Krea", "/portfolio/krea-canvas.png"],
      ["AGI", "/portfolio/samsung-frame.png"],
    ] as const;

    for (const [company, src] of expectedArtwork) {
      const card = screen.getByText(company).closest("article")!;
      const cardImages = Array.from(card.querySelectorAll("img"));
      expect(
        cardImages.some((image) =>
          decodeURIComponent(image.getAttribute("src") ?? "").includes(src),
        ),
      ).toBe(true);
    }
  });
});
