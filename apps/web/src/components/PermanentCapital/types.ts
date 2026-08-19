export type PermanentCapitalHolding = {
  name?: string;
  title?: string;
  value_usd?: number;
  pct_nav?: number;
  asset_category?: string;
};

export type PermanentCapitalPerson = {
  name?: string;
  image_src?: string;
};

export type PermanentCapitalCompany = {
  id: string;
  fileNo: string;
  cik: string;
  name: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zipCode: string;
  fullAddress: string;
  latitude: number | null;
  longitude: number | null;
  mapped: boolean;
  filingDate: string;
  filingType: string;
  secCompanyName: string;
  secTickers: string;
  secExchanges: string;
  secEntityType: string;
  secSic: string;
  secSicDescription: string;
  secCategory: string;
  secFiscalYearEnd: string;
  secInvestorWebsite: string;
  nportFilingDate: string;
  nportPeriod: string;
  nportUrl: string;
  ncenFilingDate: string;
  ncenUrl: string;
  lei: string;
  totalAssetsUsd: number | null;
  netAssetsUsd: number | null;
  totalLiabilitiesUsd: number | null;
  liabilitiesToAssets: number | null;
  holdingsCount: number;
  top10HoldingsWeightPct: number | null;
  top10Holdings: PermanentCapitalHolding[];
  keyPeopleNames: string[];
  keyPeopleWithImages: PermanentCapitalPerson[];
  directors: string[];
  pricingServices: string[];
  brokers: string[];
  ccoName: string;
  publicAccountant: string;
  custodian: string;
  transferAgent: string;
  googleSearchUrl: string;
  googleQuotedSearchUrl: string;
  secCompanySearchUrl: string;
  geocodeMatch: string;
  geocodeMatchedAddress: string;
  raw: Record<string, unknown>;
};

export type PermanentCapitalDataset = {
  source: string;
  recordCount: number;
  mappedCount: number;
  unmappedCount: number;
  companies: PermanentCapitalCompany[];
};

export type MappedPermanentCapitalCompany = PermanentCapitalCompany & {
  latitude: number;
  longitude: number;
};

export type PermanentCapitalSelection =
  | {
      type: "aggregate";
      companies: MappedPermanentCapitalCompany[];
    }
  | {
      type: "company";
      company: MappedPermanentCapitalCompany;
      aggregateCompanies?: MappedPermanentCapitalCompany[];
    };
