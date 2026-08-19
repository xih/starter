import type {
  MappedPermanentCapitalCompany,
  PermanentCapitalCompany,
  PermanentCapitalHolding,
} from "./types";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const compactCurrencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

export function formatCurrency(value: number | null | undefined) {
  return value == null ? "Unknown" : currencyFormatter.format(value);
}

export function formatCompactCurrency(value: number | null | undefined) {
  return value == null ? "Unknown" : compactCurrencyFormatter.format(value);
}

export function formatPercent(value: number | null | undefined) {
  return value == null ? "Unknown" : `${percentFormatter.format(value)}%`;
}

export function formatRatio(value: number | null | undefined) {
  if (value == null) return "Unknown";
  return `${percentFormatter.format(value * 100)}%`;
}

export function formatFiscalYearEnd(value: string) {
  if (/^\d{4}$/.test(value)) {
    return `${value.slice(0, 2)}/${value.slice(2)}`;
  }

  return value.trim() ? value : "Unknown";
}

export function cleanValue(value: string | null | undefined) {
  return value?.trim() ? value : "Unknown";
}

export function formatDisplayText(value: string | null | undefined) {
  const cleanedValue = cleanValue(value);
  if (cleanedValue === "Unknown" || isUrl(cleanedValue)) return cleanedValue;

  return cleanedValue
    .toLocaleLowerCase("en-US")
    .replace(/\b[\p{L}\p{N}][\p{L}\p{N}'&.-]*/gu, (word) => {
      const normalizedWord = word.toLocaleUpperCase("en-US");
      if (TITLE_CASE_ACRONYMS.has(normalizedWord)) return normalizedWord;

      return word.charAt(0).toLocaleUpperCase("en-US") + word.slice(1);
    })
    .replace(/\bAnd\b/g, "and")
    .replace(/\bOf\b/g, "of")
    .replace(/\bThe\b/g, "the")
    .replace(/\bFor\b/g, "for");
}

export function getDisplayName(company: PermanentCapitalCompany) {
  return formatDisplayText(
    company.name.trim() ? company.name : company.secCompanyName,
  );
}

export function getAddressLines(company: PermanentCapitalCompany) {
  const firstLine = [company.address1, company.address2]
    .filter(Boolean)
    .join(" ");
  const secondLine = [company.city, company.state].filter(Boolean).join(", ");
  const secondLineWithZip = [secondLine, company.zipCode]
    .filter(Boolean)
    .join(" ");

  return [firstLine, secondLineWithZip]
    .filter(Boolean)
    .map((line) => formatDisplayText(line));
}

export function getPeople(company: PermanentCapitalCompany) {
  if (company.keyPeopleWithImages.length > 0) {
    return company.keyPeopleWithImages
      .map((person) => ({
        name: formatDisplayText(person.name),
        imageSrc: person.image_src ?? "",
      }))
      .filter((person) => person.name)
      .slice(0, 3);
  }

  return company.keyPeopleNames
    .map((name) => ({ name: formatDisplayText(name), imageSrc: "" }))
    .filter((person) => person.name)
    .slice(0, 3);
}

export function getInitials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return initials.toUpperCase() || "?";
}

export function getMappedCompanies(companies: PermanentCapitalCompany[]) {
  return companies.filter(
    (company): company is MappedPermanentCapitalCompany =>
      company.mapped &&
      typeof company.latitude === "number" &&
      typeof company.longitude === "number",
  );
}

export function getCompanyAssets(company: PermanentCapitalCompany) {
  return coerceNumber(company.totalAssetsUsd);
}

export function getAggregateAssets(
  companies: readonly PermanentCapitalCompany[],
) {
  let hasKnownAssets = false;
  const totalAssets = companies.reduce((total, company) => {
    const assets = getCompanyAssets(company);

    if (assets == null) {
      return total;
    }

    hasKnownAssets = true;
    return total + assets;
  }, 0);

  return hasKnownAssets ? totalAssets : null;
}

export function getHoldingsSegments(company: PermanentCapitalCompany) {
  const holdings = company.top10Holdings
    .map((holding, index) => ({
      id: `${holding.name ?? "Holding"}-${index}`,
      label: formatDisplayText(
        holding.name ?? holding.title ?? "Unnamed holding",
      ),
      value: sanitizeHoldingPercent(holding),
    }))
    .filter((holding) => holding.value > 0)
    .slice(0, 10);

  if (holdings.length === 0) {
    return [];
  }

  const topWeight =
    company.top10HoldingsWeightPct ??
    holdings.reduce((total, holding) => total + holding.value, 0);
  const otherWeight = Math.max(0, 100 - topWeight);

  if (otherWeight > 0) {
    holdings.push({
      id: "other",
      label: `Other (${Math.max(company.holdingsCount - 10, 0)} holdings)`,
      value: otherWeight,
    });
  }

  return holdings;
}

function sanitizeHoldingPercent(holding: PermanentCapitalHolding) {
  if (
    typeof holding.pct_nav !== "number" ||
    !Number.isFinite(holding.pct_nav)
  ) {
    return 0;
  }

  return Math.max(0, holding.pct_nav);
}

function coerceNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const parsed = Number(value.replaceAll(/[$,]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function isUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

const TITLE_CASE_ACRONYMS = new Set([
  "ADR",
  "BDC",
  "CEF",
  "CIK",
  "ETF",
  "LEI",
  "LLC",
  "LP",
  "NAV",
  "N-CEN",
  "N-PORT",
  "NYSE",
  "SEC",
  "SIC",
  "US",
  "USA",
]);
