import { AccessToken, AgentDispatchClient } from "livekit-server-sdk";
import { NextResponse } from "next/server";
import { z } from "zod";

import { env } from "~/env";

export const runtime = "nodejs";

const DEFAULT_AGENT_NAME = "dennis-portfolio-agent";
const corsHeaders = {
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "http://localhost:6006",
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

export function OPTIONS() {
  return new NextResponse(null, {
    headers: corsHeaders,
    status: 204,
  });
}

export async function POST(request: Request) {
  if (!env.LIVEKIT_URL || !env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET) {
    return NextResponse.json(
      {
        error:
          "LiveKit token endpoint is not configured. Set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET.",
      },
      { headers: corsHeaders, status: 500 },
    );
  }

  const json: unknown = await request.json().catch(() => null);
  const parsed = tokenRequestSchema.safeParse(json ?? {});

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid LiveKit token request", issues: parsed.error.issues },
      { headers: corsHeaders, status: 400 },
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
      return NextResponse.json(
        {
          error: "LiveKit agent dispatch failed",
          agent_name: agentName,
          details:
            error instanceof Error ? error.message : "Unknown dispatch error",
        },
        { headers: corsHeaders, status: 502 },
      );
    }
  }

  return NextResponse.json(
    {
      server_url: env.LIVEKIT_URL,
      participant_token: await token.toJwt(),
      agent_dispatch_id,
    },
    { headers: corsHeaders, status: 201 },
  );
}
