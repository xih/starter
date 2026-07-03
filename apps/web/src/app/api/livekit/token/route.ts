import { AccessToken, AgentDispatchClient } from "livekit-server-sdk";
import { NextResponse } from "next/server";
import { z } from "zod";

import { env } from "~/env";

export const runtime = "nodejs";

const DEFAULT_AGENT_NAME = "dennis-portfolio-agent";
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

const tokenRequestSchema = z.object({
  room_name: z.string().min(1).max(160).optional(),
  participant_identity: z.string().min(1).max(160).optional(),
  participant_name: z.string().min(1).max(160).optional(),
  participant_metadata: z.string().max(4096).optional(),
  participant_attributes: z.record(z.string(), z.string()).optional(),
  room_config: z
    .object({
      agents: z
        .array(
          z.object({
            agent_name: z.string().min(1).max(160).optional(),
            agentName: z.string().min(1).max(160).optional(),
            metadata: z.string().max(4096).optional(),
            deployment: z.string().min(1).max(160).optional(),
          }),
        )
        .optional(),
    })
    .passthrough()
    .optional(),
});

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`;
}

function getLiveKitApiUrl(livekitUrl: string) {
  return livekitUrl
    .replace(/^wss:\/\//, "https://")
    .replace(/^ws:\/\//, "http://");
}

function getAllowedOrigins() {
  const configuredOrigins = env.LIVEKIT_ALLOWED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configuredOrigins?.length) {
    return new Set(configuredOrigins);
  }

  return env.NODE_ENV === "production"
    ? new Set<string>()
    : DEV_ALLOWED_ORIGINS;
}

function isOriginAllowed(origin: string | null) {
  if (!origin) {
    return true;
  }

  return getAllowedOrigins().has(origin);
}

function getCorsHeaders(request: Request) {
  const origin = request.headers.get("origin");

  if (!origin || !isOriginAllowed(origin)) {
    return CORS_BASE_HEADERS;
  }

  return {
    ...CORS_BASE_HEADERS,
    "Access-Control-Allow-Origin": origin,
  };
}

function jsonWithCors(
  request: Request,
  body: unknown,
  init: ResponseInit = {},
) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...getCorsHeaders(request),
      ...init.headers,
    },
  });
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim();
}

function isAuthorizedForLiveKitToken(request: Request) {
  const expectedSecret = env.LIVEKIT_TOKEN_AUTH_SECRET;

  if (!expectedSecret) {
    return env.NODE_ENV !== "production";
  }

  const suppliedSecret =
    getBearerToken(request) ?? request.headers.get("x-livekit-token-auth");

  return suppliedSecret === expectedSecret;
}

export function OPTIONS(request: Request) {
  if (!isOriginAllowed(request.headers.get("origin"))) {
    return new NextResponse(null, {
      headers: getCorsHeaders(request),
      status: 403,
    });
  }

  return new NextResponse(null, {
    headers: getCorsHeaders(request),
    status: 204,
  });
}

export async function POST(request: Request) {
  if (!isOriginAllowed(request.headers.get("origin"))) {
    return jsonWithCors(
      request,
      { error: "Origin is not allowed to request LiveKit tokens." },
      { status: 403 },
    );
  }

  if (!isAuthorizedForLiveKitToken(request)) {
    return jsonWithCors(
      request,
      {
        error:
          env.NODE_ENV === "production" && !env.LIVEKIT_TOKEN_AUTH_SECRET
            ? "LiveKit token auth is not configured for production."
            : "Unauthorized LiveKit token request.",
      },
      { status: 401 },
    );
  }

  if (!env.LIVEKIT_URL || !env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET) {
    return jsonWithCors(
      request,
      {
        error:
          "LiveKit token endpoint is not configured. Set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET.",
      },
      { status: 500 },
    );
  }

  const json: unknown = await request.json().catch(() => null);
  const parsed = tokenRequestSchema.safeParse(json ?? {});

  if (!parsed.success) {
    return jsonWithCors(
      request,
      { error: "Invalid LiveKit token request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const body = parsed.data;
  const roomName = body.room_name ?? createId("agent_room");
  const participantIdentity =
    body.participant_identity ?? createId("anonymous_participant");
  const participantName = body.participant_name ?? "Guest";
  const requestedAgent = body.room_config?.agents?.[0];
  const agentName =
    requestedAgent?.agent_name ??
    requestedAgent?.agentName ??
    env.LIVEKIT_AGENT_NAME ??
    env.NEXT_PUBLIC_LIVEKIT_AGENT_NAME ??
    DEFAULT_AGENT_NAME;
  const token = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
    identity: participantIdentity,
    name: participantName,
    metadata: body.participant_metadata,
    attributes: body.participant_attributes,
    ttl: "10m",
  });

  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  });

  let agent_dispatch_id: string | undefined;

  if (agentName) {
    try {
      const dispatchClient = new AgentDispatchClient(
        getLiveKitApiUrl(env.LIVEKIT_URL),
        env.LIVEKIT_API_KEY,
        env.LIVEKIT_API_SECRET,
      );
      const dispatch = await dispatchClient.createDispatch(
        roomName,
        agentName,
        {
          metadata: requestedAgent?.metadata,
          deployment: requestedAgent?.deployment,
        },
      );
      agent_dispatch_id = dispatch.id;
    } catch (error) {
      return jsonWithCors(
        request,
        {
          error: "LiveKit agent dispatch failed",
          agent_name: agentName,
          details:
            error instanceof Error ? error.message : "Unknown dispatch error",
        },
        { status: 502 },
      );
    }
  }

  return jsonWithCors(
    request,
    {
      server_url: env.LIVEKIT_URL,
      participant_token: await token.toJwt(),
      agent_dispatch_id,
    },
    { status: 201 },
  );
}
