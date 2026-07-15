import { Redis } from "@upstash/redis";
import { z } from "zod";

export const DEFAULT_PERSONA_ID = "portfolio-agent";

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
  id: string;
  persona_id: string;
  created_at: string;
};
export type PersonaEmbeddingChunk = {
  embedding: number[];
  id: string;
  text: string;
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

export function createTranscriptEmbeddingChunks(transcript: string) {
  const cleanTranscript = transcript.replace(/\s+/g, " ").trim();
  const chunks: PersonaEmbeddingChunk[] = [];

  for (let index = 0; index < cleanTranscript.length; index += 1_200) {
    const text = cleanTranscript.slice(index, index + 1_200).trim();

    if (text.length === 0) {
      continue;
    }

    chunks.push({
      id: crypto.randomUUID(),
      text,
      embedding: createLocalEmbedding(text),
    });
  }

  return chunks;
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
  const record: PersonaMemory = {
    ...memory,
    embedding: createLocalEmbedding(memory.text),
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
}: {
  memories: PersonaMemory[];
  persona: Persona;
}) {
  const memoryBlock = memories.length
    ? [
        "Relevant remembered facts for this user and persona:",
        ...memories.map((memory) => `- ${memory.text}`),
      ].join("\n")
    : "No user-specific memories were retrieved for this persona.";

  return [
    persona.safety_disclosure,
    persona.system_prompt,
    persona.memory_enabled
      ? memoryBlock
      : "Memory is disabled for this persona.",
  ].join("\n\n");
}
