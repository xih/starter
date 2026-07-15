import { Redis } from "@upstash/redis";
import { z } from "zod";

export const DEFAULT_PERSONA_ID = "portfolio-agent";
export const PERSONA_EMBEDDING_MODEL = "text-embedding-3-large";
export const PERSONA_EMBEDDING_DIMENSIONS = 3072;
export const LOCAL_EMBEDDING_MODEL = "local-hash-v1";
export const LOCAL_EMBEDDING_DIMENSIONS = 32;

const personaIdSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9][a-z0-9-]*$/);

export const personaSchema = z.object({
  id: personaIdSchema,
  display_name: z.string().min(1).max(120),
  avatar_url: z.string().min(1).max(500).optional(),
  description: z.string().min(1).max(240),
  cartesia_voice_id: z.string().min(1).max(200).optional(),
  tts_model: z.string().min(1).max(120).default("cartesia/sonic-3.5"),
  tts_language: z.string().min(2).max(16).default("en"),
  tts_speed: z.number().min(0.5).max(2).optional(),
  tts_emotion: z.string().min(1).max(80).optional(),
  system_prompt: z.string().min(1).max(16_000),
  greeting: z.string().min(1).max(1_000),
  safety_disclosure: z.string().min(1).max(2_000),
  source_transcript_ids: z.array(z.string().min(1).max(120)).default([]),
  memory_enabled: z.boolean().default(true),
  created_by_user_id: z.string().min(1).max(160).optional(),
  voice_consent_status: z
    .enum(["not_required", "missing", "pending", "approved", "rejected"])
    .default("missing"),
  voice_consent_artifact_url: z.string().url().optional(),
  source_rights_status: z
    .enum(["unknown", "owned", "licensed", "authorized", "rejected"])
    .default("unknown"),
});

export const personaCreateSchema = personaSchema.partial().extend({
  id: personaIdSchema,
  display_name: z.string().min(1).max(120),
  description: z.string().min(1).max(240),
  system_prompt: z.string().min(1).max(16_000),
  greeting: z.string().min(1).max(1_000),
});

export const personaMemorySchema = z.object({
  user_id: z.string().min(1).max(160),
  text: z.string().min(1).max(2_000),
  source: z.string().min(1).max(80).default("explicit"),
});

export const youtubeIngestSchema = z.object({
  youtube_url: z.string().url(),
  transcript: z.string().min(20).max(120_000).optional(),
  has_source_rights: z.boolean(),
  has_voice_consent: z.boolean(),
});

export type Persona = z.infer<typeof personaSchema>;
export type PersonaPickerItem = Pick<
  Persona,
  "avatar_url" | "description" | "display_name" | "id"
>;
export type PersonaMemory = z.infer<typeof personaMemorySchema> & {
  embedding: number[];
  embedding_dimensions?: number;
  embedding_model?: string;
  id: string;
  persona_id: string;
  created_at: string;
};
export type PersonaEmbeddingChunk = {
  embedding: number[];
  embedding_dimensions?: number;
  embedding_model?: string;
  id: string;
  text: string;
};
export type PersonaTranscriptSource = {
  chunks: PersonaEmbeddingChunk[];
  created_at: string;
  embedding_dimensions: number;
  embedding_model: string;
  id: string;
  persona_id: string;
  source_title?: string;
  source_url: string;
  transcript: string;
  transcript_character_count: number;
};

const defaultPersonas: Persona[] = [
  {
    id: DEFAULT_PERSONA_ID,
    display_name: "Portfolio Agent",
    avatar_url: "/agent-sidebar/avatar-4.png",
    description: "Warm, concise portfolio voice agent",
    cartesia_voice_id: process.env.LIVEKIT_AGENT_TTS_VOICE_ID,
    tts_model: "cartesia/sonic-3.5",
    tts_language: "en",
    system_prompt: [
      "You are Dennis's portfolio voice agent.",
      "Keep responses short, warm, and useful for an end-to-end realtime voice test.",
      "When the user asks who you are, say you are the Dennis portfolio test agent.",
      "Avoid long lists unless the user asks for detail.",
    ].join(" "),
    greeting:
      "Greet the user briefly and say you are ready for a quick voice test.",
    safety_disclosure:
      "You are an AI voice agent. Do not claim to be a real person.",
    source_transcript_ids: [],
    memory_enabled: true,
    voice_consent_status: "not_required",
    source_rights_status: "owned",
  },
  {
    id: "wife",
    display_name: "Wife",
    avatar_url: "/agent-sidebar/avatar-1.png",
    description: "Private cloned voice draft",
    tts_model: "cartesia/sonic-3.5",
    tts_language: "en",
    system_prompt:
      "You are a private family persona draft. Be warm, grounded, and conversational. Do not impersonate a real person unless explicit consent has been approved.",
    greeting: "Say hello warmly and ask what Dennis would like to talk about.",
    safety_disclosure:
      "This persona is disabled for cloned voice use until explicit voice consent is approved.",
    source_transcript_ids: [],
    memory_enabled: true,
    voice_consent_status: "missing",
    source_rights_status: "unknown",
  },
];

const memoryStore = new Map<string, PersonaMemory[]>();
const personaStore = new Map(
  defaultPersonas.map((persona) => [persona.id, persona]),
);
const transcriptStore = new Map<string, PersonaTranscriptSource[]>();

function redisFromEnv() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  return new Redis({ url, token });
}

function personasKey() {
  return "personas:v1:list";
}

function memoriesKey(personaId: string, userId: string) {
  return `personas:v1:${personaId}:memories:${userId}`;
}

function transcriptSourcesKey(personaId: string) {
  return `personas:v1:${personaId}:transcripts`;
}

function hashToken(token: string) {
  let hash = 0;

  for (let index = 0; index < token.length; index += 1) {
    hash = (hash * 31 + token.charCodeAt(index)) % 997;
  }

  return hash;
}

export function createLocalEmbedding(text: string) {
  const vector = Array.from({ length: 32 }, () => 0);
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  for (const token of tokens) {
    const index = hashToken(token) % vector.length;
    vector[index] = (vector[index] ?? 0) + 1;
  }

  const magnitude =
    Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;

  return vector.map((value) => Number((value / magnitude).toFixed(6)));
}

async function createOpenAIEmbeddings(texts: string[]) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "OPENAI_API_KEY is required to create persona embeddings.",
      );
    }

    return texts.map((text) => ({
      embedding: createLocalEmbedding(text),
      embedding_dimensions: LOCAL_EMBEDDING_DIMENSIONS,
      embedding_model: LOCAL_EMBEDDING_MODEL,
    }));
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    body: JSON.stringify({
      encoding_format: "float",
      input: texts,
      model: PERSONA_EMBEDDING_MODEL,
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const payload = (await response.json().catch(() => null)) as {
    data?: Array<{ embedding?: unknown; index?: unknown }>;
    error?: unknown;
  } | null;

  if (!response.ok) {
    const errorMessage =
      payload &&
      typeof payload.error === "object" &&
      payload.error !== null &&
      "message" in payload.error &&
      typeof payload.error.message === "string"
        ? ` ${payload.error.message}`
        : "";

    throw new Error(
      `OpenAI embedding request failed with HTTP ${response.status}.${errorMessage}`,
    );
  }

  const embeddings = texts.map((_, index) => {
    const item = payload?.data?.find((candidate) => candidate.index === index);
    const embedding = item?.embedding;

    if (
      !Array.isArray(embedding) ||
      !embedding.every((value) => typeof value === "number")
    ) {
      throw new Error(
        "OpenAI embedding response did not include a valid vector.",
      );
    }

    return {
      embedding,
      embedding_dimensions: embedding.length,
      embedding_model: PERSONA_EMBEDDING_MODEL,
    };
  });

  return embeddings;
}

function createTranscriptChunksWithoutEmbeddings(transcript: string) {
  const cleanTranscript = transcript.replace(/\s+/g, " ").trim();
  const chunks: Array<{ id: string; text: string }> = [];

  for (let index = 0; index < cleanTranscript.length; index += 1_200) {
    const text = cleanTranscript.slice(index, index + 1_200).trim();

    if (text.length === 0) {
      continue;
    }

    chunks.push({
      id: crypto.randomUUID(),
      text,
    });
  }

  return chunks;
}

export async function createTranscriptEmbeddingChunks(transcript: string) {
  const chunks = createTranscriptChunksWithoutEmbeddings(transcript);
  const embeddings = await createOpenAIEmbeddings(
    chunks.map(
      (chunk) => `Represent this persona transcript passage: ${chunk.text}`,
    ),
  );

  return chunks.map((chunk, index) => {
    const embedding = embeddings[index];

    if (!embedding) {
      throw new Error(
        "Persona transcript embedding count did not match chunks.",
      );
    }

    return {
      ...chunk,
      ...embedding,
    };
  }) satisfies PersonaEmbeddingChunk[];
}

export async function listPersonas() {
  const redis = redisFromEnv();
  if (!redis) {
    return Array.from(personaStore.values());
  }

  const stored = await redis.get<Persona[]>(personasKey());
  if (!stored?.length) {
    await redis.set(personasKey(), defaultPersonas);
    return defaultPersonas;
  }

  return stored;
}

export async function listPersonaPickerItems(): Promise<PersonaPickerItem[]> {
  const personas = await listPersonas();

  return personas.map(({ avatar_url, description, display_name, id }) => ({
    avatar_url,
    description,
    display_name,
    id,
  }));
}

export async function getPersona(personaId: string) {
  const personas = await listPersonas();
  return personas.find((persona) => persona.id === personaId) ?? null;
}

export async function upsertPersona(
  input: z.infer<typeof personaCreateSchema>,
) {
  const existing = (await getPersona(input.id)) ?? {};
  const persona = personaSchema.parse({ ...existing, ...input });
  const personas = await listPersonas();
  const nextPersonas = [
    ...personas.filter((candidate) => candidate.id !== persona.id),
    persona,
  ].sort((a, b) => a.display_name.localeCompare(b.display_name));
  const redis = redisFromEnv();

  if (redis) {
    await redis.set(personasKey(), nextPersonas);
  } else {
    personaStore.clear();
    for (const nextPersona of nextPersonas) {
      personaStore.set(nextPersona.id, nextPersona);
    }
  }

  return persona;
}

export async function addPersonaMemory(
  personaId: string,
  memory: z.infer<typeof personaMemorySchema>,
) {
  const existingMemories = await listPersonaMemories(personaId, memory.user_id);
  const duplicate = existingMemories.find(
    (existing) =>
      existing.text === memory.text && existing.source === memory.source,
  );

  if (duplicate) {
    return duplicate;
  }

  const [embedding] = await createOpenAIEmbeddings([
    `Represent this persona memory: ${memory.text}`,
  ]);
  const record: PersonaMemory = {
    ...memory,
    embedding: embedding?.embedding ?? createLocalEmbedding(memory.text),
    embedding_dimensions:
      embedding?.embedding_dimensions ?? LOCAL_EMBEDDING_DIMENSIONS,
    embedding_model: embedding?.embedding_model ?? LOCAL_EMBEDDING_MODEL,
    id: crypto.randomUUID(),
    persona_id: personaId,
    created_at: new Date().toISOString(),
  };
  const redis = redisFromEnv();

  if (redis) {
    await redis.lpush(memoriesKey(personaId, memory.user_id), record);
    await redis.ltrim(memoriesKey(personaId, memory.user_id), 0, 99);
  } else {
    const key = memoriesKey(personaId, memory.user_id);
    memoryStore.set(
      key,
      [record, ...(memoryStore.get(key) ?? [])].slice(0, 100),
    );
  }

  return record;
}

export async function listPersonaMemories(personaId: string, userId: string) {
  const redis = redisFromEnv();

  if (redis) {
    return redis.lrange<PersonaMemory>(memoriesKey(personaId, userId), 0, 9);
  }

  return memoryStore.get(memoriesKey(personaId, userId))?.slice(0, 10) ?? [];
}

export async function addPersonaTranscriptSource({
  personaId,
  sourceTitle,
  sourceUrl,
  transcript,
}: {
  personaId: string;
  sourceTitle?: string;
  sourceUrl: string;
  transcript: string;
}) {
  const chunks = await createTranscriptEmbeddingChunks(transcript);
  const firstChunk = chunks[0];
  const record: PersonaTranscriptSource = {
    chunks,
    created_at: new Date().toISOString(),
    embedding_dimensions:
      firstChunk?.embedding_dimensions ?? PERSONA_EMBEDDING_DIMENSIONS,
    embedding_model: firstChunk?.embedding_model ?? PERSONA_EMBEDDING_MODEL,
    id: crypto.randomUUID(),
    persona_id: personaId,
    source_title: sourceTitle,
    source_url: sourceUrl,
    transcript,
    transcript_character_count: transcript.length,
  };
  const redis = redisFromEnv();

  if (redis) {
    await redis.lpush(transcriptSourcesKey(personaId), record);
    await redis.ltrim(transcriptSourcesKey(personaId), 0, 9);
  } else {
    const key = transcriptSourcesKey(personaId);
    transcriptStore.set(
      key,
      [record, ...(transcriptStore.get(key) ?? [])].slice(0, 10),
    );
  }

  return record;
}

export async function listPersonaTranscriptSources(personaId: string) {
  const redis = redisFromEnv();

  if (redis) {
    return redis.lrange<PersonaTranscriptSource>(
      transcriptSourcesKey(personaId),
      0,
      9,
    );
  }

  return transcriptStore.get(transcriptSourcesKey(personaId)) ?? [];
}

export function createPromptDraftFromTranscript(transcript: string) {
  const cleanTranscript = transcript.replace(/\s+/g, " ").trim();
  const sample = cleanTranscript.slice(0, 1_200);

  return [
    "You are a consent-approved voice persona based on supplied transcript material.",
    "Speak naturally, warmly, and conversationally.",
    "Use the transcript only as style and context material; do not reveal private source text unless the user explicitly asks about uploaded context.",
    "Respect boundaries, avoid overclaiming identity, and keep responses appropriate for a realtime voice conversation.",
    `Transcript style sample: ${sample}`,
  ].join("\n\n");
}

export function compilePersonaPrompt({
  memories,
  persona,
  transcriptSources = [],
}: {
  memories: PersonaMemory[];
  persona: Persona;
  transcriptSources?: PersonaTranscriptSource[];
}) {
  const memoryBlock = memories.length
    ? [
        "Relevant remembered facts for this user and persona:",
        ...memories.map((memory) => `- ${memory.text}`),
      ].join("\n")
    : "No user-specific memories were retrieved for this persona.";

  const transcriptBlock = transcriptSources.length
    ? [
        "Relevant transcript context for this persona:",
        ...transcriptSources
          .flatMap((source) => source.chunks.slice(0, 3))
          .slice(0, 6)
          .map((chunk) => `- ${chunk.text}`),
      ].join("\n")
    : "No transcript context was retrieved for this persona.";

  return [
    persona.safety_disclosure,
    persona.system_prompt,
    transcriptBlock,
    persona.memory_enabled
      ? memoryBlock
      : "Memory is disabled for this persona.",
  ].join("\n\n");
}
