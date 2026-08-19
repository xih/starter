"use client";

import { Drawer } from "vaul";
import { ExternalLink, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, type SyntheticEvent } from "react";

import { cn } from "~/lib/utils";
import {
  formatCompactCurrency,
  formatCurrency,
  formatDisplayText,
  formatFiscalYearEnd,
  formatRatio,
  getAddressLines,
  getAggregateAssets,
  getDisplayName,
  getInitials,
  getPeople,
} from "./format";
import { HoldingsCompositionBar } from "./HoldingsCompositionBar";
import type {
  MappedPermanentCapitalCompany,
  PermanentCapitalCompany,
  PermanentCapitalSelection,
} from "./types";

type InspectorProps = {
  selection: PermanentCapitalSelection | null;
  onClose?: () => void;
  onSelectCompany?: (company: MappedPermanentCapitalCompany) => void;
  onSheetInteract?: () => void;
  className?: string;
};

const PRIMARY_METADATA = [
  ["Filing Date", "filingDate"],
  ["Filing Type", "filingType"],
  ["SEC Company Name", "secCompanyName"],
  ["Tickers", "secTickers"],
  ["Exchanges", "secExchanges"],
  ["SEC Entity Type", "secEntityType"],
  ["SEC SIC", "secSic"],
  ["SEC Description", "secSicDescription"],
  ["SEC Category", "secCategory"],
  ["SEC Fiscal Year End", "secFiscalYearEnd"],
  ["SEC Investor Website", "secInvestorWebsite"],
  ["N-PORT Filing Date", "nportFilingDate"],
  ["N-CEN Filing Date", "ncenFilingDate"],
  ["LEI", "lei"],
] as const satisfies readonly [string, keyof PermanentCapitalCompany][];

const OPERATIONS_METADATA = [
  ["CCO", "ccoName"],
  ["Public Accountant", "publicAccountant"],
  ["Custodian", "custodian"],
  ["Transfer Agent", "transferAgent"],
  ["N-PORT Period", "nportPeriod"],
  ["File No.", "fileNo"],
  ["CIK", "cik"],
  ["Geocode Match", "geocodeMatch"],
  ["Matched Address", "geocodeMatchedAddress"],
] as const satisfies readonly [string, keyof PermanentCapitalCompany][];

const RENDERED_RAW_EQUIVALENT_KEYS = new Set<keyof PermanentCapitalCompany>([
  "address1",
  "address2",
  "brokers",
  "ccoName",
  "cik",
  "city",
  "custodian",
  "directors",
  "fileNo",
  "filingDate",
  "filingType",
  "fullAddress",
  "geocodeMatch",
  "geocodeMatchedAddress",
  "googleQuotedSearchUrl",
  "googleSearchUrl",
  "holdingsCount",
  "keyPeopleNames",
  "keyPeopleWithImages",
  "latitude",
  "lei",
  "liabilitiesToAssets",
  "longitude",
  "ncenFilingDate",
  "ncenUrl",
  "netAssetsUsd",
  "nportFilingDate",
  "nportPeriod",
  "nportUrl",
  "pricingServices",
  "publicAccountant",
  "secCategory",
  "secCompanyName",
  "secCompanySearchUrl",
  "secEntityType",
  "secExchanges",
  "secFiscalYearEnd",
  "secInvestorWebsite",
  "secSic",
  "secSicDescription",
  "secTickers",
  "state",
  "top10Holdings",
  "top10HoldingsWeightPct",
  "totalAssetsUsd",
  "totalLiabilitiesUsd",
  "transferAgent",
  "zipCode",
]);

const RAW_SOURCE_KEY_MAP: Record<string, keyof PermanentCapitalCompany> = {
  CIK: "cik",
  File_No: "fileNo",
  "Filing Date": "filingDate",
  "Filing Type": "filingType",
  Registrant_Name: "name",
  Address_1: "address1",
  Address_2: "address2",
  City: "city",
  State: "state",
  Zip_Code: "zipCode",
  key_people_with_image_src_json: "keyPeopleWithImages",
  top_10_holdings_json: "top10Holdings",
};

export function PermanentCapitalInspector({
  selection,
  onClose,
  onSelectCompany,
  className,
}: InspectorProps) {
  return (
    <aside
      className={cn(
        "pointer-events-auto relative flex max-h-full min-h-0 w-full flex-col overflow-y-auto overscroll-contain rounded-[8px] bg-[#121318] text-white",
        className,
      )}
    >
      {onClose ? (
        <button
          aria-label="Close permanent capital inspector"
          className="absolute right-token-16 top-token-16 z-10 grid size-[32px] place-items-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          type="button"
          onClick={onClose}
        >
          <X className="size-[16px]" />
        </button>
      ) : null}

      <div className="min-h-full px-token-20 pb-token-32 pt-token-20">
        {selection == null ? (
          <EmptyInspector />
        ) : selection.type === "aggregate" ? (
          <AggregateInspector
            companies={selection.companies}
            onSelectCompany={onSelectCompany}
          />
        ) : (
          <CompanyInspector
            aggregateCompanies={selection.aggregateCompanies}
            company={selection.company}
            onSelectCompany={onSelectCompany}
          />
        )}
      </div>
    </aside>
  );
}

export function PermanentCapitalSideSheet(props: InspectorProps) {
  return (
    <AnimatePresence>
      {props.selection ? (
        <motion.div
          animate={{ opacity: 1, x: 0 }}
          className="pointer-events-none fixed inset-y-0 right-0 z-40 hidden w-[min(476px,calc(100vw-32px))] p-token-20 md:block"
          data-permanent-capital-sheet="true"
          exit={{ opacity: 0, x: 72 }}
          initial={{ opacity: 0, x: 72 }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          onClick={(event) => stopSheetEvent(event, props.onSheetInteract)}
          onDoubleClick={(event) =>
            stopSheetEvent(event, props.onSheetInteract)
          }
          onMouseDown={(event) => stopSheetEvent(event, props.onSheetInteract)}
          onMouseUp={(event) => stopSheetEvent(event, props.onSheetInteract)}
          onPointerDown={(event) =>
            stopSheetEvent(event, props.onSheetInteract)
          }
          onPointerUp={(event) => stopSheetEvent(event, props.onSheetInteract)}
          onWheel={(event) => stopSheetEvent(event, props.onSheetInteract)}
        >
          <PermanentCapitalInspector
            {...props}
            className="h-[calc(100svh-40px)] shadow-2xl shadow-black/40"
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function stopSheetEvent(event: SyntheticEvent, onSheetInteract?: () => void) {
  onSheetInteract?.();
  event.stopPropagation();
  event.nativeEvent.stopImmediatePropagation();
}

export function PermanentCapitalDrawer(props: InspectorProps) {
  useNonModalDrawerBodyPointerEvents(props.selection != null);

  return (
    <Drawer.Root
      modal={false}
      open={props.selection != null}
      shouldScaleBackground={false}
      onOpenChange={(open) => {
        if (!open) props.onClose?.();
      }}
    >
      <Drawer.Portal>
        <Drawer.Content className="pointer-events-auto fixed inset-x-0 bottom-0 z-50 max-h-[82svh] rounded-t-[18px] bg-[#121318] outline-none md:hidden">
          <Drawer.Title className="sr-only">
            Permanent capital selection details
          </Drawer.Title>
          <div
            aria-hidden="true"
            className="mx-auto mt-token-8 h-[4px] w-[42px] rounded-full bg-white/25"
          />
          <PermanentCapitalInspector
            {...props}
            className="max-h-[calc(82svh-12px)] rounded-t-[18px]"
          />
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function useNonModalDrawerBodyPointerEvents(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;

    const previousPointerEvents = document.body.style.pointerEvents;
    const allowPageInteraction = () => {
      if (document.body.style.pointerEvents === "none") {
        document.body.style.pointerEvents = "auto";
      }
    };
    const observer = new MutationObserver(allowPageInteraction);

    allowPageInteraction();
    observer.observe(document.body, {
      attributeFilter: ["style"],
      attributes: true,
    });

    return () => {
      observer.disconnect();
      document.body.style.pointerEvents = previousPointerEvents;
    };
  }, [isOpen]);
}

function EmptyInspector() {
  return (
    <div className="grid min-h-[320px] content-center gap-token-8 text-center">
      <h2 className="leading-title font-title text-title text-white">
        Permanent Capital
      </h2>
      <p className="leading-body text-body text-text-secondary">
        Select a hexagon or company point to inspect the underlying data.
      </p>
    </div>
  );
}

function AggregateInspector({
  companies,
  onSelectCompany,
}: {
  companies: MappedPermanentCapitalCompany[];
  onSelectCompany?: (company: MappedPermanentCapitalCompany) => void;
}) {
  const totalAssets = getAggregateAssets(companies);
  const sortedCompanies = [...companies].sort(
    (a, b) => (b.totalAssetsUsd ?? 0) - (a.totalAssetsUsd ?? 0),
  );

  return (
    <div className="grid gap-token-32">
      <header className="grid gap-token-12">
        <p className="leading-subtext text-subtext text-text-secondary">
          Hexagon summary
        </p>
        <h2 className="leading-title font-title text-title text-white">
          {companies.length} {companies.length === 1 ? "company" : "companies"}
        </h2>
      </header>

      <dl className="leading-body grid gap-token-4 text-body">
        <MetadataRow label="Total Assets" value={formatCurrency(totalAssets)} />
        <MetadataRow
          label="Compact Total"
          value={formatCompactCurrency(totalAssets)}
        />
      </dl>

      <section className="gap-token-14 grid">
        <div className="flex items-end justify-between gap-token-12">
          <h3 className="leading-heading font-body text-heading font-semibold text-white">
            Companies
          </h3>
          <span className="leading-caption text-caption text-text-secondary">
            Ranked by assets
          </span>
        </div>
        <div className="grid gap-token-8">
          {sortedCompanies.map((company) => (
            <button
              key={company.id}
              className="py-token-10 grid grid-cols-[1fr_auto] items-center gap-token-12 rounded-[6px] border border-white/10 bg-white/[0.04] px-token-12 text-left transition hover:border-white/20 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              type="button"
              onClick={() => onSelectCompany?.(company)}
            >
              <span className="min-w-0">
                <span className="leading-body block truncate text-body text-white">
                  {getDisplayName(company)}
                </span>
                <span className="leading-caption block truncate text-caption text-text-secondary">
                  {formatDisplayText(
                    [company.city, company.state].filter(Boolean).join(", "),
                  )}
                </span>
              </span>
              <span className="leading-caption text-right text-caption text-[#e6e6e6]">
                {formatCompactCurrency(company.totalAssetsUsd)}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function CompanyInspector({
  company,
  aggregateCompanies,
  onSelectCompany,
}: {
  company: MappedPermanentCapitalCompany;
  aggregateCompanies?: MappedPermanentCapitalCompany[];
  onSelectCompany?: (company: MappedPermanentCapitalCompany) => void;
}) {
  const addressLines = getAddressLines(company);
  const people = getPeople(company);

  return (
    <div className="grid gap-[35px]">
      <header className="gap-token-28 grid">
        <div className="grid gap-token-20">
          <h2 className="leading-title pr-token-32 font-title text-title text-white">
            {getDisplayName(company)}
          </h2>
          <div className="leading-subtext grid gap-[2px] text-subtext text-text-secondary">
            {addressLines.length > 0 ? (
              addressLines.map((line) => <p key={line}>{line}</p>)
            ) : (
              <p>Address unavailable</p>
            )}
          </div>
        </div>

        {people.length > 0 ? (
          <div className="grid gap-[3px]">
            {people.map((person) => (
              <div
                key={person.name}
                className="grid grid-cols-[48px_1fr] items-center gap-[11px]"
              >
                <PersonAvatar imageSrc={person.imageSrc} name={person.name} />
                <p className="leading-body truncate text-body text-white">
                  {person.name}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </header>

      <dl className="leading-body grid gap-token-4 text-body">
        {PRIMARY_METADATA.map(([label, key]) => (
          <MetadataRow
            key={label}
            label={label}
            value={companyValue(company, key)}
          />
        ))}
      </dl>

      <dl className="leading-body grid gap-token-4 text-body">
        <MetadataRow
          label="Total Assets"
          value={`${formatCurrency(company.totalAssetsUsd)} / ${formatCompactCurrency(company.totalAssetsUsd)}`}
        />
        <MetadataRow
          label="Net Assets"
          value={`${formatCurrency(company.netAssetsUsd)} / ${formatCompactCurrency(company.netAssetsUsd)}`}
        />
        <MetadataRow
          label="Liabilities"
          value={formatCurrency(company.totalLiabilitiesUsd)}
        />
        <MetadataRow
          label="Liabilities / Assets"
          value={formatRatio(company.liabilitiesToAssets)}
        />
      </dl>

      <MetadataSection
        rows={OPERATIONS_METADATA.map(([label, key]) => [
          label,
          companyValue(company, key),
        ])}
        title="Operations"
      />

      <ListSection title="Pricing Services" values={company.pricingServices} />
      <ListSection title="Brokers" values={company.brokers} />
      <ListSection title="Directors" values={company.directors} />

      <section className="gap-token-28 grid">
        <div className="flex items-start justify-between gap-token-16">
          <h3 className="leading-heading font-body text-heading font-semibold text-white">
            Top 10 Holdings
          </h3>
          <div className="text-right">
            <p className="leading-body font-body text-body font-semibold text-[#e6e6e6]">
              {formatMetadataPercent(company.top10HoldingsWeightPct)}
            </p>
            <p className="leading-body text-text-secondary/80 text-body">
              of {formatCompactCurrency(company.netAssetsUsd)} NAV ·{" "}
              {company.holdingsCount || "Unknown"} holdings
            </p>
          </div>
        </div>
        <HoldingsCompositionBar company={company} />
      </section>

      <CompanyLinks company={company} />

      <MetadataSection
        rows={getRawMetadataRows(company)}
        title="Raw Metadata"
      />

      {aggregateCompanies && aggregateCompanies.length > 1 ? (
        <section className="grid gap-token-12 border-t border-white/10 pt-token-20">
          <h3 className="leading-body font-body text-body font-semibold text-white">
            Other companies in this hexagon
          </h3>
          <div className="gap-token-6 grid">
            {aggregateCompanies
              .filter((item) => item.id !== company.id)
              .slice(0, 8)
              .map((item) => (
                <button
                  key={item.id}
                  className="gap-token-10 px-token-10 leading-caption grid grid-cols-[1fr_auto] rounded-[6px] py-token-8 text-left text-caption text-text-secondary transition hover:bg-white/[0.06] hover:text-white"
                  type="button"
                  onClick={() => onSelectCompany?.(item)}
                >
                  <span className="truncate">{getDisplayName(item)}</span>
                  <span>{formatCompactCurrency(item.totalAssetsUsd)}</span>
                </button>
              ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  if (!isPresent(value)) return null;

  return (
    <div className="grid grid-cols-[minmax(112px,1fr)_minmax(120px,210px)] items-start justify-between gap-token-12">
      <dt className="text-text-secondary">{label}</dt>
      <dd className="break-words text-right text-[#e6e6e6]">
        {formatMetadataDisplayValue(label, value)}
      </dd>
    </div>
  );
}

function MetadataSection({
  rows,
  title,
}: {
  rows: Array<readonly [string, string]>;
  title: string;
}) {
  const visibleRows = rows.filter(([, value]) => isPresent(value));

  if (visibleRows.length === 0) return null;

  return (
    <section className="grid gap-token-12 border-t border-white/10 pt-token-20">
      <h3 className="leading-body font-body text-body font-semibold text-white">
        {title}
      </h3>
      <dl className="leading-body grid gap-token-4 text-body">
        {visibleRows.map(([label, value]) => (
          <MetadataRow key={label} label={label} value={value} />
        ))}
      </dl>
    </section>
  );
}

function ListSection({ title, values }: { title: string; values: string[] }) {
  const visibleValues = values
    .filter(isPresent)
    .map((value) => formatDisplayText(value))
    .slice(0, 20);

  if (visibleValues.length === 0) return null;

  return (
    <section className="grid gap-token-12 border-t border-white/10 pt-token-20">
      <h3 className="leading-body font-body text-body font-semibold text-white">
        {title}
      </h3>
      <div className="gap-token-6 flex flex-wrap">
        {visibleValues.map((value) => (
          <span
            key={value}
            className="leading-caption rounded-[6px] border border-white/10 bg-white/[0.04] px-token-8 py-token-4 text-caption text-[#e6e6e6]"
          >
            {value}
          </span>
        ))}
      </div>
    </section>
  );
}

function PersonAvatar({ imageSrc, name }: { imageSrc: string; name: string }) {
  return (
    <span className="leading-caption grid size-[48px] shrink-0 place-items-center overflow-hidden rounded-full bg-white text-caption font-semibold text-[#121318]">
      {imageSrc ? (
        // TODO: validate image_src identity before showing officer headshots from enriched data.
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="" className="size-full object-cover" src={imageSrc} />
      ) : (
        getInitials(name)
      )}
    </span>
  );
}

function CompanyLinks({ company }: { company: PermanentCapitalCompany }) {
  const links = [
    ["N-PORT filing", company.nportUrl],
    ["N-CEN filing", company.ncenUrl],
    ["SEC search", company.secCompanySearchUrl],
    ["Investor website", company.secInvestorWebsite],
  ].filter((link): link is [string, string] => Boolean(link[1]));

  if (links.length === 0) return null;

  return (
    <section className="grid gap-token-8">
      {links.map(([label, href]) => (
        <a
          key={label}
          className="gap-token-6 leading-body inline-flex items-center text-body text-[#e6e6e6] underline-offset-4 hover:text-white hover:underline"
          href={href}
          rel="noreferrer"
          target="_blank"
        >
          {label}
          <ExternalLink className="size-[14px]" />
        </a>
      ))}
    </section>
  );
}

function companyValue(
  company: PermanentCapitalCompany,
  key: keyof PermanentCapitalCompany,
) {
  const value = company[key];

  if (key === "secFiscalYearEnd" && typeof value === "string") {
    return formatFiscalYearEnd(value);
  }

  return typeof value === "string" ? formatDisplayText(value) : "";
}

function formatMetadataPercent(value: number | null) {
  return value == null ? "Unknown" : `${value.toFixed(1)}%`;
}

function getRawMetadataRows(company: PermanentCapitalCompany) {
  const displayedKeys = new Set<string>([
    ...PRIMARY_METADATA.map(([, key]) => key),
    ...OPERATIONS_METADATA.map(([, key]) => key),
    ...RENDERED_RAW_EQUIVALENT_KEYS,
  ]);

  return Object.entries(company.raw)
    .filter(
      ([key, value]) =>
        !displayedKeys.has(normalizeRawSourceKey(key)) &&
        rawValueIsPresent(value),
    )
    .map(
      ([key, value]) =>
        [humanizeRawKey(key), stringifyRawValue(value)] as const,
    )
    .slice(0, 80);
}

function normalizeRawSourceKey(key: string) {
  return RAW_SOURCE_KEY_MAP[key] ?? snakeLikeToCamelCase(key);
}

function snakeLikeToCamelCase(key: string) {
  const normalizedKey = key
    .trim()
    .replaceAll(/[^a-zA-Z0-9]+/g, "_")
    .toLocaleLowerCase("en-US");

  return normalizedKey.replaceAll(/_([a-z0-9])/g, (_, letter: string) =>
    letter.toLocaleUpperCase("en-US"),
  );
}

function rawValueIsPresent(value: unknown) {
  if (value == null) return false;
  if (typeof value === "string") return isPresent(value);
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function stringifyRawValue(value: unknown) {
  if (typeof value === "string") return formatDisplayText(value);
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return formatDisplayText(JSON.stringify(value));
}

function humanizeRawKey(key: string) {
  return key.replaceAll("_", " ");
}

function isPresent(value: string) {
  return Boolean(value.trim()) && value !== "Unknown";
}

function formatMetadataDisplayValue(label: string, value: string) {
  if (label === "LEI" || label === "CIK" || label === "SEC SIC") return value;
  if (label === "Tickers" || label === "Exchanges") {
    return value
      .split(/[;,]/)
      .map((item) => formatDisplayText(item))
      .join(", ");
  }

  return value;
}
