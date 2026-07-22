import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PortfolioCard, PortfolioCardGrid, portfolioProjects } from ".";

describe("PortfolioCard", () => {
  it("renders portfolio metadata, copy, artwork label, and links", () => {
    render(<PortfolioCard {...portfolioProjects[0]!} />);

    expect(screen.getByText("2026")).toBeInTheDocument();
    expect(screen.getByText("Nell")).toBeInTheDocument();
    expect(screen.getByText("Founding Product Designer")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAccessibleName(
      "Nell brand mark on a red field",
    );
    expect(screen.getByRole("link", { name: /case study/i })).toHaveAttribute(
      "href",
      "https://nell.ai",
    );
  });

  it("renders every configured project in the grid", () => {
    render(<PortfolioCardGrid />);

    for (const project of portfolioProjects) {
      expect(screen.getByText(project.company)).toBeInTheDocument();
    }
  });
});
