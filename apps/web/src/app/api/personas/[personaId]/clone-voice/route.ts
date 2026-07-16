import { NextResponse } from "next/server";

import { getPersona, upsertPersona } from "~/server/personas";
import {
  isAuthorizedForPersonaWrite,
  personaWriteUnauthorizedResponse,
} from "~/server/personas-auth";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ personaId: string }> },
) {
  if (!isAuthorizedForPersonaWrite(request)) {
    return personaWriteUnauthorizedResponse();
  }

  if (!process.env.CARTESIA_API_KEY) {
    return NextResponse.json(
      { error: "Cartesia voice cloning is not configured." },
      { status: 500 },
    );
  }

  const { personaId } = await params;
  const persona = await getPersona(personaId);

  if (!persona) {
    return NextResponse.json({ error: "Persona not found." }, { status: 404 });
  }

  const formData = await request.formData();
  const clip = formData.get("clip");
  const hasVoiceConsent = formData.get("has_voice_consent") === "true";
  const hasSourceRights = formData.get("has_source_rights") === "true";
  const consentArtifactUrl = formData.get("voice_consent_artifact_url");
  const normalizedConsentArtifactUrl =
    typeof consentArtifactUrl === "string" &&
    consentArtifactUrl.trim().length > 0
      ? consentArtifactUrl.trim()
      : undefined;

  if (!(clip instanceof File)) {
    return NextResponse.json(
      { error: "Upload a consent-approved audio clip as `clip`." },
      { status: 400 },
    );
  }

  if (!hasVoiceConsent || !hasSourceRights) {
    return NextResponse.json(
      {
        error:
          "Voice cloning requires explicit voice consent and source audio rights.",
      },
      { status: 403 },
    );
  }

  if (normalizedConsentArtifactUrl) {
    try {
      new URL(normalizedConsentArtifactUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid voice_consent_artifact_url. Must be a valid URL." },
        { status: 400 },
      );
    }
  }

  const cartesiaForm = new FormData();
  cartesiaForm.set("clip", clip);
  cartesiaForm.set("name", persona.display_name);
  cartesiaForm.set("language", persona.tts_language);
  cartesiaForm.set("description", persona.description);
  cartesiaForm.set("access[type]", "private");

  const response = await fetch("https://api.cartesia.ai/voices/clone", {
    body: cartesiaForm,
    headers: {
      Authorization: `Bearer ${process.env.CARTESIA_API_KEY}`,
      "Cartesia-Version": "2026-03-01",
    },
    method: "POST",
  });
  const payload = (await response.json().catch(() => null)) as {
    id?: unknown;
    voice_id?: unknown;
  } | null;

  if (!response.ok) {
    return NextResponse.json(
      { error: "Cartesia voice clone failed.", cartesia: payload },
      { status: response.status },
    );
  }

  const voiceId =
    typeof payload?.id === "string"
      ? payload.id
      : typeof payload?.voice_id === "string"
        ? payload.voice_id
        : null;

  if (!voiceId) {
    return NextResponse.json(
      { error: "Cartesia clone response did not include a voice ID." },
      { status: 502 },
    );
  }

  const updatedPersona = await upsertPersona({
    ...persona,
    cartesia_voice_id: voiceId,
    voice_consent_status: "approved",
    voice_consent_artifact_url:
      normalizedConsentArtifactUrl ?? persona.voice_consent_artifact_url,
    source_rights_status: "authorized",
  });

  return NextResponse.json({ persona: updatedPersona, voice_id: voiceId });
}
