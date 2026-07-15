import { beforeEach, describe, expect, it, vi } from "vitest";

import { SITE_ORIGIN } from "~/config/site";

const MISCONFIGURED_PRODUCTION_ORIGIN = "https://preview.invalid";
const accessTokenRecords: Array<{
  addGrant: ReturnType<typeof vi.fn>;
  roomConfig?: unknown;
  toJwt: ReturnType<typeof vi.fn>;
}> = [];

vi.mock("livekit-server-sdk", () => ({
  AccessToken: vi.fn(function AccessTokenMock() {
    const record = {
      addGrant: vi.fn(),
      roomConfig: undefined,
      toJwt: vi.fn(async () => "admin.jwt"),
    };

    accessTokenRecords.push(record);

    return record;
  }),
}));

function setEnv() {
  vi.stubEnv("NODE_ENV", "production");
  process.env.LIVEKIT_URL = "wss://voice.invalid";
  process.env.LIVEKIT_API_KEY = "livekit-key";
  process.env.LIVEKIT_API_SECRET = "livekit-secret";
  process.env.LIVEKIT_AGENT_NAME = "dennis-portfolio-agent";
  process.env.LIVEKIT_ALLOWED_ORIGINS = SITE_ORIGIN;
  process.env.LIVEKIT_TOKEN_AUTH_SECRET = "admin-secret";
  process.env.NEXT_PUBLIC_LIVEKIT_AGENT_NAME = "dennis-portfolio-agent";
}

function clearEnv() {
  for (const key of [
    "LIVEKIT_URL",
    "LIVEKIT_API_KEY",
    "LIVEKIT_API_SECRET",
    "LIVEKIT_AGENT_NAME",
    "LIVEKIT_ALLOWED_ORIGINS",
    "LIVEKIT_TOKEN_AUTH_SECRET",
    "NEXT_PUBLIC_LIVEKIT_AGENT_NAME",
    "VERCEL_ENV",
  ]) {
    delete process.env[key];
  }
}

function createRequest(headers: Record<string, string> = {}) {
  return new Request(`${SITE_ORIGIN}/api/livekit/token`, {
    body: JSON.stringify({ dispatch_agent: false }),
    headers: {
      "Content-Type": "application/json",
      Origin: SITE_ORIGIN,
      ...headers,
    },
    method: "POST",
  });
}

function createDispatchRequest(
  body: unknown,
  headers: Record<string, string> = {},
) {
  return new Request(`${SITE_ORIGIN}/api/livekit/token`, {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      Origin: SITE_ORIGIN,
      ...headers,
    },
    method: "POST",
  });
}

async function importRoute() {
  vi.resetModules();
  return import("./route");
}

describe("POST /api/livekit/token", () => {
  beforeEach(() => {
    clearEnv();
    setEnv();
    vi.clearAllMocks();
    accessTokenRecords.length = 0;
  });

  it("rejects missing QA/admin auth in production", async () => {
    const { POST } = await importRoute();
    const response = await POST(createRequest());
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(401);
    expect(payload.error).toBe("Unauthorized LiveKit token request.");
  });

  it("issues a token with valid QA/admin auth", async () => {
    const { POST } = await importRoute();
    const response = await POST(
      createRequest({ Authorization: "Bearer admin-secret" }),
    );
    const payload = (await response.json()) as {
      agent_dispatch_mode: string;
      participant_token: string;
    };

    expect(response.status).toBe(201);
    expect(payload.participant_token).toBe("admin.jwt");
    expect(payload.agent_dispatch_mode).toBe("disabled");
  });

  it("rejects an unknown persona", async () => {
    const { POST } = await importRoute();
    const response = await POST(
      createDispatchRequest(
        { persona_id: "missing-persona" },
        { Authorization: "Bearer admin-secret" },
      ),
    );
    const payload = (await response.json()) as { code: string };

    expect(response.status).toBe(400);
    expect(payload.code).toBe("unknown_persona");
  });

  it("serializes compact persona metadata for dispatched agents", async () => {
    const { POST } = await importRoute();
    const response = await POST(
      createDispatchRequest(
        {
          persona_id: "wife",
          room_config: {
            agents: [{ agentName: "dennis-portfolio-agent" }],
          },
          user_id: "local-qa",
        },
        { Authorization: "Bearer admin-secret" },
      ),
    );
    const payload = (await response.json()) as {
      agent_dispatch_names: string[];
    };
    const roomConfig = accessTokenRecords[0]?.roomConfig as {
      agents?: Array<{ metadata?: string }>;
    };
    const metadata = JSON.parse(roomConfig.agents?.[0]?.metadata ?? "{}") as {
      persona_id?: string;
      user_id?: string;
    };

    expect(response.status).toBe(201);
    expect(payload.agent_dispatch_names).toEqual(["dennis-portfolio-agent"]);
    expect(metadata).toMatchObject({
      persona_id: "wife",
      user_id: "local-qa",
    });
  });

  it("merges persona metadata into custom agent metadata", async () => {
    const { POST } = await importRoute();
    const response = await POST(
      createDispatchRequest(
        {
          persona_id: "wife",
          room_config: {
            agents: [
              {
                agentName: "dennis-portfolio-agent",
                metadata: JSON.stringify({ source: "qa" }),
              },
            ],
          },
          session_id: "session-123",
          user_id: "local-qa",
        },
        { Authorization: "Bearer admin-secret" },
      ),
    );
    const roomConfig = accessTokenRecords[0]?.roomConfig as {
      agents?: Array<{ metadata?: string }>;
    };
    const metadata = JSON.parse(roomConfig.agents?.[0]?.metadata ?? "{}") as {
      persona_id?: string;
      session_id?: string;
      source?: string;
      user_id?: string;
    };

    expect(response.status).toBe(201);
    expect(metadata).toMatchObject({
      persona_id: "wife",
      session_id: "session-123",
      source: "qa",
      user_id: "local-qa",
    });
  });

  it("allows the canonical production portfolio origin", async () => {
    process.env.LIVEKIT_ALLOWED_ORIGINS = MISCONFIGURED_PRODUCTION_ORIGIN;
    const { OPTIONS } = await importRoute();
    const response = OPTIONS(
      new Request(`${SITE_ORIGIN}/api/livekit/token`, {
        headers: {
          Origin: SITE_ORIGIN,
        },
        method: "OPTIONS",
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe(
      SITE_ORIGIN,
    );
  });

  it("allows configured origins on Vercel preview deployments", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.LIVEKIT_ALLOWED_ORIGINS = MISCONFIGURED_PRODUCTION_ORIGIN;
    const { OPTIONS } = await importRoute();
    const response = OPTIONS(
      new Request(`${MISCONFIGURED_PRODUCTION_ORIGIN}/api/livekit/token`, {
        headers: {
          Origin: MISCONFIGURED_PRODUCTION_ORIGIN,
        },
        method: "OPTIONS",
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe(
      MISCONFIGURED_PRODUCTION_ORIGIN,
    );
  });
});
