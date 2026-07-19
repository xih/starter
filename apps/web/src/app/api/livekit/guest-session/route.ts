import { NextResponse } from "next/server";

import {
  createId,
  createQStashClient,
  createRedis,
  expireGuestSessionRecord,
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
  ensureGuestAgentDispatch,
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
import { DEFAULT_PERSONA_ID, getPersona } from "~/server/personas";

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

export function GET(request: Request) {
  const origin = request.headers.get("origin");

  if (origin !== null && !isOriginAllowed(origin)) {
    return jsonWithCors(
      request,
      { error: "Origin is not allowed to inspect LiveKit guest sessions." },
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

  return jsonWithCors(request, { ok: true }, { status: 200 });
}

function parseAgentMetadata(metadata: unknown) {
  if (typeof metadata !== "string" || !metadata.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(metadata) as unknown;
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function getRequestedPersonaMetadata(
  body: {
    persona_id?: unknown;
    room_config?: {
      agents?: Array<{
        agent_metadata?: unknown;
        metadata?: unknown;
      }>;
    };
  } | null,
) {
  const requestedAgent = body?.room_config?.agents?.[0];
  const metadata = parseAgentMetadata(
    requestedAgent?.agent_metadata ?? requestedAgent?.metadata,
  );
  const personaId =
    (typeof body?.persona_id === "string" ? body.persona_id : undefined) ??
    (typeof metadata.persona_id === "string" ? metadata.persona_id : undefined);
  const trimmedPersonaId = personaId?.trim();

  return {
    personaId:
      trimmedPersonaId && trimmedPersonaId.length > 0
        ? trimmedPersonaId
        : DEFAULT_PERSONA_ID,
  };
}

function isSameGuestSessionRequest(
  record: GuestSessionRecord,
  requested: { personaId: string; userId: string },
) {
  return (
    record.personaId === requested.personaId &&
    record.userId === requested.userId
  );
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

  const requestBody = (await request.json().catch(() => null)) as {
    ensure_dispatch?: unknown;
    persona_id?: unknown;
    room_config?: {
      agents?: Array<{
        agent_metadata?: unknown;
        metadata?: unknown;
      }>;
    };
  } | null;
  const shouldEnsureDispatch = requestBody?.ensure_dispatch === true;

  const redis = createRedis();
  const { personaId } = getRequestedPersonaMetadata(requestBody);
  const persona = await getPersona(personaId);

  if (!persona) {
    return jsonWithCors(
      request,
      {
        error: "Persona is not available for guest sessions.",
        code: "persona_not_available",
      },
      { status: 400 },
    );
  }

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
  const userId = `guest_${deviceHash.slice(0, 16)}`;
  const requestedSession = { personaId: persona.id, userId };
  const activeKey = guestActiveKey(deviceHash, ipHash);

  const activeSessionId = await redis.get<string>(activeKey);
  const activeRecord = activeSessionId
    ? await redis.get<GuestSessionRecord>(guestSessionKey(activeSessionId))
    : null;

  if (
    activeRecord?.status === "active" &&
    Date.parse(activeRecord.expiresAt) > Date.now() &&
    isSameGuestSessionRequest(activeRecord, requestedSession)
  ) {
    if (shouldEnsureDispatch) {
      try {
        await ensureGuestAgentDispatch(activeRecord);
      } catch (error) {
        return jsonWithCors(
          request,
          {
            error:
              error instanceof Error
                ? `Failed to ensure LiveKit agent dispatch: ${error.message}`
                : "Failed to ensure LiveKit agent dispatch.",
          },
          { status: 500 },
        );
      }
    }
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

  if (shouldEnsureDispatch) {
    return jsonWithCors(
      request,
      {
        error: "No active LiveKit guest session is available to dispatch.",
        code: "active_session_missing",
      },
      { status: 404 },
    );
  }

  if (LIVEKIT_GUEST_COOLDOWN_ENABLED) {
    const [deviceCooldown, ipCooldown] = await Promise.all([
      redis.get(guestDeviceCooldownKey(deviceHash)),
      redis.get(guestIpCooldownKey(ipHash)),
    ]);

    if ((deviceCooldown || ipCooldown) && !activeRecord) {
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

  if (
    activeRecord?.status === "active" &&
    Date.parse(activeRecord.expiresAt) > Date.now()
  ) {
    await expireGuestSessionRecord(activeRecord);
  }

  const claimResult = await redis.set(activeKey, sessionId, {
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
      Date.parse(concurrentRecord.expiresAt) > Date.now() &&
      isSameGuestSessionRequest(concurrentRecord, requestedSession)
    ) {
      if (shouldEnsureDispatch) {
        try {
          await ensureGuestAgentDispatch(concurrentRecord);
        } catch (error) {
          return jsonWithCors(
            request,
            {
              error:
                error instanceof Error
                  ? `Failed to ensure LiveKit agent dispatch: ${error.message}`
                  : "Failed to ensure LiveKit agent dispatch.",
            },
            { status: 500 },
          );
        }
      }
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
    personaId: persona.id,
    userId,
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

export async function DELETE(request: Request) {
  if (!isOriginAllowed(request.headers.get("origin"))) {
    return jsonWithCors(
      request,
      { error: "Origin is not allowed to end LiveKit guest sessions." },
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
  const { deviceId } = await getOrCreateGuestDeviceId();
  const [deviceHash, ipHash] = await Promise.all([
    hashGuestIdentifier(deviceId),
    hashGuestIdentifier(getClientIp(request)),
  ]);
  const activeKey = guestActiveKey(deviceHash, ipHash);
  const activeSessionId = await redis.get<string>(activeKey);

  if (!activeSessionId) {
    return jsonWithCors(request, { status: "missing" });
  }

  const record = await redis.get<GuestSessionRecord>(
    guestSessionKey(activeSessionId),
  );

  if (record?.status !== "active") {
    await redis.del(activeKey);

    return jsonWithCors(request, { status: "missing" });
  }

  await expireGuestSessionRecord(record);

  return jsonWithCors(request, {
    status: "expired",
    room_name: record.roomName,
  });
}
