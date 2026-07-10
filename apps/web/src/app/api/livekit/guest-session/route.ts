import { NextResponse } from "next/server";

import {
  createId,
  createQStashClient,
  createRedis,
  getClientIp,
  getCorsHeaders,
  getGuestExpireUrl,
  getOrCreateGuestDeviceId,
  getResolvedAgentName,
  guestActiveKey,
  guestDeviceCooldownKey,
  guestIpCooldownKey,
  guestSessionKey,
  hashGuestIdentifier,
  isOriginAllowed,
  issueGuestLiveKitToken,
  type GuestSessionRecord,
  LIVEKIT_GUEST_ACTIVE_TTL_SECONDS,
  LIVEKIT_GUEST_CLEANUP_ENABLED,
  LIVEKIT_GUEST_COOKIE_NAME,
  LIVEKIT_GUEST_COOLDOWN_ENABLED,
  LIVEKIT_GUEST_COOLDOWN_SECONDS,
  LIVEKIT_GUEST_SESSION_SECONDS,
  LIVEKIT_GUEST_SIGNUP_URL,
} from "~/server/livekit/guest-session";
import { assertGuestSessionEnv } from "~/server/livekit/guest-session";

export const runtime = "nodejs";

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
      { error: "Origin is not allowed to request LiveKit guest sessions." },
      { status: 403 },
    );
  }

  const env = assertGuestSessionEnv();

  if (!env.ok) {
    return jsonWithCors(
      request,
      {
        error: env.error,
        issues: env.issues,
      },
      { status: 500 },
    );
  }

  const redis = createRedis();
  const sessionId = createId("guest_session");
  const roomName = `guest_${sessionId}`;
  const participantIdentity = `guest_${sessionId}`;
  const agentName = getResolvedAgentName();
  const expiresAt = new Date(
    Date.now() + LIVEKIT_GUEST_SESSION_SECONDS * 1000,
  ).toISOString();
  const { deviceId, isNew } = await getOrCreateGuestDeviceId();
  const [deviceHash, ipHash] = await Promise.all([
    hashGuestIdentifier(deviceId),
    hashGuestIdentifier(getClientIp(request)),
  ]);
  const activeKey = guestActiveKey(deviceHash, ipHash);

  const activeSessionId = await redis.get<string>(activeKey);
  const activeRecord = activeSessionId
    ? await redis.get<GuestSessionRecord>(guestSessionKey(activeSessionId))
    : null;

  if (
    activeRecord?.status === "active" &&
    Date.parse(activeRecord.expiresAt) > Date.now()
  ) {
    const payload = await issueGuestLiveKitToken(activeRecord);

    return jsonWithCors(
      request,
      {
        ...payload,
        reused_session: true,
      },
      { status: 200 },
    );
  }

  if (LIVEKIT_GUEST_COOLDOWN_ENABLED) {
    const [deviceCooldown, ipCooldown] = await Promise.all([
      redis.get(guestDeviceCooldownKey(deviceHash)),
      redis.get(guestIpCooldownKey(ipHash)),
    ]);

    if (deviceCooldown || ipCooldown) {
      return jsonWithCors(
        request,
        {
          error: "Guest LiveKit trial has already been used.",
          code: "guest_trial_used",
          signup_url: LIVEKIT_GUEST_SIGNUP_URL,
        },
        { status: 429 },
      );
    }
  }

  const claimResult = activeSessionId
    ? await redis.set(activeKey, sessionId, {
        ex: LIVEKIT_GUEST_ACTIVE_TTL_SECONDS,
      })
    : await redis.set(activeKey, sessionId, {
        ex: LIVEKIT_GUEST_ACTIVE_TTL_SECONDS,
        nx: true,
      });

  if (!claimResult) {
    const concurrentSessionId = await redis.get<string>(activeKey);
    const concurrentRecord = concurrentSessionId
      ? await redis.get<GuestSessionRecord>(
          guestSessionKey(concurrentSessionId),
        )
      : null;

    if (
      concurrentRecord?.status === "active" &&
      Date.parse(concurrentRecord.expiresAt) > Date.now()
    ) {
      const payload = await issueGuestLiveKitToken(concurrentRecord);

      return jsonWithCors(
        request,
        {
          ...payload,
          reused_session: true,
        },
        { status: 200 },
      );
    }

    return jsonWithCors(
      request,
      {
        error: "A LiveKit guest session is already active.",
        code: "active_session_exists",
        signup_url: LIVEKIT_GUEST_SIGNUP_URL,
      },
      { status: 409 },
    );
  }

  if (LIVEKIT_GUEST_COOLDOWN_ENABLED) {
    await Promise.all([
      redis.set(guestDeviceCooldownKey(deviceHash), sessionId, {
        ex: LIVEKIT_GUEST_COOLDOWN_SECONDS,
      }),
      redis.set(guestIpCooldownKey(ipHash), sessionId, {
        ex: LIVEKIT_GUEST_COOLDOWN_SECONDS,
      }),
    ]);
  }

  const record: GuestSessionRecord = {
    sessionId,
    roomName,
    participantIdentity,
    agentName,
    expiresAt,
    createdAt: new Date().toISOString(),
    deviceHash,
    ipHash,
    status: "active",
  };

  try {
    await redis.set(guestSessionKey(sessionId), record, {
      ex: LIVEKIT_GUEST_COOLDOWN_SECONDS,
    });

    if (LIVEKIT_GUEST_CLEANUP_ENABLED) {
      await createQStashClient().publishJSON({
        url: getGuestExpireUrl(request),
        body: { session_id: sessionId },
        delay: LIVEKIT_GUEST_SESSION_SECONDS,
        deduplicationId: `livekit-guest-expire-${sessionId}`,
        retries: 3,
      });
    }

    const payload = await issueGuestLiveKitToken(record);
    const response = jsonWithCors(request, payload, { status: 201 });

    if (isNew) {
      response.cookies.set(LIVEKIT_GUEST_COOKIE_NAME, deviceId, {
        httpOnly: true,
        maxAge: LIVEKIT_GUEST_COOLDOWN_ENABLED
          ? LIVEKIT_GUEST_COOLDOWN_SECONDS
          : LIVEKIT_GUEST_ACTIVE_TTL_SECONDS,
        path: "/",
        sameSite: "lax",
        secure: request.url.startsWith("https://"),
      });
    }

    return response;
  } catch (error) {
    await Promise.allSettled([
      redis.del(activeKey),
      redis.del(guestDeviceCooldownKey(deviceHash)),
      redis.del(guestIpCooldownKey(ipHash)),
      redis.del(guestSessionKey(sessionId)),
    ]);

    return jsonWithCors(
      request,
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create LiveKit guest session.",
      },
      { status: 500 },
    );
  }
}
