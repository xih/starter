import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const PERSONA_E2E_CONSTANTS = {
  agentName: "dennis-portfolio-agent",
  baseUrl: "http://localhost:3000",
  cloneClipPath: fileURLToPath(
    new URL(
      "../../test-fixtures/personas/wife-e2e-consent-clip.wav",
      import.meta.url,
    ),
  ),
  cloneClipType: "audio/wav",
  displayName: "Wife E2E",
  memoryText:
    "Dennis wants this persona to remember that short answers are best.",
  personaId: "wife-e2e",
  runClone: true,
  runLiveKitToken: false,
  transcript: readFileSync(
    new URL(
      "../../test-fixtures/personas/wife-e2e-transcript.txt",
      import.meta.url,
    ),
    "utf8",
  ).trim(),
  userId: "persona-e2e-user",
  voiceConsentArtifactUrl: "https://www.youtube.com/watch?v=sCRpxq1XRUI",
  youtubeUrl: "https://www.youtube.com/watch?v=sCRpxq1XRUI",
} as const;

export const PERSONA_E2E_CARTESIA_VOICE_IDS = [] as const;
