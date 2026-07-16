import { z } from "zod";

import { SITE_ORIGIN } from "~/config/site";

export const DEFAULT_LIVEKIT_AGENT_NAME = "dennis-portfolio-agent";

const DEV_ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "http://localhost:6006",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:6006",
]);
const PRODUCTION_ALLOWED_ORIGINS = new Set([SITE_ORIGIN]);

export const nodeEnvSchema = z.enum(["development", "test", "production"]);

export type LiveKitNodeEnv = z.infer<typeof nodeEnvSchema>;

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

export function isLocalDevelopmentOrigin(origin: string) {
  try {
    const { hostname, protocol } = new URL(origin);

    return (
      protocol === "http:" &&
      (hostname === "localhost" || hostname === "127.0.0.1")
    );
  } catch {
    return false;
  }
}

export function isCanonicalLiveKitProduction({
  nodeEnv,
  vercelEnv = process.env.VERCEL_ENV,
}: {
  nodeEnv: LiveKitNodeEnv;
  vercelEnv?: string;
}) {
  if (nodeEnv !== "production") {
    return false;
  }

  return vercelEnv === undefined || vercelEnv === "production";
}

export function resolveLiveKitAllowedOrigins({
  configuredOrigins,
  nodeEnv,
  vercelEnv,
}: {
  configuredOrigins?: string;
  nodeEnv: LiveKitNodeEnv;
  vercelEnv?: string;
}) {
  if (isCanonicalLiveKitProduction({ nodeEnv, vercelEnv })) {
    return new Set(PRODUCTION_ALLOWED_ORIGINS);
  }

  const configured = configuredOrigins
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configured?.length) {
    return new Set(configured);
  }

  return new Set(DEV_ALLOWED_ORIGINS);
}

export function isLiveKitOriginAllowed({
  configuredOrigins,
  nodeEnv,
  origin,
}: {
  configuredOrigins?: string;
  nodeEnv: LiveKitNodeEnv;
  origin: string | null;
}) {
  if (!origin) {
    return true;
  }

  if (nodeEnv !== "production" && isLocalDevelopmentOrigin(origin)) {
    return true;
  }

  return resolveLiveKitAllowedOrigins({ configuredOrigins, nodeEnv }).has(
    origin,
  );
}

export function createLiveKitId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`;
}

export function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim();
}

export function isAuthorizedForLiveKitToken({
  nodeEnv,
  request,
  tokenAuthSecret,
}: {
  nodeEnv: LiveKitNodeEnv;
  request: Request;
  tokenAuthSecret?: string;
}) {
  if (!tokenAuthSecret) {
    return nodeEnv !== "production";
  }

  const suppliedSecret =
    getBearerToken(request) ?? request.headers.get("x-livekit-token-auth");

  return suppliedSecret === tokenAuthSecret;
}

export function getResolvedLiveKitAgentName({
  liveKitAgentName,
  nextPublicAgentName,
}: {
  liveKitAgentName?: string;
  nextPublicAgentName?: string;
}) {
  return liveKitAgentName ?? nextPublicAgentName ?? DEFAULT_LIVEKIT_AGENT_NAME;
}

export function getLiveKitCorsHeaders({
  allowMethods,
  configuredOrigins,
  nodeEnv,
  request,
}: {
  allowMethods: string;
  configuredOrigins?: string;
  nodeEnv: LiveKitNodeEnv;
  request: Request;
}) {
  const origin = request.headers.get("origin");
  const baseHeaders = {
    "Access-Control-Allow-Headers":
      "Authorization, Content-Type, X-LiveKit-Token-Auth",
    "Access-Control-Allow-Methods": allowMethods,
    Vary: "Origin",
  };

  if (
    !origin ||
    !isLiveKitOriginAllowed({ configuredOrigins, nodeEnv, origin })
  ) {
    return baseHeaders;
  }

  return {
    ...baseHeaders,
    "Access-Control-Allow-Origin": origin,
  };
}
