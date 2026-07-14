import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createRedis,
  expireGuestSessionRecord,
  guestSessionKey,
  type GuestSessionRecord,
} from "~/server/livekit/guest-session";

export const runtime = "nodejs";

const expireRequestSchema = z.object({
  session_id: z.string().min(1),
});

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

  await expireGuestSessionRecord(record);

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
