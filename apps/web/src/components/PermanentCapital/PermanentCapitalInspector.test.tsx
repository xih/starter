import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  aggregatePermanentCapitalCompanies,
  missingPermanentCapitalCompanyFixture,
  permanentCapitalCompanyFixture,
} from "./PermanentCapital.fixtures";
import { PermanentCapitalInspector } from "./PermanentCapitalInspector";
import {
  formatCompactCurrency,
  formatFiscalYearEnd,
  getAggregateAssets,
  getHoldingsSegments,
} from "./format";
import { HoldingsCompositionBar } from "./HoldingsCompositionBar";

describe("PermanentCapitalInspector", () => {
  it("renders aggregate totals and calls back when selecting a company", async () => {
    const onSelectCompany = vi.fn();

    render(
      <PermanentCapitalInspector
        selection={{
          type: "aggregate",
          companies: aggregatePermanentCapitalCompanies,
        }}
        onSelectCompany={onSelectCompany}
      />,
    );

    expect(screen.getByText("3 companies")).toBeInTheDocument();
    expect(screen.getByText("Ranked by assets")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Adams Diversified Equity Fund Inc"));

    expect(onSelectCompany).toHaveBeenCalledWith(
      expect.objectContaining({ id: "0000895421" }),
    );
  });

  it("renders company metadata, assets, and holdings composition", () => {
    render(
      <PermanentCapitalInspector
        selection={{
          type: "company",
          company: permanentCapitalCompanyFixture,
          aggregateCompanies: aggregatePermanentCapitalCompanies,
        }}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "General American Investors Co Inc",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("530 Fifth Ave 26th Floor")).toBeInTheDocument();
    expect(screen.getByText("SEC Company Name")).toBeInTheDocument();
    expect(screen.getByText("12/31")).toBeInTheDocument();
    expect(screen.getByText("Top 10 Holdings")).toBeInTheDocument();
    expect(screen.getByText("Asml Holding N.v.")).toBeInTheDocument();
    expect(screen.getByText("Other (65 holdings)")).toBeInTheDocument();
  });

  it("does not repeat already rendered source metadata in raw rows", () => {
    render(
      <PermanentCapitalInspector
        selection={{
          type: "company",
          company: {
            ...permanentCapitalCompanyFixture,
            raw: {
              File_No: "811-00041",
              "Filing Date": "05/15/26",
              sec_company_name: "GENERAL AMERICAN INVESTORS CO INC",
              custom_review_note: "Needs review",
            },
          },
        }}
      />,
    );

    expect(screen.getAllByText("Filing Date")).toHaveLength(1);
    expect(screen.queryByText("File No")).not.toBeInTheDocument();
    expect(screen.queryByText("Sec Company Name")).not.toBeInTheDocument();
    expect(screen.getByText("custom review note")).toBeInTheDocument();
  });

  it("renders missing data without dropping the company panel", () => {
    render(
      <PermanentCapitalInspector
        selection={{
          type: "company",
          company: missingPermanentCapitalCompanyFixture,
        }}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: /A Very Long Permanent Capital Company Name/i,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("SEC Category")).not.toBeInTheDocument();
    expect(
      screen.getByText("Holdings composition unavailable"),
    ).toBeInTheDocument();
  });
});

describe("permanent capital formatting", () => {
  it("formats fiscal year end and aggregate assets", () => {
    expect(formatFiscalYearEnd("1231")).toBe("12/31");
    expect(
      formatCompactCurrency(
        getAggregateAssets(aggregatePermanentCapitalCompanies),
      ),
    ).toBe("$5.7B");
  });

  it("adds an Other segment to top holdings", () => {
    expect(getHoldingsSegments(permanentCapitalCompanyFixture).at(-1)).toEqual(
      expect.objectContaining({
        id: "other",
        label: "Other (65 holdings)",
        value: 48.6,
      }),
    );
  });

  it("represents leveraged holdings exposure", () => {
    render(
      <HoldingsCompositionBar
        company={{
          ...permanentCapitalCompanyFixture,
          top10HoldingsWeightPct: 130,
          top10Holdings: [
            { name: "Leveraged Holding A", pct_nav: 70 },
            { name: "Leveraged Holding B", pct_nav: 60 },
          ],
        }}
      />,
    );

    expect(screen.getByText("Leveraged exposure")).toBeInTheDocument();
    expect(screen.getByText("130% of NAV")).toBeInTheDocument();
  });
});
