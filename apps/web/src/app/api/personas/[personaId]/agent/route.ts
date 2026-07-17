import { NextResponse } from "next/server";

import {
  compilePersonaPrompt,
  getPersona,
  listPersonaMemories,
  listPersonaTranscriptSources,
  type PersonaTranscriptSource,
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

function toAgentTranscriptSource(source: PersonaTranscriptSource) {
  return {
    chunk_count: source.chunks.length,
    created_at: source.created_at,
    embedding_dimensions: source.embedding_dimensions,
    embedding_model: source.embedding_model,
    id: source.id,
    persona_id: source.persona_id,
    source_title: source.source_title,
    source_url: source.source_url,
    transcript_character_count: source.transcript_character_count,
  };
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
  const transcript_sources = await listPersonaTranscriptSources(persona.id);

  return NextResponse.json({
    persona,
    memories,
    transcript_sources: transcript_sources.map(toAgentTranscriptSource),
    compiled_prompt: compilePersonaPrompt({
      memories,
      persona,
      transcriptSources: transcript_sources,
    }),
  });
}
