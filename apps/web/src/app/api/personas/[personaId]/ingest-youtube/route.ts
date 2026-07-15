import { NextResponse } from "next/server";

import {
  createPromptDraftFromTranscript,
  createTranscriptEmbeddingChunks,
  getPersona,
  youtubeIngestSchema,
} from "~/server/personas";
import {
  isAuthorizedForPersonaWrite,
  personaWriteUnauthorizedResponse,
} from "~/server/personas-auth";

export const runtime = "nodejs";

async function fetchYoutubeOEmbedTitle(youtubeUrl: string) {
  const url = new URL("https://www.youtube.com/oembed");
  url.searchParams.set("url", youtubeUrl);
  url.searchParams.set("format", "json");

  const response = await fetch(url);

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json().catch(() => null)) as {
    title?: unknown;
  } | null;

  return typeof payload?.title === "string" ? payload.title : null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ personaId: string }> },
) {
  if (!isAuthorizedForPersonaWrite(request)) {
    return personaWriteUnauthorizedResponse();
  }

  const { personaId } = await params;
  const persona = await getPersona(personaId);

  if (!persona) {
    return NextResponse.json({ error: "Persona not found." }, { status: 404 });
  }

  const json: unknown = await request.json().catch(() => null);
  const parsed = youtubeIngestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid YouTube ingest request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  if (!parsed.data.has_source_rights || !parsed.data.has_voice_consent) {
    return NextResponse.json(
      {
        error:
          "YouTube persona ingestion requires source rights and explicit voice consent.",
      },
      { status: 403 },
    );
  }

  if (!parsed.data.transcript) {
    const title = await fetchYoutubeOEmbedTitle(parsed.data.youtube_url);

    return NextResponse.json(
      {
        error:
          "No transcript was supplied. Add captions/transcript text before generating a persona draft.",
        source_title: title,
      },
      { status: 422 },
    );
  }

  return NextResponse.json({
    persona_id: persona.id,
    source_url: parsed.data.youtube_url,
    draft_system_prompt: createPromptDraftFromTranscript(
      parsed.data.transcript,
    ),
    embedding_chunks: createTranscriptEmbeddingChunks(parsed.data.transcript),
    transcript_character_count: parsed.data.transcript.length,
  });
}
