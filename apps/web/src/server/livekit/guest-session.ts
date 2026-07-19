import { RoomAgentDispatch, RoomConfiguration } from "@livekit/protocol";
import { Client as QStashClient } from "@upstash/qstash";
import { Redis } from "@upstash/redis";
import {
  AccessToken,
  AgentDispatchClient,
  RoomServiceClient,
} from "livekit-server-sdk";
import { cookies } from "next/headers";
import { z } from "zod";

import {
  createLiveKitId,
  getLiveKitCorsHeaders,
  getResolvedLiveKitAgentName,
  isAuthorizedForLiveKitToken as isLiveKitTokenAuthorized,
  isLiveKitOriginAllowed,
  nodeEnvSchema,
  optionalEnv,
  parseNodeEnv,
  resolveLiveKitAllowedOrigins,
} from "./route-policy";
import {
  LIVEKIT_GUEST_ACTIVE_TTL_SECONDS,
  LIVEKIT_GUEST_CLEANUP_ENABLED,
  LIVEKIT_GUEST_COOKIE_NAME,
  LIVEKIT_GUEST_COOLDOWN_ENABLED,
  LIVEKIT_GUEST_COOLDOWN_SECONDS,
  LIVEKIT_GUEST_ROOM_DEPARTURE_TIMEOUT_SECONDS,
  LIVEKIT_GUEST_REDIS_PREFIX,
  LIVEKIT_GUEST_SESSION_SECONDS,
  LIVEKIT_GUEST_SIGNUP_URL,
  LIVEKIT_GUEST_TOKEN_TTL_SECONDS,
} from "./guest-session-config";

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
  personaId: string;
  userId: string;
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
  cleanup_enabled: boolean;
  signup_url: string;
  agent_dispatch_mode: "connected_explicit_dispatch" | "token_room_config";
  agent_dispatch_names: string[];
};

export function getAllowedOrigins() {
  return resolveLiveKitAllowedOrigins({
    configuredOrigins: liveKitEnv.LIVEKIT_ALLOWED_ORIGINS,
    nodeEnv: liveKitEnv.NODE_ENV,
  });
}

export function isOriginAllowed(origin: string | null) {
  if (liveKitEnv.NODE_ENV === "production" && !origin) {
    return false;
  }

  return isLiveKitOriginAllowed({
    configuredOrigins: liveKitEnv.LIVEKIT_ALLOWED_ORIGINS,
    nodeEnv: liveKitEnv.NODE_ENV,
    origin,
  });
}

export function getCorsHeaders(request: Request) {
  return getLiveKitCorsHeaders({
    allowMethods: "GET, POST, DELETE, OPTIONS",
    configuredOrigins: liveKitEnv.LIVEKIT_ALLOWED_ORIGINS,
    nodeEnv: liveKitEnv.NODE_ENV,
    request,
  });
}

export function isAuthorizedForLiveKitToken(request: Request) {
  return isLiveKitTokenAuthorized({
    nodeEnv: liveKitEnv.NODE_ENV,
    request,
    tokenAuthSecret: liveKitEnv.LIVEKIT_TOKEN_AUTH_SECRET,
  });
}

export function getResolvedAgentName() {
  return getResolvedLiveKitAgentName({
    liveKitAgentName: liveKitEnv.LIVEKIT_AGENT_NAME,
    nextPublicAgentName: liveKitEnv.NEXT_PUBLIC_LIVEKIT_AGENT_NAME,
  });
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
        "LiveKit guest sessions are not configured. Set Upstash Redis and LIVEKIT_GUEST_RATE_LIMIT_SALT.",
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

export function createAgentDispatchClient() {
  const env = assertLiveKitTokenEnv();

  if (!env.ok) {
    throw new Error(env.error);
  }

  return new AgentDispatchClient(
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

export function isDispatchAlreadyExistsError(error: unknown) {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    return (
      message.includes("already") ||
      message.includes("duplicate") ||
      message.includes("exists")
    );
  }

  if (typeof error !== "object" || error === null) {
    const message = String(error).toLowerCase();

    return (
      message.includes("already") ||
      message.includes("duplicate") ||
      message.includes("exists")
    );
  }

  const maybeError = error as {
    code?: unknown;
    message?: unknown;
    status?: unknown;
  };
  const message =
    typeof maybeError.message === "string"
      ? maybeError.message.toLowerCase()
      : "";

  return (
    maybeError.status === 409 ||
    maybeError.code === "already_exists" ||
    message.includes("already") ||
    message.includes("duplicate") ||
    message.includes("exists")
  );
}

export async function ensureGuestAgentDispatch(
  record: GuestSessionRecord,
  { force = false }: { force?: boolean } = {},
) {
  const dispatchClient = createAgentDispatchClient();

  if (!force) {
    const dispatches = await dispatchClient.listDispatch(record.roomName);
    const activeDispatch = dispatches.some((dispatch) => {
      const deletedAt = dispatch.state?.deletedAt;

      return (
        dispatch.agentName === record.agentName &&
        (deletedAt === undefined || deletedAt === 0n)
      );
    });

    if (activeDispatch) return;
  }

  try {
    await dispatchClient.createDispatch(record.roomName, record.agentName, {
      metadata: JSON.stringify({
        source: "guest_session",
        persona_id: record.personaId,
        user_id: record.userId,
        session_id: record.sessionId,
        expires_at: record.expiresAt,
      }),
    });
  } catch (error) {
    if (!isDispatchAlreadyExistsError(error)) {
      throw error;
    }
  }
}

export async function createGuestLiveKitRoom(record: GuestSessionRecord) {
  await createRoomServiceClient().createRoom({
    agents: [
      new RoomAgentDispatch({
        agentName: record.agentName,
        metadata: JSON.stringify({
          source: "guest_session",
          persona_id: record.personaId,
          user_id: record.userId,
          session_id: record.sessionId,
          expires_at: record.expiresAt,
        }),
      }),
    ],
    departureTimeout: LIVEKIT_GUEST_ROOM_DEPARTURE_TIMEOUT_SECONDS,
    emptyTimeout: LIVEKIT_GUEST_SESSION_SECONDS,
    maxParticipants: 4,
    name: record.roomName,
  });
}

export const createId = createLiveKitId;

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
    departureTimeout: LIVEKIT_GUEST_ROOM_DEPARTURE_TIMEOUT_SECONDS,
    emptyTimeout: LIVEKIT_GUEST_SESSION_SECONDS,
    maxParticipants: 4,
    name: record.roomName,
  });

  return {
    server_url: env.LIVEKIT_URL,
    participant_token: await token.toJwt(),
    session_id: record.sessionId,
    room_name: record.roomName,
    expires_at: record.expiresAt,
    duration_seconds: LIVEKIT_GUEST_SESSION_SECONDS,
    cleanup_enabled: LIVEKIT_GUEST_CLEANUP_ENABLED,
    signup_url: LIVEKIT_GUEST_SIGNUP_URL,
    agent_dispatch_mode: "connected_explicit_dispatch",
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
  LIVEKIT_GUEST_SESSION_SECONDS,
  LIVEKIT_GUEST_SIGNUP_URL,
};
