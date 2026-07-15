import { z } from "zod";

export const DEFAULT_LIVEKIT_AGENT_NAME = "dennis-portfolio-agent";

const DEV_ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "http://localhost:6006",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:6006",
]);
const CORS_BASE_HEADERS = {
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, X-LiveKit-Token-Auth",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  Vary: "Origin",
};

export const nodeEnvSchema = z.enum(["development", "test", "production"]);
export const liveKitEnvSchema = z.object({
  LIVEKIT_URL: z.string().url().optional(),
  LIVEKIT_API_KEY: z.string().optional(),
  LIVEKIT_API_SECRET: z.string().optional(),
  LIVEKIT_AGENT_NAME: z.string().optional(),
  LIVEKIT_ALLOWED_ORIGINS: z.string().optional(),
  LIVEKIT_TOKEN_AUTH_SECRET: z.string().optional(),
  NEXT_PUBLIC_LIVEKIT_AGENT_NAME: z.string().optional(),
  NODE_ENV: nodeEnvSchema,
});

export function optionalEnv(value: string | undefined) {
  return value && value.length > 0 ? value : undefined;
}

export function parseNodeEnv(value: string | undefined) {
  if (value === undefined) {
    return "development";
  }

  const parsed = nodeEnvSchema.safeParse(value);

  return parsed.success ? parsed.data : "production";
}

export const rawLiveKitEnv = {
  LIVEKIT_URL: optionalEnv(process.env.LIVEKIT_URL),
  LIVEKIT_API_KEY: optionalEnv(process.env.LIVEKIT_API_KEY),
  LIVEKIT_API_SECRET: optionalEnv(process.env.LIVEKIT_API_SECRET),
  LIVEKIT_AGENT_NAME: optionalEnv(process.env.LIVEKIT_AGENT_NAME),
  LIVEKIT_ALLOWED_ORIGINS: optionalEnv(process.env.LIVEKIT_ALLOWED_ORIGINS),
  LIVEKIT_TOKEN_AUTH_SECRET: optionalEnv(process.env.LIVEKIT_TOKEN_AUTH_SECRET),
  NEXT_PUBLIC_LIVEKIT_AGENT_NAME: optionalEnv(
    process.env.NEXT_PUBLIC_LIVEKIT_AGENT_NAME,
  ),
  NODE_ENV: parseNodeEnv(process.env.NODE_ENV),
};
const parsedLiveKitEnv = liveKitEnvSchema.safeParse(rawLiveKitEnv);

export const liveKitEnv = parsedLiveKitEnv.success
  ? parsedLiveKitEnv.data
  : rawLiveKitEnv;
export const liveKitEnvIssues = parsedLiveKitEnv.success
  ? []
  : parsedLiveKitEnv.error.issues;

export function getAllowedOrigins() {
  const configuredOrigins = liveKitEnv.LIVEKIT_ALLOWED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configuredOrigins?.length) {
    return new Set(configuredOrigins);
  }

  return liveKitEnv.NODE_ENV === "production"
    ? new Set<string>()
    : DEV_ALLOWED_ORIGINS;
}

export function isOriginAllowed(origin: string | null) {
  if (!origin) {
    return true;
  }

  return getAllowedOrigins().has(origin);
}

export function getCorsHeaders(request: Request) {
  const origin = request.headers.get("origin");

  if (!origin || !isOriginAllowed(origin)) {
    return CORS_BASE_HEADERS;
  }

  return {
    ...CORS_BASE_HEADERS,
    "Access-Control-Allow-Origin": origin,
  };
}

export function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim();
}

export function isAuthorizedForLiveKitToken(
  request: Request,
  options: { allowUnauthenticatedNonProduction?: boolean } = {},
) {
  if (
    options.allowUnauthenticatedNonProduction &&
    liveKitEnv.NODE_ENV !== "production"
  ) {
    return true;
  }

  const expectedSecret = liveKitEnv.LIVEKIT_TOKEN_AUTH_SECRET;

  if (!expectedSecret) {
    return liveKitEnv.NODE_ENV !== "production";
  }

  const suppliedSecret =
    getBearerToken(request) ?? request.headers.get("x-livekit-token-auth");

  return suppliedSecret === expectedSecret;
}

export function getResolvedAgentName() {
  return (
    liveKitEnv.LIVEKIT_AGENT_NAME ??
    liveKitEnv.NEXT_PUBLIC_LIVEKIT_AGENT_NAME ??
    DEFAULT_LIVEKIT_AGENT_NAME
  );
}

export function assertLiveKitTokenEnv() {
  if (liveKitEnvIssues.length > 0) {
    return {
      ok: false as const,
      error: "LiveKit token endpoint has invalid environment configuration.",
      issues: liveKitEnvIssues,
    };
  }

  if (
    !liveKitEnv.LIVEKIT_URL ||
    !liveKitEnv.LIVEKIT_API_KEY ||
    !liveKitEnv.LIVEKIT_API_SECRET
  ) {
    return {
      ok: false as const,
      error:
        "LiveKit token endpoint is not configured. Set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET.",
      issues: [],
    };
  }

  return {
    ok: true as const,
    LIVEKIT_URL: liveKitEnv.LIVEKIT_URL,
    LIVEKIT_API_KEY: liveKitEnv.LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET: liveKitEnv.LIVEKIT_API_SECRET,
  };
}
