import { NextResponse } from "next/server";

import { liveKitOpenApiSpec } from "~/server/openapi/livekit";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json(liveKitOpenApiSpec);
}
