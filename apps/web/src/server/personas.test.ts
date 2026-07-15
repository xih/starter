import { describe, expect, it } from "vitest";

import {
  compilePersonaPrompt,
  createLocalEmbedding,
  listPersonaPickerItems,
  createPromptDraftFromTranscript,
  createTranscriptEmbeddingChunks,
  personaSchema,
  type PersonaMemory,
} from "./personas";

describe("personas", () => {
  it("validates the first-class persona model", () => {
    const persona = personaSchema.parse({
      id: "test-persona",
      display_name: "Test Persona",
      description: "A test voice",
      system_prompt: "Be concise.",
      greeting: "Say hello.",
      safety_disclosure: "You are an AI voice agent.",
    });

    expect(persona.memory_enabled).toBe(true);
    expect(persona.tts_model).toBe("cartesia/sonic-3.5");
    expect(persona.voice_consent_status).toBe("missing");
  });

  it("compiles persona prompts with scoped memories", () => {
    const persona = personaSchema.parse({
      id: "test-persona",
      display_name: "Test Persona",
      description: "A test voice",
      system_prompt: "Be concise.",
      greeting: "Say hello.",
      safety_disclosure: "You are an AI voice agent.",
      memory_enabled: true,
    });
    const memories: PersonaMemory[] = [
      {
        id: "memory-1",
        embedding: createLocalEmbedding("Dennis likes short answers."),
        created_at: "2026-07-14T00:00:00.000Z",
        persona_id: "test-persona",
        source: "explicit",
        text: "Dennis likes short answers.",
        user_id: "local-qa",
      },
    ];

    expect(compilePersonaPrompt({ memories, persona })).toContain(
      "Dennis likes short answers.",
    );
  });

  it("creates a reviewed prompt draft from transcript context", () => {
    const draft = createPromptDraftFromTranscript(
      "This is a warm transcript sample with enough words to pass validation.",
    );

    expect(draft).toContain("Transcript style sample");
    expect(draft).toContain("consent-approved");
  });

  it("creates transcript embedding chunks for retrieval storage", () => {
    const chunks = createTranscriptEmbeddingChunks(
      "This transcript chunk should become a local embedding for later retrieval.",
    );

    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.embedding).toHaveLength(32);
  });

  it("projects public picker personas without private prompt or voice fields", async () => {
    const personas = await listPersonaPickerItems();
    const firstPersona = personas[0] as Record<string, unknown> | undefined;

    expect(firstPersona).toBeTruthy();
    expect(firstPersona?.id).toBeTruthy();
    expect(firstPersona?.display_name).toBeTruthy();
    expect(firstPersona).not.toHaveProperty("system_prompt");
    expect(firstPersona).not.toHaveProperty("greeting");
    expect(firstPersona).not.toHaveProperty("cartesia_voice_id");
    expect(firstPersona).not.toHaveProperty("voice_consent_artifact_url");
  });
});
