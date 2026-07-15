import { RoomAgentDispatch, RoomConfiguration } from "@livekit/protocol";
import { Client as QStashClient } from "@upstash/qstash";
import { Redis } from "@upstash/redis";
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { cookies } from "next/headers";
import { z } from "zod";

import {
  LIVEKIT_GUEST_ACTIVE_TTL_SECONDS,
  LIVEKIT_GUEST_CLEANUP_ENABLED,
  LIVEKIT_GUEST_COOKIE_NAME,
  LIVEKIT_GUEST_COOLDOWN_ENABLED,
  LIVEKIT_GUEST_COOLDOWN_SECONDS,
  LIVEKIT_GUEST_NO_SPEECH_TIMEOUT_SECONDS,
  LIVEKIT_GUEST_REDIS_PREFIX,
  LIVEKIT_GUEST_SESSION_SECONDS,
  LIVEKIT_GUEST_SIGNUP_URL,
  LIVEKIT_GUEST_TOKEN_TTL_SECONDS,
} from "./guest-session-config";

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
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
  Vary: "Origin",
};
const nodeEnvSchema = z.enum(["development", "test", "production"]);
const liveKitEnvSchema = z.object({
  LIVEKIT_URL: z.string().url().optional(),
  LIVEKIT_API_KEY: z.string().optional(),
  LIVEKIT_API_SECRET: z.string().optional(),
  LIVEKIT_AGENT_NAME: z.string().optional(),
  LIVEKIT_ALLOWED_ORIGINS: z.string().optional(),
  LIVEKIT_TOKEN_AUTH_SECRET: z.string().optional(),
  NEXT_PUBLIC_LIVEKIT_AGENT_NAME: z.string().optional(),
  NODE_ENV: nodeEnvSchema,
});
const guestEnvSchema = liveKitEnvSchema.extend({
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  QSTASH_URL: z.string().url().optional(),
  QSTASH_TOKEN: z.string().optional(),
  QSTASH_CURRENT_SIGNING_KEY: z.string().optional(),
  QSTASH_NEXT_SIGNING_KEY: z.string().optional(),
  LIVEKIT_GUEST_RATE_LIMIT_SALT: z.string().min(16).optional(),
});

function optionalEnv(value: string | undefined) {
  return value && value.length > 0 ? value : undefined;
}

function parseNodeEnv(value: string | undefined) {
  if (value === undefined) {
    return "development";
  }

  const parsed = nodeEnvSchema.safeParse(value);

  return parsed.success ? parsed.data : "production";
}

function isLocalDevelopmentOrigin(origin: string) {
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

const rawEnv = {
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
  UPSTASH_REDIS_REST_URL: optionalEnv(process.env.UPSTASH_REDIS_REST_URL),
  UPSTASH_REDIS_REST_TOKEN: optionalEnv(process.env.UPSTASH_REDIS_REST_TOKEN),
  QSTASH_URL: optionalEnv(process.env.QSTASH_URL),
  QSTASH_TOKEN: optionalEnv(process.env.QSTASH_TOKEN),
  QSTASH_CURRENT_SIGNING_KEY: optionalEnv(
    process.env.QSTASH_CURRENT_SIGNING_KEY,
  ),
  QSTASH_NEXT_SIGNING_KEY: optionalEnv(process.env.QSTASH_NEXT_SIGNING_KEY),
  LIVEKIT_GUEST_RATE_LIMIT_SALT: optionalEnv(
    process.env.LIVEKIT_GUEST_RATE_LIMIT_SALT,
  ),
};
const parsedGuestEnv = guestEnvSchema.safeParse(rawEnv);

export const liveKitEnv = parsedGuestEnv.success ? parsedGuestEnv.data : rawEnv;
export const liveKitEnvIssues = parsedGuestEnv.success
  ? []
  : parsedGuestEnv.error.issues;

export type GuestSessionRecord = {
  sessionId: string;
  roomName: string;
  participantIdentity: string;
  agentName: string;
  expiresAt: string;
  createdAt: string;
  deviceHash: string;
  ipHash: string;
  status: "active" | "expired";
};

export type LiveKitGuestTokenPayload = {
  server_url: string;
  participant_token: string;
  session_id: string;
  room_name: string;
  expires_at: string;
  duration_seconds: number;
  no_speech_timeout_seconds: number;
  cleanup_enabled: boolean;
  signup_url: string;
  agent_dispatch_mode: "token_room_config";
  agent_dispatch_names: string[];
};

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

  if (
    liveKitEnv.NODE_ENV !== "production" &&
    isLocalDevelopmentOrigin(origin)
  ) {
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

export function isAuthorizedForLiveKitToken(request: Request) {
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

export function assertGuestSessionEnv() {
  const liveKit = assertLiveKitTokenEnv();

  if (!liveKit.ok) {
    return liveKit;
  }

  const missing = [
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "LIVEKIT_GUEST_RATE_LIMIT_SALT",
    ...(LIVEKIT_GUEST_CLEANUP_ENABLED
      ? [
          "QSTASH_URL",
          "QSTASH_TOKEN",
          "QSTASH_CURRENT_SIGNING_KEY",
          "QSTASH_NEXT_SIGNING_KEY",
        ]
      : []),
  ].filter((key) => !liveKitEnv[key as keyof typeof liveKitEnv]);

  if (missing.length > 0) {
    return {
      ok: false as const,
      error:
        "LiveKit guest sessions are not configured. Set Upstash Redis, QStash, and LIVEKIT_GUEST_RATE_LIMIT_SALT.",
      issues: missing.map((key) => ({ path: [key], message: "Required" })),
    };
  }

  return {
    ok: true as const,
    LIVEKIT_URL: liveKit.LIVEKIT_URL,
    LIVEKIT_API_KEY: liveKit.LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET: liveKit.LIVEKIT_API_SECRET,
    UPSTASH_REDIS_REST_URL: liveKitEnv.UPSTASH_REDIS_REST_URL!,
    UPSTASH_REDIS_REST_TOKEN: liveKitEnv.UPSTASH_REDIS_REST_TOKEN!,
    QSTASH_URL: liveKitEnv.QSTASH_URL,
    QSTASH_TOKEN: liveKitEnv.QSTASH_TOKEN,
    LIVEKIT_GUEST_RATE_LIMIT_SALT: liveKitEnv.LIVEKIT_GUEST_RATE_LIMIT_SALT!,
  };
}

export function createRedis() {
  const env = assertGuestSessionEnv();

  if (!env.ok) {
    throw new Error(env.error);
  }

  return new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });
}

export function createQStashClient() {
  const env = assertGuestSessionEnv();

  if (!env.ok) {
    throw new Error(env.error);
  }

  if (!env.QSTASH_URL || !env.QSTASH_TOKEN) {
    throw new Error(
      "LiveKit guest cleanup is not configured. Set QSTASH_URL and QSTASH_TOKEN.",
    );
  }

  return new QStashClient({
    baseUrl: env.QSTASH_URL,
    token: env.QSTASH_TOKEN,
  });
}

export function createRoomServiceClient() {
  const env = assertLiveKitTokenEnv();

  if (!env.ok) {
    throw new Error(env.error);
  }

  return new RoomServiceClient(
    env.LIVEKIT_URL,
    env.LIVEKIT_API_KEY,
    env.LIVEKIT_API_SECRET,
  );
}

export function isRoomNotFoundError(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return String(error).toLowerCase().includes("not found");
  }

  const maybeError = error as {
    code?: unknown;
    message?: unknown;
    status?: unknown;
  };
  const message =
    typeof maybeError.message === "string" ? maybeError.message : "";

  return (
    maybeError.status === 404 ||
    maybeError.code === "not_found" ||
    message.toLowerCase().includes("not found")
  );
}

export function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`;
}

export function guestSessionKey(sessionId: string) {
  return `${LIVEKIT_GUEST_REDIS_PREFIX}:session:${sessionId}`;
}

export function guestDeviceCooldownKey(deviceHash: string) {
  return `${LIVEKIT_GUEST_REDIS_PREFIX}:device:${deviceHash}`;
}

export function guestIpCooldownKey(ipHash: string) {
  return `${LIVEKIT_GUEST_REDIS_PREFIX}:ip:${ipHash}`;
}

export function guestActiveKey(deviceHash: string, ipHash: string) {
  return `${LIVEKIT_GUEST_REDIS_PREFIX}:active:${deviceHash}:${ipHash}`;
}

export async function expireGuestSessionRecord(record: GuestSessionRecord) {
  try {
    await createRoomServiceClient().deleteRoom(record.roomName);
  } catch (error) {
    if (!isRoomNotFoundError(error)) {
      throw error;
    }
  }

  const redis = createRedis();
  const expiredRecord: GuestSessionRecord = {
    ...record,
    status: "expired",
  };
  const activeKey = guestActiveKey(record.deviceHash, record.ipHash);
  const activeSessionId = await redis.get<string>(activeKey);
  const expireOperations: Array<Promise<unknown>> = [
    redis.set(guestSessionKey(record.sessionId), expiredRecord, {
      ex: LIVEKIT_GUEST_COOLDOWN_SECONDS,
    }),
  ];

  if (activeSessionId === record.sessionId) {
    expireOperations.push(redis.del(activeKey));
  }

  await Promise.all(expireOperations);

  return expiredRecord;
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const vercelForwardedFor = request.headers.get("x-vercel-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  return (
    vercelForwardedFor ??
    realIp ??
    forwardedFor?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export async function getOrCreateGuestDeviceId() {
  const cookieStore = await cookies();
  const existing = cookieStore.get(LIVEKIT_GUEST_COOKIE_NAME)?.value;

  if (existing) {
    return { deviceId: existing, isNew: false };
  }

  return { deviceId: crypto.randomUUID(), isNew: true };
}

export async function hashGuestIdentifier(value: string) {
  const env = assertGuestSessionEnv();

  if (!env.ok) {
    throw new Error(env.error);
  }

  const encoded = new TextEncoder().encode(
    `${env.LIVEKIT_GUEST_RATE_LIMIT_SALT}:${value}`,
  );
  const digest = await crypto.subtle.digest("SHA-256", encoded);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function issueGuestLiveKitToken(record: GuestSessionRecord) {
  const env = assertLiveKitTokenEnv();

  if (!env.ok) {
    throw new Error(env.error);
  }

  const token = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
    identity: record.participantIdentity,
    name: "Guest",
    ttl: `${LIVEKIT_GUEST_TOKEN_TTL_SECONDS}s`,
  });

  token.addGrant({
    roomJoin: true,
    room: record.roomName,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  });

  token.roomConfig = new RoomConfiguration({
    name: record.roomName,
    agents: [
      new RoomAgentDispatch({
        agentName: record.agentName,
        metadata: JSON.stringify({
          source: "guest_session",
          session_id: record.sessionId,
          expires_at: record.expiresAt,
        }),
      }),
    ],
  });

  return {
    server_url: env.LIVEKIT_URL,
    participant_token: await token.toJwt(),
    session_id: record.sessionId,
    room_name: record.roomName,
    expires_at: record.expiresAt,
    duration_seconds: LIVEKIT_GUEST_SESSION_SECONDS,
    no_speech_timeout_seconds: LIVEKIT_GUEST_NO_SPEECH_TIMEOUT_SECONDS,
    cleanup_enabled: LIVEKIT_GUEST_CLEANUP_ENABLED,
    signup_url: LIVEKIT_GUEST_SIGNUP_URL,
    agent_dispatch_mode: "token_room_config",
    agent_dispatch_names: [record.agentName],
  } satisfies LiveKitGuestTokenPayload;
}

export function getGuestExpireUrl(request: Request) {
  const requestOrigin = new URL(request.url).origin;

  if (isOriginAllowed(requestOrigin)) {
    return new URL(
      "/api/livekit/guest-session/expire",
      requestOrigin,
    ).toString();
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");

  if (forwardedHost) {
    const proto = forwardedProto?.split(",")[0]?.trim() ?? "https";
    const host = forwardedHost.split(",")[0]?.trim();
    const candidateOrigin = `${proto}://${host}`;

    if (isOriginAllowed(candidateOrigin)) {
      return new URL(
        "/api/livekit/guest-session/expire",
        candidateOrigin,
      ).toString();
    }
  }

  throw new Error("Unable to build an allowed LiveKit guest expiration URL.");
}

export {
  LIVEKIT_GUEST_ACTIVE_TTL_SECONDS,
  LIVEKIT_GUEST_CLEANUP_ENABLED,
  LIVEKIT_GUEST_COOKIE_NAME,
  LIVEKIT_GUEST_COOLDOWN_ENABLED,
  LIVEKIT_GUEST_COOLDOWN_SECONDS,
  LIVEKIT_GUEST_NO_SPEECH_TIMEOUT_SECONDS,
  LIVEKIT_GUEST_SESSION_SECONDS,
  LIVEKIT_GUEST_SIGNUP_URL,
};
