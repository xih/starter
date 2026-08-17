export const SITE_ORIGIN = "https://www.dennisxing.fm";

const SITE_METADATA_ORIGIN =
  process.env.NODE_ENV === "development" ? "http://localhost:3000" : SITE_ORIGIN;

export const SITE_URL = new URL(SITE_METADATA_ORIGIN);
