import { NextResponse } from "next/server";

import {
  listPersonaPickerItems,
  personaCreateSchema,
  upsertPersona,
} from "~/server/personas";
import {
  isAuthorizedForPersonaWrite,
  personaWriteUnauthorizedResponse,
} from "~/server/personas-auth";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ personas: await listPersonaPickerItems() });
}

export async function POST(request: Request) {
  if (!isAuthorizedForPersonaWrite(request)) {
    return personaWriteUnauthorizedResponse();
  }

  const json: unknown = await request.json().catch(() => null);
  const parsed = personaCreateSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid persona request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const persona = await upsertPersona(parsed.data);

  return NextResponse.json({ persona }, { status: 201 });
}
