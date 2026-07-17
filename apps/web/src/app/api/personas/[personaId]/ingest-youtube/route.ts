import { NextResponse } from "next/server";

import {
  addPersonaTranscriptSource,
  createPromptDraftFromTranscript,
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

  const response = await fetch(url).catch(() => null);

  if (!response?.ok) {
    return null;
  }

  const payload = (await response.json().catch(() => null)) as {
    title?: unknown;
  } | null;

  return typeof payload?.title === "string" ? payload.title : null;
}

function extractYoutubeVideoId(youtubeUrl: string) {
  const url = new URL(youtubeUrl);

  if (url.hostname === "youtu.be") {
    return url.pathname.slice(1) || null;
  }

  if (url.searchParams.get("v")) {
    return url.searchParams.get("v");
  }

  const shortsMatch = /\/shorts\/([^/?]+)/.exec(url.pathname);
  return shortsMatch?.[1] ?? null;
}

function parsePlayerResponse(html: string) {
  const marker = "ytInitialPlayerResponse = ";
  const start = html.indexOf(marker);

  if (start < 0) {
    return null;
  }

  const jsonStart = start + marker.length;
  const jsonEnd = html.indexOf(";</script>", jsonStart);

  if (jsonEnd < 0) {
    return null;
  }

  try {
    return JSON.parse(html.slice(jsonStart, jsonEnd)) as {
      captions?: {
        playerCaptionsTracklistRenderer?: {
          captionTracks?: Array<{
            baseUrl?: string;
            languageCode?: string;
            name?: { simpleText?: string };
          }>;
        };
      };
    };
  } catch {
    return null;
  }
}

function decodeXmlEntities(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

async function fetchCaptionTrackText(baseUrl: string) {
  const url = new URL(baseUrl);
  url.searchParams.set("fmt", "json3");
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `YouTube caption fetch failed with HTTP ${response.status}.`,
    );
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = (await response.json()) as {
      events?: Array<{ segs?: Array<{ utf8?: string }> }>;
    };

    return (
      payload.events
        ?.flatMap((event) => event.segs ?? [])
        .map((segment) => segment.utf8 ?? "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim() ?? ""
    );
  }

  const xml = await response.text();
  return Array.from(xml.matchAll(/<text[^>]*>(.*?)<\/text>/g))
    .map((match) => decodeXmlEntities(match[1] ?? ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchYoutubeTranscript(youtubeUrl: string) {
  const videoId = extractYoutubeVideoId(youtubeUrl);

  if (!videoId) {
    return null;
  }

  const watchResponse = await fetch(
    `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,
    {
      headers: {
        "Accept-Language": "en-US,en;q=0.9",
      },
    },
  );

  if (!watchResponse.ok) {
    return null;
  }

  const playerResponse = parsePlayerResponse(await watchResponse.text());
  const tracks =
    playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks ??
    [];
  const track =
    tracks.find((candidate) => candidate.languageCode?.startsWith("en")) ??
    tracks[0];

  if (!track?.baseUrl) {
    return null;
  }

  const transcript = await fetchCaptionTrackText(track.baseUrl);

  return transcript.length > 0
    ? {
        language: track.languageCode,
        title: track.name?.simpleText,
        transcript,
      }
    : null;
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

  const oEmbedTitle = await fetchYoutubeOEmbedTitle(parsed.data.youtube_url);
  const extracted = parsed.data.transcript
    ? null
    : await fetchYoutubeTranscript(parsed.data.youtube_url);
  const transcript = parsed.data.transcript ?? extracted?.transcript;

  if (!transcript) {
    const title = oEmbedTitle;

    return NextResponse.json(
      {
        error:
          "No transcript was supplied. Add captions/transcript text before generating a persona draft.",
        source_title: title,
      },
      { status: 422 },
    );
  }

  const transcriptSource = await addPersonaTranscriptSource({
    personaId: persona.id,
    sourceTitle: oEmbedTitle ?? extracted?.title,
    sourceUrl: parsed.data.youtube_url,
    transcript,
  }).catch((error: unknown) => {
    const message =
      error instanceof Error
        ? error.message
        : "Persona transcript embedding failed.";

    return NextResponse.json(
      {
        error: "Persona transcript embedding failed.",
        detail: message,
      },
      { status: 502 },
    );
  });

  if (transcriptSource instanceof NextResponse) {
    return transcriptSource;
  }

  return NextResponse.json({
    embedding_model: transcriptSource.embedding_model,
    embedding_dimensions: transcriptSource.embedding_dimensions,
    embedding_chunks: transcriptSource.chunks,
    persona_id: persona.id,
    source_url: parsed.data.youtube_url,
    source_title: oEmbedTitle ?? extracted?.title,
    transcript_source: transcriptSource,
    draft_system_prompt: createPromptDraftFromTranscript(transcript),
    transcript_character_count: transcript.length,
  });
}
