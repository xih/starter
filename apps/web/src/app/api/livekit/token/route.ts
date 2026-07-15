import { RoomAgentDispatch, RoomConfiguration } from "@livekit/protocol";
import { AccessToken } from "livekit-server-sdk";
import { NextResponse } from "next/server";
import { z } from "zod";

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

const nodeEnvSchema = z.enum(["development", "test", "production"]);

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
};
const parsedEnv = liveKitEnvSchema.safeParse(rawEnv);
const env = parsedEnv.success ? parsedEnv.data : rawEnv;
const envIssues = parsedEnv.success ? [] : parsedEnv.error.issues;

const roomAgentSchema = z.object({
  agent_name: z.string().min(1).max(160).optional(),
  agentName: z.string().min(1).max(160).optional(),
  agent_metadata: z.string().max(4096).optional(),
  metadata: z.string().max(4096).optional(),
  deployment: z.string().min(1).max(160).optional(),
});

const roomConfigSchema = z
  .object({
    agents: z.array(roomAgentSchema).optional(),
  })
  .strict();

const tokenRequestSchema = z.object({
  dispatch_agent: z.boolean().optional(),
  room_name: z.string().min(1).max(160).optional(),
  participant_identity: z.string().min(1).max(160).optional(),
  participant_name: z.string().min(1).max(160).optional(),
  participant_metadata: z.string().max(4096).optional(),
  participant_attributes: z.record(z.string(), z.string()).optional(),
  room_config: roomConfigSchema.optional(),
});

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`;
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

  if (env.NODE_ENV !== "production" && isLocalDevelopmentOrigin(origin)) {
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

  if (envIssues.length > 0) {
    return jsonWithCors(
      request,
      {
        error: "LiveKit token endpoint has invalid environment configuration.",
        issues: envIssues,
      },
      { status: 500 },
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
  const requestedAgents = body.room_config?.agents;
  const agentsToDispatch =
    body.dispatch_agent === false
      ? []
      : requestedAgents && requestedAgents.length > 0
        ? requestedAgents
        : [
            {
              agentName:
                env.LIVEKIT_AGENT_NAME ??
                env.NEXT_PUBLIC_LIVEKIT_AGENT_NAME ??
                DEFAULT_AGENT_NAME,
            },
          ];
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

  if (agentsToDispatch.length > 0) {
    token.roomConfig = new RoomConfiguration({
      name: roomName,
      agents: agentsToDispatch.map((requestedAgent) => {
        const agentName =
          requestedAgent.agent_name ??
          requestedAgent.agentName ??
          env.LIVEKIT_AGENT_NAME ??
          env.NEXT_PUBLIC_LIVEKIT_AGENT_NAME ??
          DEFAULT_AGENT_NAME;

        return new RoomAgentDispatch({
          agentName,
          metadata: requestedAgent.agent_metadata ?? requestedAgent.metadata,
          deployment: requestedAgent.deployment,
        });
      }),
    });
  }

  return jsonWithCors(
    request,
    {
      server_url: env.LIVEKIT_URL,
      participant_token: await token.toJwt(),
      agent_dispatch_mode:
        agentsToDispatch.length > 0 ? "token_room_config" : "disabled",
      agent_dispatch_names: agentsToDispatch.map(
        (requestedAgent) =>
          requestedAgent.agent_name ??
          requestedAgent.agentName ??
          env.LIVEKIT_AGENT_NAME ??
          env.NEXT_PUBLIC_LIVEKIT_AGENT_NAME ??
          DEFAULT_AGENT_NAME,
      ),
    },
    { status: 201 },
  );
}
