import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("livekit-server-sdk", () => ({
  AccessToken: vi.fn(function AccessTokenMock() {
    return {
      addGrant: vi.fn(),
      roomConfig: undefined,
      toJwt: vi.fn(async () => "admin.jwt"),
    };
  }),
}));

function setEnv() {
  vi.stubEnv("NODE_ENV", "production");
  process.env.LIVEKIT_URL = "wss://voice.example.livekit.cloud";
  process.env.LIVEKIT_API_KEY = "livekit-key";
  process.env.LIVEKIT_API_SECRET = "livekit-secret";
  process.env.LIVEKIT_AGENT_NAME = "dennis-portfolio-agent";
  process.env.LIVEKIT_ALLOWED_ORIGINS = "https://example.com";
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
  ]) {
    delete process.env[key];
  }
}

function createRequest(headers: Record<string, string> = {}) {
  return new Request("https://example.com/api/livekit/token", {
    body: JSON.stringify({ dispatch_agent: false }),
    headers: {
      "Content-Type": "application/json",
      Origin: "https://example.com",
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
});
