import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as guestSessionConfig from "~/server/livekit/guest-session-config";

type RedisRecord = Record<string, unknown>;

const redisStore = new Map<string, unknown>();
const redisSetMock = vi.fn(
  async (key: string, value: unknown, _options?: RedisRecord) => {
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
let claimResult: "active" | "claimed" | "device_cooldown" | "ip_cooldown" =
  "claimed";
const redisEvalMock = vi.fn(async () => claimResult);
const publishJSONMock = vi.fn(async () => ({ messageId: "msg_guest_expire" }));
const deleteRoomMock = vi.fn(async () => undefined);
const cookieSetMock = vi.fn();
let cookieValue: string | undefined;

vi.mock("@upstash/redis", () => ({
  Redis: vi.fn(function RedisMock() {
    return {
      createScript: vi.fn(() => ({
        eval: redisEvalMock,
      })),
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
  process.env.LIVEKIT_URL = "wss://voice.example.livekit.cloud";
  process.env.LIVEKIT_API_KEY = "livekit-key";
  process.env.LIVEKIT_API_SECRET = "livekit-secret";
  process.env.LIVEKIT_AGENT_NAME = "dennis-portfolio-agent";
  process.env.LIVEKIT_ALLOWED_ORIGINS = "https://example.com";
  process.env.LIVEKIT_TOKEN_AUTH_SECRET = "admin-secret";
  process.env.NEXT_PUBLIC_LIVEKIT_AGENT_NAME = "dennis-portfolio-agent";
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.com";
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
  return new Request(`https://example.com${path}`, {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      Origin: "https://example.com",
      ...headers,
    },
    method: "POST",
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
    claimResult = "claimed";
    cookieValue = undefined;
    vi.clearAllMocks();
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
    expect(payload.duration_seconds).toBe(30);
    expect(payload.signup_url).toBe("/api/auth/signin");
    expect(payload.room_name).toBe(`guest_${payload.session_id}`);
    expect(payload.room_name).not.toBe("attacker-room");
    expect(payload.agent_dispatch_names).toEqual(["dennis-portfolio-agent"]);
    expect(publishJSONMock).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie")).toContain("lk_guest_device=");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=60");
    expect(response.headers.get("set-cookie")).toContain("SameSite=lax");
  });

  it("does not schedule the delayed expire callback when cleanup is disabled", async () => {
    process.env.LIVEKIT_ALLOWED_ORIGINS =
      "https://example.com,https://dev-tunnel.ngrok-free.app";
    const { POST } = await importGuestRoute();
    const response = await POST(
      new Request("http://localhost:3010/api/livekit/guest-session", {
        body: JSON.stringify({}),
        headers: {
          "Content-Type": "application/json",
          Origin: "https://dev-tunnel.ngrok-free.app",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(201);
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
    process.env.LIVEKIT_ALLOWED_ORIGINS =
      "https://example.com,https://dev-tunnel.ngrok-free.app";
    const { POST } = await importGuestRoute();
    const response = await POST(
      new Request("http://localhost:3010/api/livekit/guest-session", {
        body: JSON.stringify({}),
        headers: {
          "Content-Type": "application/json",
          Origin: "https://dev-tunnel.ngrok-free.app",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(201);
    expect(publishJSONMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://dev-tunnel.ngrok-free.app/api/livekit/guest-session/expire",
      }),
    );
    vi.doUnmock("~/server/livekit/guest-session-config");
  });

  it("reuses an active guest session instead of failing duplicate token requests", async () => {
    claimResult = "active";
    cookieValue = "existing-device";
    const { guestActiveKey, guestSessionKey, hashGuestIdentifier } =
      await import("~/server/livekit/guest-session");
    const [deviceHash, ipHash] = await Promise.all([
      hashGuestIdentifier("existing-device"),
      hashGuestIdentifier("203.0.113.10"),
    ]);
    const sessionId = "guest_session_existing";
    redisStore.set(guestActiveKey(deviceHash, ipHash), sessionId);
    redisStore.set(guestSessionKey(sessionId), {
      agentName: "dennis-portfolio-agent",
      createdAt: new Date().toISOString(),
      deviceHash,
      expiresAt: new Date(Date.now() + 30_000).toISOString(),
      ipHash,
      participantIdentity: "guest_guest_session_existing",
      roomName: "guest_guest_session_existing",
      sessionId,
      status: "active",
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
    expect(publishJSONMock).not.toHaveBeenCalled();
  });

  it("clears a stale active lock and creates a new guest session", async () => {
    claimResult = "active";
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
      participantIdentity: "guest_guest_session_stale",
      roomName: "guest_guest_session_stale",
      sessionId,
      status: "active",
    });
    const { POST } = await importGuestRoute();
    const response = await POST(
      createRequest("/api/livekit/guest-session", {
        headers: { "x-forwarded-for": "203.0.113.10" },
      }),
    );
    const payload = (await response.json()) as {
      participant_token: string;
      room_name: string;
    };

    expect(response.status).toBe(201);
    expect(payload.participant_token).toBe("mock.jwt");
    expect(payload.room_name).not.toBe("guest_guest_session_stale");
    expect(redisDelMock).toHaveBeenCalledWith(
      guestActiveKey(deviceHash, ipHash),
    );
    expect(publishJSONMock).not.toHaveBeenCalled();
  });

  it("rejects a used guest trial", async () => {
    claimResult = "device_cooldown";
    const { POST } = await importGuestRoute();
    const response = await POST(createRequest("/api/livekit/guest-session"));
    const payload = (await response.json()) as { code: string };

    expect(response.status).toBe(429);
    expect(payload.code).toBe("guest_trial_used");
  });

  it("rejects a disallowed origin", async () => {
    const { POST } = await importGuestRoute();
    const response = await POST(
      createRequest("/api/livekit/guest-session", {
        headers: { Origin: "https://evil.example" },
      }),
    );

    expect(response.status).toBe(403);
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
      participantIdentity: "guest_guest_session_test",
      roomName: "guest_guest_session_test",
      sessionId,
      status: "active",
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
      participantIdentity: "guest_guest_session_missing_room",
      roomName: "guest_guest_session_missing_room",
      sessionId,
      status: "active",
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
});
