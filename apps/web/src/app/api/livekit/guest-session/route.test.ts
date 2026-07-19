import { beforeEach, describe, expect, it, vi } from "vitest";

import { SITE_ORIGIN } from "~/config/site";
import type * as guestSessionConfig from "~/server/livekit/guest-session-config";

type RedisRecord = Record<string, unknown>;
type PublishJSONPayload = {
  body?: { session_id?: string };
  delay?: number;
  url?: string;
};
type AgentDispatchRecord = {
  agentName: string;
  id?: string;
  room: string;
  state?: { deletedAt?: bigint };
};
type CreateDispatchOptions = {
  metadata?: string;
};

const DEV_TUNNEL_ORIGIN = "https://dev-tunnel.invalid";
const UNOWNED_ORIGIN = "https://attacker.invalid";

const redisStore = new Map<string, unknown>();
const redisSetMock = vi.fn(
  async (key: string, value: unknown, options?: RedisRecord) => {
    if (options?.nx && redisStore.has(key)) {
      return null;
    }

    redisStore.set(key, value);
    return "OK";
  },
);
const redisGetMock = vi.fn(async (key: string) => redisStore.get(key) ?? null);
const redisDelMock = vi.fn(async (...keys: string[]) => {
  let count = 0;
  for (const key of keys) {
    if (redisStore.delete(key)) count += 1;
  }
  return count;
});
const publishJSONMock = vi.fn(async (_payload: PublishJSONPayload) => ({
  messageId: "msg_guest_expire",
}));
const deleteRoomMock = vi.fn(async () => undefined);
const listDispatchMock = vi.fn(async (): Promise<AgentDispatchRecord[]> => []);
const createDispatchMock = vi.fn(
  async (
    _roomName: string,
    _agentName: string,
    _options?: CreateDispatchOptions,
  ): Promise<AgentDispatchRecord> => ({
    agentName: "dennis-portfolio-agent",
    id: "dispatch_1",
    room: "guest_guest_session_existing",
  }),
);
const cookieSetMock = vi.fn();
let cookieValue: string | undefined;

vi.mock("@upstash/redis", () => ({
  Redis: vi.fn(function RedisMock() {
    return {
      del: redisDelMock,
      get: redisGetMock,
      set: redisSetMock,
    };
  }),
}));

vi.mock("@upstash/qstash", () => ({
  Client: vi.fn(function QStashClientMock() {
    return {
      publishJSON: publishJSONMock,
    };
  }),
}));

vi.mock("@upstash/qstash/nextjs", () => ({
  verifySignatureAppRouter:
    (handler: (request: Request) => Response | Promise<Response>) =>
    (request: Request) =>
      request.headers.get("upstash-signature") === "valid"
        ? handler(request)
        : new Response("invalid signature", { status: 401 }),
}));

vi.mock("livekit-server-sdk", () => ({
  AccessToken: vi.fn(function AccessTokenMock() {
    return {
      addGrant: vi.fn(),
      roomConfig: undefined,
      toJwt: vi.fn(async () => "mock.jwt"),
    };
  }),
  AgentDispatchClient: vi.fn(function AgentDispatchClientMock() {
    return {
      createDispatch: createDispatchMock,
      listDispatch: listDispatchMock,
    };
  }),
  RoomServiceClient: vi.fn(function RoomServiceClientMock() {
    return {
      deleteRoom: deleteRoomMock,
    };
  }),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn((name: string) =>
      name === "lk_guest_device" && cookieValue
        ? { name, value: cookieValue }
        : undefined,
    ),
    set: cookieSetMock,
  })),
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
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.internal.invalid";
  process.env.UPSTASH_REDIS_REST_TOKEN = "redis-token";
  process.env.QSTASH_URL = "https://qstash-us-east-1.upstash.io";
  process.env.QSTASH_TOKEN = "qstash-token";
  process.env.QSTASH_CURRENT_SIGNING_KEY = "current-signing-key";
  process.env.QSTASH_NEXT_SIGNING_KEY = "next-signing-key";
  process.env.LIVEKIT_GUEST_RATE_LIMIT_SALT =
    "0123456789abcdefghijklmnopqrstuvwxyz";
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
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "QSTASH_URL",
    "QSTASH_TOKEN",
    "QSTASH_CURRENT_SIGNING_KEY",
    "QSTASH_NEXT_SIGNING_KEY",
    "LIVEKIT_GUEST_RATE_LIMIT_SALT",
    "VERCEL_ENV",
  ]) {
    delete process.env[key];
  }
}

function createRequest(
  path: string,
  {
    body = {},
    headers = {},
  }: { body?: unknown; headers?: Record<string, string> } = {},
) {
  return new Request(`${SITE_ORIGIN}${path}`, {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      Origin: SITE_ORIGIN,
      ...headers,
    },
    method: "POST",
  });
}

function createGetRequest(
  path: string,
  { headers = {} }: { headers?: Record<string, string> } = {},
) {
  return new Request(`${SITE_ORIGIN}${path}`, {
    headers,
    method: "GET",
  });
}

async function importGuestRoute() {
  vi.resetModules();
  return import("./route");
}

async function importExpireRoute() {
  vi.resetModules();
  return import("./expire/route");
}

describe("POST /api/livekit/guest-session", () => {
  beforeEach(() => {
    vi.doUnmock("~/server/livekit/guest-session-config");
    clearEnv();
    setEnv();
    redisStore.clear();
    cookieValue = undefined;
    vi.clearAllMocks();
    listDispatchMock.mockResolvedValue([]);
  });

  it("issues a guest token with server-owned room and agent values", async () => {
    const { POST } = await importGuestRoute();
    const response = await POST(
      createRequest("/api/livekit/guest-session", {
        body: {
          participant_identity: "attacker",
          room_config: { agents: [{ agentName: "attacker-agent" }] },
          room_name: "attacker-room",
        },
        headers: { "x-forwarded-for": "203.0.113.10" },
      }),
    );
    const payload = (await response.json()) as {
      agent_dispatch_names: string[];
      cleanup_enabled: boolean;
      duration_seconds: number;
      participant_token: string;
      room_name: string;
      session_id: string;
      signup_url: string;
    };

    expect(response.status).toBe(201);
    expect(payload.participant_token).toBe("mock.jwt");
    expect(payload.cleanup_enabled).toBe(false);
    expect(payload.duration_seconds).toBe(300);
    expect(payload.signup_url).toBe("/api/auth/signin");
    expect(payload.room_name).toBe(`guest_${payload.session_id}`);
    expect(payload.room_name).not.toBe("attacker-room");
    expect(payload.agent_dispatch_names).toEqual(["dennis-portfolio-agent"]);
    expect(response.headers.get("set-cookie")).toContain("lk_guest_device=");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=300");
    expect(response.headers.get("set-cookie")).toContain("SameSite=lax");
  });

  it("allows same-origin GET preflight requests without an Origin header", async () => {
    const { GET } = await importGuestRoute();
    const response = GET(createGetRequest("/api/livekit/guest-session"));
    const payload = (await response.json()) as { ok?: boolean };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
  });

  it("rejects GET preflight requests from disallowed origins", async () => {
    const { GET } = await importGuestRoute();
    const response = GET(
      createGetRequest("/api/livekit/guest-session", {
        headers: { Origin: UNOWNED_ORIGIN },
      }),
    );

    expect(response.status).toBe(403);
  });

  it("persists selected persona metadata for guest token dispatch", async () => {
    const { guestSessionKey } = await import("~/server/livekit/guest-session");
    const { POST } = await importGuestRoute();
    const response = await POST(
      createRequest("/api/livekit/guest-session", {
        body: {
          user_id: "attacker-user",
          room_config: {
            agents: [
              {
                agent_metadata: JSON.stringify({
                  persona_id: "portfolio-agent",
                  user_id: "local-qa",
                }),
              },
            ],
          },
        },
        headers: { "x-forwarded-for": "203.0.113.10" },
      }),
    );
    const payload = (await response.json()) as {
      session_id: string;
    };
    const record = redisStore.get(guestSessionKey(payload.session_id)) as
      | { personaId?: string; userId?: string }
      | undefined;

    expect(response.status).toBe(201);
    expect(record?.personaId).toBe("portfolio-agent");
    expect(record?.userId).toMatch(/^guest_/);
    expect(record?.userId).not.toBe("local-qa");
    expect(record?.userId).not.toBe("attacker-user");
  });

  it("accepts selected persona metadata from top-level fallback requests", async () => {
    const { guestSessionKey } = await import("~/server/livekit/guest-session");
    const { POST } = await importGuestRoute();
    const response = await POST(
      createRequest("/api/livekit/guest-session", {
        body: {
          persona_id: "portfolio-agent",
        },
        headers: { "x-forwarded-for": "203.0.113.10" },
      }),
    );
    const payload = (await response.json()) as {
      session_id: string;
    };
    const record = redisStore.get(guestSessionKey(payload.session_id)) as
      | { personaId?: string; userId?: string }
      | undefined;

    expect(response.status).toBe(201);
    expect(record?.personaId).toBe("portfolio-agent");
    expect(record?.userId).toMatch(/^guest_/);
  });

  it("accepts any existing persona for public guest sessions", async () => {
    cookieValue = "guest-device";
    const { guestSessionKey } = await import("~/server/livekit/guest-session");
    const { POST } = await importGuestRoute();
    const response = await POST(
      createRequest("/api/livekit/guest-session", {
        body: {
          persona_id: "wife",
        },
        headers: { "x-forwarded-for": "203.0.113.10" },
      }),
    );
    const payload = (await response.json()) as { session_id?: string };
    const record = payload.session_id
      ? (redisStore.get(guestSessionKey(payload.session_id)) as
          | { personaId?: string }
          | undefined)
      : undefined;

    expect(response.status).toBe(201);
    expect(record?.personaId).toBe("wife");
  });

  it("does not schedule the delayed expire callback when cleanup is disabled", async () => {
    const { POST } = await importGuestRoute();
    const response = await POST(
      createRequest("/api/livekit/guest-session", {
        headers: { "x-forwarded-for": "203.0.113.10" },
      }),
    );

    expect(response.status).toBe(201);
    expect(publishJSONMock).not.toHaveBeenCalled();
  });

  it("does not require QStash env for guest session tokens", async () => {
    delete process.env.QSTASH_URL;
    delete process.env.QSTASH_TOKEN;
    delete process.env.QSTASH_CURRENT_SIGNING_KEY;
    delete process.env.QSTASH_NEXT_SIGNING_KEY;

    const { POST } = await importGuestRoute();
    const response = await POST(
      createRequest("/api/livekit/guest-session", {
        headers: { "x-forwarded-for": "203.0.113.10" },
      }),
    );
    const payload = (await response.json()) as {
      cleanup_enabled: boolean;
      participant_token: string;
    };

    expect(response.status).toBe(201);
    expect(payload.participant_token).toBe("mock.jwt");
    expect(payload.cleanup_enabled).toBe(false);
    expect(publishJSONMock).not.toHaveBeenCalled();
  });

  it("schedules the delayed expire callback when cleanup is enabled", async () => {
    vi.doMock("~/server/livekit/guest-session-config", async () => {
      const actual = await vi.importActual<typeof guestSessionConfig>(
        "~/server/livekit/guest-session-config",
      );

      return {
        ...actual,
        LIVEKIT_GUEST_CLEANUP_ENABLED: true,
      };
    });
    const { POST } = await importGuestRoute();
    const response = await POST(
      createRequest("/api/livekit/guest-session", {
        headers: { "x-forwarded-for": "203.0.113.10" },
      }),
    );

    expect(response.status).toBe(201);
    const publishCall = publishJSONMock.mock.calls[0]?.[0];
    expect(publishCall?.body?.session_id).toMatch(/^guest_session_/);
    expect(publishCall?.delay).toBe(300);
    expect(publishCall?.url).toBe(
      `${SITE_ORIGIN}/api/livekit/guest-session/expire`,
    );
    vi.doUnmock("~/server/livekit/guest-session-config");
  });

  it("reuses an active guest session instead of failing duplicate token requests", async () => {
    cookieValue = "existing-device";
    const { guestActiveKey, guestSessionKey, hashGuestIdentifier } =
      await import("~/server/livekit/guest-session");
    const [deviceHash, ipHash] = await Promise.all([
      hashGuestIdentifier("existing-device"),
      hashGuestIdentifier("203.0.113.10"),
    ]);
    const sessionId = "guest_session_existing";
    const userId = `guest_${deviceHash.slice(0, 16)}`;
    redisStore.set(guestActiveKey(deviceHash, ipHash), sessionId);
    redisStore.set(guestSessionKey(sessionId), {
      agentName: "dennis-portfolio-agent",
      createdAt: new Date().toISOString(),
      deviceHash,
      expiresAt: new Date(Date.now() + 30_000).toISOString(),
      ipHash,
      personaId: "portfolio-agent",
      participantIdentity: "guest_guest_session_existing",
      roomName: "guest_guest_session_existing",
      sessionId,
      status: "active",
      userId,
    });
    const { POST } = await importGuestRoute();
    const response = await POST(
      createRequest("/api/livekit/guest-session", {
        headers: { "x-forwarded-for": "203.0.113.10" },
      }),
    );
    const payload = (await response.json()) as {
      participant_token: string;
      reused_session: boolean;
      room_name: string;
    };

    expect(response.status).toBe(200);
    expect(payload.participant_token).toBe("mock.jwt");
    expect(payload.reused_session).toBe(true);
    expect(payload.room_name).toBe("guest_guest_session_existing");
  });

  it("ignores duplicate dispatch races when reusing an active guest session", async () => {
    cookieValue = "existing-device";
    createDispatchMock.mockRejectedValueOnce(
      new Error("dispatch already exists"),
    );
    const { guestActiveKey, guestSessionKey, hashGuestIdentifier } =
      await import("~/server/livekit/guest-session");
    const [deviceHash, ipHash] = await Promise.all([
      hashGuestIdentifier("existing-device"),
      hashGuestIdentifier("203.0.113.10"),
    ]);
    const sessionId = "guest_session_existing";
    const userId = `guest_${deviceHash.slice(0, 16)}`;
    redisStore.set(guestActiveKey(deviceHash, ipHash), sessionId);
    redisStore.set(guestSessionKey(sessionId), {
      agentName: "dennis-portfolio-agent",
      createdAt: new Date().toISOString(),
      deviceHash,
      expiresAt: new Date(Date.now() + 30_000).toISOString(),
      ipHash,
      personaId: "portfolio-agent",
      participantIdentity: "guest_guest_session_existing",
      roomName: "guest_guest_session_existing",
      sessionId,
      status: "active",
      userId,
    });
    const { POST } = await importGuestRoute();
    const response = await POST(
      createRequest("/api/livekit/guest-session", {
        body: { ensure_dispatch: true },
        headers: { "x-forwarded-for": "203.0.113.10" },
      }),
    );

    expect(response.status).toBe(200);
    const createDispatchCall = createDispatchMock.mock.calls[0];
    expect(createDispatchCall?.[0]).toBe("guest_guest_session_existing");
    expect(createDispatchCall?.[1]).toBe("dennis-portfolio-agent");
    expect(createDispatchCall?.[2]?.metadata).toContain(sessionId);
  });

  it("does not hide not-found dispatch failures when reusing an active guest session", async () => {
    cookieValue = "existing-device";
    createDispatchMock.mockRejectedValueOnce({
      code: "not_found",
      message: "requested room not found",
      status: 404,
    });
    const { guestActiveKey, guestSessionKey, hashGuestIdentifier } =
      await import("~/server/livekit/guest-session");
    const [deviceHash, ipHash] = await Promise.all([
      hashGuestIdentifier("existing-device"),
      hashGuestIdentifier("203.0.113.10"),
    ]);
    const sessionId = "guest_session_existing";
    const userId = `guest_${deviceHash.slice(0, 16)}`;
    redisStore.set(guestActiveKey(deviceHash, ipHash), sessionId);
    redisStore.set(guestSessionKey(sessionId), {
      agentName: "dennis-portfolio-agent",
      createdAt: new Date().toISOString(),
      deviceHash,
      expiresAt: new Date(Date.now() + 30_000).toISOString(),
      ipHash,
      personaId: "portfolio-agent",
      participantIdentity: "guest_guest_session_existing",
      roomName: "guest_guest_session_existing",
      sessionId,
      status: "active",
      userId,
    });
    const { POST } = await importGuestRoute();
    const response = await POST(
      createRequest("/api/livekit/guest-session", {
        body: { ensure_dispatch: true },
        headers: { "x-forwarded-for": "203.0.113.10" },
      }),
    );
    const payload = (await response.json()) as { error?: string };

    expect(response.status).toBe(500);
    expect(payload.error).toContain("Failed to ensure LiveKit agent dispatch");
  });

  it("reuses an active guest session before enforcing completed-trial cooldown", async () => {
    vi.doMock("~/server/livekit/guest-session-config", async () => {
      const actual = await vi.importActual<typeof guestSessionConfig>(
        "~/server/livekit/guest-session-config",
      );

      return {
        ...actual,
        LIVEKIT_GUEST_COOLDOWN_ENABLED: true,
      };
    });
    vi.resetModules();
    cookieValue = "existing-device";
    const {
      guestActiveKey,
      guestDeviceCooldownKey,
      guestIpCooldownKey,
      guestSessionKey,
      hashGuestIdentifier,
    } = await import("~/server/livekit/guest-session");
    const [deviceHash, ipHash] = await Promise.all([
      hashGuestIdentifier("existing-device"),
      hashGuestIdentifier("203.0.113.10"),
    ]);
    const sessionId = "guest_session_existing";
    const userId = `guest_${deviceHash.slice(0, 16)}`;
    redisStore.set(guestActiveKey(deviceHash, ipHash), sessionId);
    redisStore.set(guestDeviceCooldownKey(deviceHash), sessionId);
    redisStore.set(guestIpCooldownKey(ipHash), sessionId);
    redisStore.set(guestSessionKey(sessionId), {
      agentName: "dennis-portfolio-agent",
      createdAt: new Date().toISOString(),
      deviceHash,
      expiresAt: new Date(Date.now() + 30_000).toISOString(),
      ipHash,
      personaId: "portfolio-agent",
      participantIdentity: "guest_guest_session_existing",
      roomName: "guest_guest_session_existing",
      sessionId,
      status: "active",
      userId,
    });
    const { POST } = await importGuestRoute();
    const response = await POST(
      createRequest("/api/livekit/guest-session", {
        headers: { "x-forwarded-for": "203.0.113.10" },
      }),
    );
    const payload = (await response.json()) as {
      reused_session: boolean;
      room_name: string;
    };

    expect(response.status).toBe(200);
    expect(payload.reused_session).toBe(true);
    expect(payload.room_name).toBe("guest_guest_session_existing");
    vi.doUnmock("~/server/livekit/guest-session-config");
  });

  it("replaces an active guest session without cooldown denial", async () => {
    vi.doMock("~/server/livekit/guest-session-config", async () => {
      const actual = await vi.importActual<typeof guestSessionConfig>(
        "~/server/livekit/guest-session-config",
      );

      return {
        ...actual,
        LIVEKIT_GUEST_COOLDOWN_ENABLED: true,
      };
    });
    vi.resetModules();
    cookieValue = "existing-device";
    const {
      guestActiveKey,
      guestDeviceCooldownKey,
      guestIpCooldownKey,
      guestSessionKey,
      hashGuestIdentifier,
    } = await import("~/server/livekit/guest-session");
    const [deviceHash, ipHash] = await Promise.all([
      hashGuestIdentifier("existing-device"),
      hashGuestIdentifier("203.0.113.10"),
    ]);
    const sessionId = "guest_session_existing";
    const userId = `guest_${deviceHash.slice(0, 16)}`;
    redisStore.set(guestActiveKey(deviceHash, ipHash), sessionId);
    redisStore.set(guestDeviceCooldownKey(deviceHash), sessionId);
    redisStore.set(guestIpCooldownKey(ipHash), sessionId);
    redisStore.set(guestSessionKey(sessionId), {
      agentName: "dennis-portfolio-agent",
      createdAt: new Date().toISOString(),
      deviceHash,
      expiresAt: new Date(Date.now() + 30_000).toISOString(),
      ipHash,
      personaId: "portfolio-agent",
      participantIdentity: "guest_guest_session_existing",
      roomName: "guest_guest_session_existing",
      sessionId,
      status: "active",
      userId,
    });
    const { POST } = await importGuestRoute();
    const response = await POST(
      createRequest("/api/livekit/guest-session", {
        body: { persona_id: "wife" },
        headers: { "x-forwarded-for": "203.0.113.10" },
      }),
    );
    const payload = (await response.json()) as {
      code?: string;
      session_id?: string;
    };
    const expiredRecord = redisStore.get(guestSessionKey(sessionId)) as
      | { status?: string }
      | undefined;

    expect(response.status).toBe(201);
    expect(payload.code).toBeUndefined();
    expect(payload.session_id).not.toBe(sessionId);
    expect(expiredRecord?.status).toBe("expired");
    vi.doUnmock("~/server/livekit/guest-session-config");
  });

  it("blocks stale active locks until the lock TTL expires", async () => {
    cookieValue = "existing-device";
    const { guestActiveKey, guestSessionKey, hashGuestIdentifier } =
      await import("~/server/livekit/guest-session");
    const [deviceHash, ipHash] = await Promise.all([
      hashGuestIdentifier("existing-device"),
      hashGuestIdentifier("203.0.113.10"),
    ]);
    const sessionId = "guest_session_stale";
    redisStore.set(guestActiveKey(deviceHash, ipHash), sessionId);
    redisStore.set(guestSessionKey(sessionId), {
      agentName: "dennis-portfolio-agent",
      createdAt: new Date().toISOString(),
      deviceHash,
      expiresAt: new Date(Date.now() - 1_000).toISOString(),
      ipHash,
      personaId: "portfolio-agent",
      participantIdentity: "guest_guest_session_stale",
      roomName: "guest_guest_session_stale",
      sessionId,
      status: "active",
      userId: "guest",
    });
    const { POST } = await importGuestRoute();
    const response = await POST(
      createRequest("/api/livekit/guest-session", {
        headers: { "x-forwarded-for": "203.0.113.10" },
      }),
    );
    const payload = (await response.json()) as {
      code: string;
    };

    expect(response.status).toBe(409);
    expect(payload.code).toBe("active_session_exists");
    expect(redisSetMock).toHaveBeenCalledWith(
      guestActiveKey(deviceHash, ipHash),
      expect.any(String),
      { ex: 300, nx: true },
    );
    expect(redisDelMock).not.toHaveBeenCalled();
  });

  it("rejects a used guest trial", async () => {
    vi.doMock("~/server/livekit/guest-session-config", async () => {
      const actual = await vi.importActual<typeof guestSessionConfig>(
        "~/server/livekit/guest-session-config",
      );

      return {
        ...actual,
        LIVEKIT_GUEST_COOLDOWN_ENABLED: true,
      };
    });
    vi.resetModules();
    cookieValue = "existing-device";
    const { guestDeviceCooldownKey, hashGuestIdentifier } =
      await import("~/server/livekit/guest-session");
    const deviceHash = await hashGuestIdentifier("existing-device");
    redisStore.set(guestDeviceCooldownKey(deviceHash), "guest_session_used");
    const { POST } = await importGuestRoute();
    const response = await POST(createRequest("/api/livekit/guest-session"));
    const payload = (await response.json()) as { code: string };

    expect(response.status).toBe(429);
    expect(payload.code).toBe("guest_trial_used");
    vi.doUnmock("~/server/livekit/guest-session-config");
  });

  it("rejects a disallowed origin", async () => {
    const { POST } = await importGuestRoute();
    const response = await POST(
      createRequest("/api/livekit/guest-session", {
        headers: { Origin: UNOWNED_ORIGIN },
      }),
    );

    expect(response.status).toBe(403);
  });

  it("rejects a missing origin in production", async () => {
    const { POST } = await importGuestRoute();
    const response = await POST(
      new Request(`${SITE_ORIGIN}/api/livekit/guest-session`, {
        body: JSON.stringify({}),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(403);
  });

  it("allows the canonical production portfolio origin", async () => {
    process.env.LIVEKIT_ALLOWED_ORIGINS = DEV_TUNNEL_ORIGIN;
    const { OPTIONS } = await importGuestRoute();
    const response = OPTIONS(
      new Request(`${SITE_ORIGIN}/api/livekit/guest-session`, {
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
    process.env.LIVEKIT_ALLOWED_ORIGINS = DEV_TUNNEL_ORIGIN;
    const { OPTIONS } = await importGuestRoute();
    const response = OPTIONS(
      new Request(`${DEV_TUNNEL_ORIGIN}/api/livekit/guest-session`, {
        headers: {
          Origin: DEV_TUNNEL_ORIGIN,
        },
        method: "OPTIONS",
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe(
      DEV_TUNNEL_ORIGIN,
    );
  });

  it("does not expand production defaults with configured origins", async () => {
    const { resolveLiveKitAllowedOrigins } =
      await import("~/server/livekit/route-policy");
    const defaultOrigins = resolveLiveKitAllowedOrigins({
      nodeEnv: "production",
    });
    const configuredOrigins = resolveLiveKitAllowedOrigins({
      configuredOrigins: UNOWNED_ORIGIN,
      nodeEnv: "production",
    });

    expect(defaultOrigins).toEqual(new Set([SITE_ORIGIN]));
    expect(configuredOrigins).toEqual(new Set([SITE_ORIGIN]));
    expect(configuredOrigins.has(UNOWNED_ORIGIN)).toBe(false);
  });

  it("uses configured origins for Vercel preview deployments", async () => {
    const { resolveLiveKitAllowedOrigins } =
      await import("~/server/livekit/route-policy");
    const configuredOrigins = resolveLiveKitAllowedOrigins({
      configuredOrigins: DEV_TUNNEL_ORIGIN,
      nodeEnv: "production",
      vercelEnv: "preview",
    });

    expect(configuredOrigins).toEqual(new Set([DEV_TUNNEL_ORIGIN]));
    expect(configuredOrigins.has(SITE_ORIGIN)).toBe(false);
  });

  it("uses configured origins for staging-like Vercel deployments", async () => {
    const { resolveLiveKitAllowedOrigins } =
      await import("~/server/livekit/route-policy");
    const configuredOrigins = resolveLiveKitAllowedOrigins({
      configuredOrigins: DEV_TUNNEL_ORIGIN,
      nodeEnv: "production",
      vercelEnv: "staging",
    });

    expect(configuredOrigins).toEqual(new Set([DEV_TUNNEL_ORIGIN]));
  });

  it("prefers trusted real-ip headers before x-forwarded-for", async () => {
    const { getClientIp } = await import("~/server/livekit/guest-session");
    const request = createRequest("/api/livekit/guest-session", {
      headers: {
        "x-forwarded-for": "198.51.100.99",
        "x-real-ip": "203.0.113.22",
      },
    });

    expect(getClientIp(request)).toBe("203.0.113.22");
  });

  it("does not use an unallowed forwarded host for QStash callbacks", async () => {
    process.env.LIVEKIT_ALLOWED_ORIGINS = `${SITE_ORIGIN},${DEV_TUNNEL_ORIGIN}`;
    const { getGuestExpireUrl } =
      await import("~/server/livekit/guest-session");
    const request = new Request(`${SITE_ORIGIN}/api/livekit/guest-session`, {
      headers: {
        "x-forwarded-host": "attacker.invalid",
        "x-forwarded-proto": "https",
      },
      method: "POST",
    });

    expect(getGuestExpireUrl(request)).toBe(
      `${SITE_ORIGIN}/api/livekit/guest-session/expire`,
    );
  });

  it("uses the API host instead of an allowed browser origin for QStash callbacks", async () => {
    vi.resetModules();
    process.env.LIVEKIT_ALLOWED_ORIGINS = `${SITE_ORIGIN},${DEV_TUNNEL_ORIGIN}`;
    const { getGuestExpireUrl } =
      await import("~/server/livekit/guest-session");
    const request = new Request(`${SITE_ORIGIN}/api/livekit/guest-session`, {
      headers: {
        Origin: DEV_TUNNEL_ORIGIN,
      },
      method: "POST",
    });

    expect(getGuestExpireUrl(request)).toBe(
      `${SITE_ORIGIN}/api/livekit/guest-session/expire`,
    );
  });
});

describe("POST /api/livekit/guest-session/expire", () => {
  beforeEach(() => {
    clearEnv();
    setEnv();
    redisStore.clear();
    vi.clearAllMocks();
  });

  it("rejects unsigned expiration requests", async () => {
    const { POST } = await importExpireRoute();
    const response = await POST(
      createRequest("/api/livekit/guest-session/expire", {
        body: { session_id: "guest_session_test" },
      }),
    );

    expect(response.status).toBe(401);
  });

  it("does not expose expiration when QStash signing keys are missing", async () => {
    delete process.env.QSTASH_CURRENT_SIGNING_KEY;
    delete process.env.QSTASH_NEXT_SIGNING_KEY;

    const { POST } = await importExpireRoute();
    const response = await POST(
      createRequest("/api/livekit/guest-session/expire", {
        body: { session_id: "guest_session_test" },
        headers: { "upstash-signature": "valid" },
      }),
    );
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(503);
    expect(payload.error).toContain("QStash signing keys");
  });

  it("deletes the room and releases the active lock for signed QStash requests", async () => {
    const { guestActiveKey, guestSessionKey } =
      await import("~/server/livekit/guest-session");
    const sessionId = "guest_session_test";
    redisStore.set(guestSessionKey(sessionId), {
      agentName: "dennis-portfolio-agent",
      createdAt: new Date().toISOString(),
      deviceHash: "device-hash",
      expiresAt: new Date().toISOString(),
      ipHash: "ip-hash",
      personaId: "portfolio-agent",
      participantIdentity: "guest_guest_session_test",
      roomName: "guest_guest_session_test",
      sessionId,
      status: "active",
      userId: "guest",
    });
    redisStore.set(guestActiveKey("device-hash", "ip-hash"), sessionId);

    const { POST } = await importExpireRoute();
    const response = await POST(
      createRequest("/api/livekit/guest-session/expire", {
        body: { session_id: sessionId },
        headers: { "upstash-signature": "valid" },
      }),
    );
    const payload = (await response.json()) as { status: string };

    expect(response.status).toBe(200);
    expect(payload.status).toBe("expired");
    expect(deleteRoomMock).toHaveBeenCalledWith("guest_guest_session_test");
    expect(redisDelMock).toHaveBeenCalledWith(
      guestActiveKey("device-hash", "ip-hash"),
    );
  });

  it("treats an already-missing LiveKit room as expired", async () => {
    deleteRoomMock.mockRejectedValueOnce({
      code: "not_found",
      message: "Not Found: requested room does not exist",
      status: 404,
    });
    const { guestActiveKey, guestSessionKey } =
      await import("~/server/livekit/guest-session");
    const sessionId = "guest_session_missing_room";
    redisStore.set(guestSessionKey(sessionId), {
      agentName: "dennis-portfolio-agent",
      createdAt: new Date().toISOString(),
      deviceHash: "device-hash",
      expiresAt: new Date().toISOString(),
      ipHash: "ip-hash",
      personaId: "portfolio-agent",
      participantIdentity: "guest_guest_session_missing_room",
      roomName: "guest_guest_session_missing_room",
      sessionId,
      status: "active",
      userId: "guest",
    });
    redisStore.set(guestActiveKey("device-hash", "ip-hash"), sessionId);

    const { POST } = await importExpireRoute();
    const response = await POST(
      createRequest("/api/livekit/guest-session/expire", {
        body: { session_id: sessionId },
        headers: { "upstash-signature": "valid" },
      }),
    );
    const payload = (await response.json()) as { status: string };

    expect(response.status).toBe(200);
    expect(payload.status).toBe("expired");
    expect(redisDelMock).toHaveBeenCalledWith(
      guestActiveKey("device-hash", "ip-hash"),
    );
  });

  it("does not release a newer active lock for an older expiration callback", async () => {
    const { guestActiveKey, guestSessionKey } =
      await import("~/server/livekit/guest-session");
    const sessionId = "guest_session_old";
    const activeKey = guestActiveKey("device-hash", "ip-hash");
    redisStore.set(guestSessionKey(sessionId), {
      agentName: "dennis-portfolio-agent",
      createdAt: new Date().toISOString(),
      deviceHash: "device-hash",
      expiresAt: new Date().toISOString(),
      ipHash: "ip-hash",
      personaId: "portfolio-agent",
      participantIdentity: "guest_guest_session_old",
      roomName: "guest_guest_session_old",
      sessionId,
      status: "active",
      userId: "guest",
    });
    redisStore.set(activeKey, "guest_session_new");

    const { POST } = await importExpireRoute();
    const response = await POST(
      createRequest("/api/livekit/guest-session/expire", {
        body: { session_id: sessionId },
        headers: { "upstash-signature": "valid" },
      }),
    );
    const payload = (await response.json()) as { status: string };

    expect(response.status).toBe(200);
    expect(payload.status).toBe("expired");
    expect(redisDelMock).not.toHaveBeenCalledWith(activeKey);
    expect(redisStore.get(activeKey)).toBe("guest_session_new");
  });
});
