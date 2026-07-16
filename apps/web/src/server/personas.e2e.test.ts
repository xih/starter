// @vitest-environment node

import { readFile } from "node:fs/promises";
import { basename } from "node:path";

import { describe, expect, it } from "vitest";

import {
  LOCAL_EMBEDDING_DIMENSIONS,
  LOCAL_EMBEDDING_MODEL,
  PERSONA_EMBEDDING_DIMENSIONS,
  PERSONA_EMBEDDING_MODEL,
} from "./personas";
import {
  PERSONA_E2E_CARTESIA_VOICE_IDS,
  PERSONA_E2E_CONSTANTS,
} from "./personas.e2e.constants";

const shouldRun = process.env.PERSONA_E2E === "1";
const describeE2E = shouldRun ? describe : describe.skip;

const baseUrl =
  process.env.PERSONA_E2E_BASE_URL ?? PERSONA_E2E_CONSTANTS.baseUrl;
const personaId =
  process.env.PERSONA_E2E_PERSONA_ID ?? PERSONA_E2E_CONSTANTS.personaId;
const displayName =
  process.env.PERSONA_E2E_DISPLAY_NAME ?? PERSONA_E2E_CONSTANTS.displayName;
const description = PERSONA_E2E_CONSTANTS.description;
const greeting = PERSONA_E2E_CONSTANTS.greeting;
const safetyDisclosure = PERSONA_E2E_CONSTANTS.safetyDisclosure;
const systemPrompt = PERSONA_E2E_CONSTANTS.systemPrompt;
const cartesiaVoiceIds = (process.env.PERSONA_E2E_CARTESIA_VOICE_IDS ?? "")
  .split(",")
  .map((voiceId) => voiceId.trim())
  .filter(Boolean)
  .concat(PERSONA_E2E_CARTESIA_VOICE_IDS);
const transcript =
  process.env.PERSONA_E2E_TRANSCRIPT ?? PERSONA_E2E_CONSTANTS.transcript;
const transcriptAnchor = "How to feel confident";
const transcriptDetailAnchor = "Dolly Parton";
const userId = process.env.PERSONA_E2E_USER_ID ?? PERSONA_E2E_CONSTANTS.userId;
const tokenAuth = process.env.PERSONA_E2E_TOKEN_AUTH;
const agentReadSecret =
  process.env.PERSONA_E2E_AGENT_READ_SECRET ??
  process.env.PERSONA_AGENT_READ_SECRET;
const personaWriteSecret =
  process.env.PERSONA_E2E_PERSONA_ADMIN_SECRET ??
  process.env.PERSONA_ADMIN_SECRET ??
  agentReadSecret;
const expectsOpenAIEmbeddings =
  process.env.PERSONA_E2E_EXPECT_OPENAI_EMBEDDINGS === "1" ||
  Boolean(process.env.OPENAI_API_KEY);
const expectedEmbeddingModel = expectsOpenAIEmbeddings
  ? PERSONA_EMBEDDING_MODEL
  : LOCAL_EMBEDDING_MODEL;
const expectedEmbeddingDimensions = expectsOpenAIEmbeddings
  ? PERSONA_EMBEDDING_DIMENSIONS
  : LOCAL_EMBEDDING_DIMENSIONS;

function url(path: string) {
  return new URL(path, baseUrl).toString();
}

async function jsonRequest(path: string, init: RequestInit = {}) {
  const response = await fetch(url(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(personaWriteSecret
        ? { Authorization: `Bearer ${personaWriteSecret}` }
        : {}),
      ...(init.headers ?? {}),
    },
  });
  const payload = (await response.json().catch(() => null)) as unknown;

  return { payload, response };
}

function expectObject(payload: unknown) {
  expect(payload).toBeTruthy();
  expect(typeof payload).toBe("object");

  return payload as Record<string, unknown>;
}

function slugForVoice(index: number) {
  return `${personaId}-voice-${index + 1}`;
}

async function upsertPersona({
  id,
  voiceId,
}: {
  id: string;
  voiceId?: string;
}) {
  return jsonRequest("/api/personas", {
    body: JSON.stringify({
      id,
      display_name: id === personaId ? displayName : `Voice ${id}`,
      description,
      cartesia_voice_id: voiceId,
      tts_model: "cartesia/sonic-3.5",
      tts_language: "en",
      system_prompt: systemPrompt,
      greeting,
      safety_disclosure: safetyDisclosure,
      memory_enabled: true,
      voice_consent_status: voiceId ? "approved" : "missing",
      source_rights_status: voiceId ? "authorized" : "unknown",
    }),
    method: "POST",
  });
}

describeE2E("persona endpoints e2e", () => {
  it("lists personas with stable ids", async () => {
    const { payload, response } = await jsonRequest("/api/personas");
    const body = expectObject(payload);

    expect(response.status).toBe(200);
    expect(Array.isArray(body.personas)).toBe(true);
    expect(
      (body.personas as Array<{ id?: unknown }>).every(
        (persona) => typeof persona.id === "string" && persona.id.length > 0,
      ),
    ).toBe(true);
  });

  it("creates a persona and reads it back through the picker endpoint", async () => {
    const { payload, response } = await upsertPersona({
      id: personaId,
      voiceId: cartesiaVoiceIds[0],
    });
    const body = expectObject(payload);

    expect(response.status).toBe(201);
    expect((body.persona as { id?: string }).id).toBe(personaId);

    const list = await jsonRequest("/api/personas");
    const listBody = expectObject(list.payload);
    const saved = (listBody.personas as Array<{ id: string }>).find(
      (persona) => persona.id === personaId,
    );

    expect(saved?.id).toBe(personaId);
  });

  it("ingests authorized YouTube transcript text into prompt and embedding chunks", async () => {
    const { payload, response } = await jsonRequest(
      `/api/personas/${personaId}/ingest-youtube`,
      {
        body: JSON.stringify({
          youtube_url:
            process.env.PERSONA_E2E_YOUTUBE_URL ??
            PERSONA_E2E_CONSTANTS.youtubeUrl,
          has_source_rights: true,
          has_voice_consent: true,
          transcript,
        }),
        method: "POST",
      },
    );
    const body = expectObject(payload);

    expect(response.status).toBe(200);
    expect(body.persona_id).toBe(personaId);
    expect(typeof body.draft_system_prompt).toBe("string");
    expect(Array.isArray(body.embedding_chunks)).toBe(true);
    expect((body.embedding_chunks as unknown[]).length).toBeGreaterThan(0);
    expect(body.embedding_model).toBe(expectedEmbeddingModel);
    expect(body.embedding_dimensions).toBe(expectedEmbeddingDimensions);

    const chunks = body.embedding_chunks as Array<{
      embedding?: unknown[];
      embedding_dimensions?: number;
      embedding_model?: string;
      text?: string;
    }>;
    const firstChunk = chunks[0];

    expect(firstChunk?.embedding).toHaveLength(expectedEmbeddingDimensions);
    expect(firstChunk?.embedding_dimensions).toBe(expectedEmbeddingDimensions);
    expect(firstChunk?.embedding_model).toBe(expectedEmbeddingModel);
    expect(firstChunk?.text).toContain(transcriptAnchor);

    const transcriptSource = body.transcript_source as
      | {
          chunks?: unknown[];
          embedding_dimensions?: number;
          embedding_model?: string;
          source_url?: string;
          transcript?: string;
        }
      | undefined;

    expect(transcriptSource?.source_url).toBe(
      process.env.PERSONA_E2E_YOUTUBE_URL ?? PERSONA_E2E_CONSTANTS.youtubeUrl,
    );
    expect(transcriptSource?.transcript).toContain(transcriptAnchor);
    expect(transcriptSource?.transcript).toContain(transcriptDetailAnchor);
    expect(transcriptSource?.embedding_model).toBe(expectedEmbeddingModel);
    expect(transcriptSource?.embedding_dimensions).toBe(
      expectedEmbeddingDimensions,
    );
    expect(transcriptSource?.chunks?.length).toBeGreaterThan(0);
  });

  it("stores persona-scoped memory and returns it in the compiled agent prompt", async () => {
    const memoryText =
      process.env.PERSONA_E2E_MEMORY_TEXT ?? PERSONA_E2E_CONSTANTS.memoryText;
    const memory = await jsonRequest(`/api/personas/${personaId}/memories`, {
      body: JSON.stringify({
        user_id: userId,
        text: memoryText,
        source: "e2e",
      }),
      method: "POST",
    });

    expect(memory.response.status).toBe(201);

    const headers = agentReadSecret
      ? { Authorization: `Bearer ${agentReadSecret}` }
      : undefined;
    const agent = await jsonRequest(
      `/api/personas/${personaId}/agent?user_id=${encodeURIComponent(userId)}`,
      { headers },
    );
    const body = expectObject(agent.payload);

    expect(agent.response.status).toBe(200);
    expect(body.compiled_prompt).toContain(memoryText);
    expect(body.compiled_prompt).toContain(transcriptAnchor);
    expect(body.compiled_prompt).toContain(transcriptDetailAnchor);
    expect(Array.isArray(body.transcript_sources)).toBe(true);

    const transcriptSources = body.transcript_sources as Array<{
      embedding_dimensions?: number;
      embedding_model?: string;
      chunks?: Array<{ embedding?: unknown[] }>;
    }>;

    expect(transcriptSources.length).toBeGreaterThan(0);
    expect(transcriptSources[0]?.embedding_model).toBe(expectedEmbeddingModel);
    expect(transcriptSources[0]?.embedding_dimensions).toBe(
      expectedEmbeddingDimensions,
    );
    expect(transcriptSources[0]?.chunks?.[0]?.embedding).toHaveLength(
      expectedEmbeddingDimensions,
    );
  });

  it("creates personas for every supplied Cartesia voice id", async () => {
    if (cartesiaVoiceIds.length === 0) {
      console.warn(
        "Skipping supplied voice-id persona creation: set PERSONA_E2E_CARTESIA_VOICE_IDS.",
      );
      return;
    }

    for (const [index, voiceId] of cartesiaVoiceIds.entries()) {
      const id = slugForVoice(index);
      const created = await upsertPersona({ id, voiceId });
      const body = expectObject(created.payload);

      expect(created.response.status).toBe(201);
      expect(
        (body.persona as { cartesia_voice_id?: string }).cartesia_voice_id,
      ).toBe(voiceId);
    }
  });

  it("optionally clones a Cartesia voice from the supplied consent-approved clip", async () => {
    const runClone =
      process.env.PERSONA_E2E_RUN_CLONE === "1" ||
      (process.env.PERSONA_E2E_RUN_CLONE === undefined &&
        PERSONA_E2E_CONSTANTS.runClone);

    if (!runClone) {
      console.warn("Skipping Cartesia clone: set PERSONA_E2E_RUN_CLONE=1.");
      return;
    }

    const clipPath =
      process.env.PERSONA_E2E_CLONE_CLIP_PATH ??
      PERSONA_E2E_CONSTANTS.cloneClipPath;
    const consentUrl = process.env.PERSONA_E2E_VOICE_CONSENT_ARTIFACT_URL;
    const resolvedConsentUrl =
      consentUrl ?? PERSONA_E2E_CONSTANTS.voiceConsentArtifactUrl;

    expect(clipPath, "PERSONA_E2E_CLONE_CLIP_PATH is required").toBeTruthy();
    expect(
      resolvedConsentUrl,
      "PERSONA_E2E_VOICE_CONSENT_ARTIFACT_URL is required",
    ).toBeTruthy();

    const clip = await readFile(clipPath!);
    const formData = new FormData();
    formData.set(
      "clip",
      new File([clip], basename(clipPath!), {
        type:
          process.env.PERSONA_E2E_CLONE_CLIP_TYPE ??
          PERSONA_E2E_CONSTANTS.cloneClipType,
      }),
    );
    formData.set("has_voice_consent", "true");
    formData.set("has_source_rights", "true");
    formData.set("voice_consent_artifact_url", resolvedConsentUrl);

    const response = await fetch(
      url(`/api/personas/${personaId}/clone-voice`),
      {
        body: formData,
        headers: personaWriteSecret
          ? { Authorization: `Bearer ${personaWriteSecret}` }
          : undefined,
        method: "POST",
      },
    );
    const payload = expectObject(await response.json().catch(() => null));

    expect(response.status).toBe(200);
    expect(typeof payload.voice_id).toBe("string");
    expect(
      (payload.persona as { cartesia_voice_id?: string }).cartesia_voice_id,
    ).toBe(payload.voice_id);
  }, 30_000);

  it("optionally issues a LiveKit token with compact persona metadata", async () => {
    const runLiveKitToken =
      process.env.PERSONA_E2E_RUN_LIVEKIT_TOKEN === "1" ||
      (process.env.PERSONA_E2E_RUN_LIVEKIT_TOKEN === undefined &&
        PERSONA_E2E_CONSTANTS.runLiveKitToken);

    if (!runLiveKitToken) {
      console.warn(
        "Skipping LiveKit token issuance: set PERSONA_E2E_RUN_LIVEKIT_TOKEN=1.",
      );
      return;
    }

    const { payload, response } = await jsonRequest("/api/livekit/token", {
      body: JSON.stringify({
        participant_name: "Persona E2E",
        room_name: `persona_e2e_${crypto.randomUUID()}`,
        room_config: {
          agents: [
            {
              agentName:
                process.env.PERSONA_E2E_AGENT_NAME ??
                PERSONA_E2E_CONSTANTS.agentName,
              metadata: JSON.stringify({
                persona_id: personaId,
                user_id: userId,
                session_id: `persona_e2e_${Date.now()}`,
              }),
            },
          ],
        },
      }),
      headers: tokenAuth ? { Authorization: `Bearer ${tokenAuth}` } : undefined,
      method: "POST",
    });
    const body = expectObject(payload);

    expect(response.status).toBe(201);
    expect(typeof body.participant_token).toBe("string");
    expect(body.agent_dispatch_mode).toBe("token_room_config");
  });
});
