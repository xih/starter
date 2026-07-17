import { RoomAgentDispatch, RoomConfiguration } from "@livekit/protocol";
import { AccessToken } from "livekit-server-sdk";
import { NextResponse } from "next/server";
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
} from "~/server/livekit/route-policy";
import { DEFAULT_PERSONA_ID, getPersona } from "~/server/personas";

export const runtime = "nodejs";

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
  persona_id: z.string().min(1).max(80).optional(),
  user_id: z.string().min(1).max(160).optional(),
  session_id: z.string().min(1).max(160).optional(),
  room_name: z.string().min(1).max(160).optional(),
  participant_identity: z.string().min(1).max(160).optional(),
  participant_name: z.string().min(1).max(160).optional(),
  participant_metadata: z.string().max(4096).optional(),
  participant_attributes: z.record(z.string(), z.string()).optional(),
  room_config: roomConfigSchema.optional(),
});

function isOriginAllowed(origin: string | null) {
  return isLiveKitOriginAllowed({
    configuredOrigins: env.LIVEKIT_ALLOWED_ORIGINS,
    nodeEnv: env.NODE_ENV,
    origin,
  });
}

function getCorsHeaders(request: Request) {
  return getLiveKitCorsHeaders({
    allowMethods: "POST, OPTIONS",
    configuredOrigins: env.LIVEKIT_ALLOWED_ORIGINS,
    nodeEnv: env.NODE_ENV,
    request,
  });
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

function isAuthorizedForLiveKitToken(request: Request) {
  return isLiveKitTokenAuthorized({
    nodeEnv: env.NODE_ENV,
    request,
    tokenAuthSecret: env.LIVEKIT_TOKEN_AUTH_SECRET,
  });
}

function parseAgentMetadata(metadata: string | undefined) {
  if (!metadata) {
    return null;
  }

  const parsed = (() => {
    try {
      return JSON.parse(metadata) as unknown;
    } catch {
      return null;
    }
  })();

  return parsed && typeof parsed === "object"
    ? (parsed as Record<string, unknown>)
    : null;
}

function createDispatchMetadata({
  existingMetadata,
  personaId,
  sessionId,
  userId,
}: {
  existingMetadata?: string;
  personaId: string;
  sessionId: string;
  userId?: string;
}) {
  const parsed = parseAgentMetadata(existingMetadata);
  const metadata: Record<string, unknown> = {
    ...(parsed ?? {}),
    persona_id: personaId,
    session_id: sessionId,
  };

  if (userId) {
    metadata.user_id = userId;
  }

  return JSON.stringify(metadata);
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
  const requestedMetadata = body.room_config?.agents?.[0];
  const parsedAgentMetadata = parseAgentMetadata(
    requestedMetadata?.agent_metadata ?? requestedMetadata?.metadata,
  );
  const metadataPersonaId =
    typeof parsedAgentMetadata?.persona_id === "string"
      ? parsedAgentMetadata.persona_id
      : undefined;
  const personaId = body.persona_id ?? metadataPersonaId ?? DEFAULT_PERSONA_ID;

  const roomName = body.room_name ?? createLiveKitId("agent_room");
  const participantIdentity =
    body.participant_identity ?? createLiveKitId("anonymous_participant");
  const participantName = body.participant_name ?? "Guest";
  const requestedAgents = body.room_config?.agents;
  const resolvedAgentName = getResolvedLiveKitAgentName({
    liveKitAgentName: env.LIVEKIT_AGENT_NAME,
    nextPublicAgentName: env.NEXT_PUBLIC_LIVEKIT_AGENT_NAME,
  });
  const agentsToDispatch =
    body.dispatch_agent === false
      ? []
      : requestedAgents && requestedAgents.length > 0
        ? requestedAgents
        : [{ agentName: resolvedAgentName }];
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
    const persona = await getPersona(personaId);

    if (!persona) {
      return jsonWithCors(
        request,
        { error: "Unknown persona requested.", code: "unknown_persona" },
        { status: 400 },
      );
    }

    token.roomConfig = new RoomConfiguration({
      name: roomName,
      agents: agentsToDispatch.map((requestedAgent) => {
        const agentName =
          requestedAgent.agent_name ??
          requestedAgent.agentName ??
          resolvedAgentName;
        const existingMetadata =
          requestedAgent.agent_metadata ?? requestedAgent.metadata;

        return new RoomAgentDispatch({
          agentName,
          metadata: createDispatchMetadata({
            existingMetadata,
            personaId: persona.id,
            sessionId: body.session_id ?? roomName,
            userId: body.user_id,
          }),
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
          resolvedAgentName,
      ),
    },
    { status: 201 },
  );
}
