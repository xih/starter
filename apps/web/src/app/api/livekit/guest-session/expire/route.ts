import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createRedis,
  createRoomServiceClient,
  guestActiveKey,
  guestSessionKey,
  type GuestSessionRecord,
  LIVEKIT_GUEST_COOLDOWN_SECONDS,
} from "~/server/livekit/guest-session";

export const runtime = "nodejs";

const expireRequestSchema = z.object({
  session_id: z.string().min(1),
});

function isRoomNotFoundError(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return String(error).toLowerCase().includes("not found");
  }

  const maybeError = error as {
    code?: unknown;
    message?: unknown;
    status?: unknown;
  };
  const message =
    typeof maybeError.message === "string" ? maybeError.message : "";

  return (
    maybeError.status === 404 ||
    maybeError.code === "not_found" ||
    message.toLowerCase().includes("not found")
  );
}

async function expireGuestSession(request: Request) {
  const json: unknown = await request.json().catch(() => null);
  const parsed = expireRequestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid guest session expiration request." },
      { status: 400 },
    );
  }

  const redis = createRedis();
  const key = guestSessionKey(parsed.data.session_id);
  const record = await redis.get<GuestSessionRecord>(key);

  if (!record) {
    return NextResponse.json({ status: "missing" });
  }

  if (record.status === "expired") {
    return NextResponse.json({ status: "already_expired" });
  }

  try {
    await createRoomServiceClient().deleteRoom(record.roomName);
  } catch (error) {
    if (!isRoomNotFoundError(error)) {
      throw error;
    }
  }

  const expiredRecord: GuestSessionRecord = {
    ...record,
    status: "expired",
  };

  const activeKey = guestActiveKey(record.deviceHash, record.ipHash);
  const activeSessionId = await redis.get<string>(activeKey);
  const expireOperations: Array<Promise<unknown>> = [
    redis.set(key, expiredRecord, { ex: LIVEKIT_GUEST_COOLDOWN_SECONDS }),
  ];

  if (activeSessionId === record.sessionId) {
    expireOperations.push(redis.del(activeKey));
  }

  await Promise.all(expireOperations);

  return NextResponse.json({
    status: "expired",
    room_name: record.roomName,
  });
}

function createExpireHandler() {
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;

  if (!currentSigningKey || !nextSigningKey) {
    return function disabledExpireHandler() {
      return NextResponse.json(
        {
          error:
            "LiveKit guest session expiration is not configured. Set QStash signing keys.",
        },
        { status: 503 },
      );
    };
  }

  return verifySignatureAppRouter(expireGuestSession, {
    currentSigningKey,
    nextSigningKey,
  });
}

export const POST = createExpireHandler();
