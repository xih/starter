import { NextResponse } from "next/server";

import {
  compilePersonaPrompt,
  getPersona,
  listPersonaMemories,
} from "~/server/personas";

export const runtime = "nodejs";

function isAuthorized(request: Request) {
  const expected = process.env.PERSONA_AGENT_READ_SECRET;

  if (!expected) {
    return process.env.NODE_ENV !== "production";
  }

  const authorization = request.headers.get("authorization");

  return authorization === `Bearer ${expected}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ personaId: string }> },
) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized persona request." },
      { status: 401 },
    );
  }

  const { personaId } = await params;
  const persona = await getPersona(personaId);

  if (!persona) {
    return NextResponse.json({ error: "Persona not found." }, { status: 404 });
  }

  const url = new URL(request.url);
  const userId = url.searchParams.get("user_id");
  const memories =
    persona.memory_enabled && userId
      ? await listPersonaMemories(persona.id, userId)
      : [];

  return NextResponse.json({
    persona,
    memories,
    compiled_prompt: compilePersonaPrompt({ memories, persona }),
  });
}
