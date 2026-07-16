// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const persona = {
  id: "wife-e2e",
  display_name: "Wife E2E",
  description: "Automated test persona",
  tts_language: "en",
};
const getPersona = vi.fn();
const upsertPersona = vi.fn();

vi.mock("~/server/personas", () => ({
  getPersona,
  upsertPersona,
}));

function setEnv() {
  vi.stubEnv("NODE_ENV", "production");
  process.env.CARTESIA_API_KEY = "cartesia-secret";
  process.env.PERSONA_ADMIN_SECRET = "persona-admin-secret";
  delete process.env.PERSONA_AGENT_READ_SECRET;
}

function createRequest({
  consent = true,
  consentArtifactUrl = "https://example.com/consent",
  headers = { Authorization: "Bearer persona-admin-secret" },
  rights = true,
}: {
  consent?: boolean;
  consentArtifactUrl?: string;
  headers?: Record<string, string>;
  rights?: boolean;
} = {}) {
  const formData = new FormData();
  formData.set("clip", new File(["audio"], "clip.wav", { type: "audio/wav" }));
  formData.set("has_voice_consent", String(consent));
  formData.set("has_source_rights", String(rights));
  formData.set("voice_consent_artifact_url", consentArtifactUrl);

  return new Request("https://example.com/api/personas/wife-e2e/clone-voice", {
    body: formData,
    headers,
    method: "POST",
  });
}

async function importRoute() {
  vi.resetModules();
  return import("./route");
}

describe("POST /api/personas/[personaId]/clone-voice", () => {
  beforeEach(() => {
    setEnv();
    vi.clearAllMocks();
    getPersona.mockResolvedValue(persona);
    upsertPersona.mockResolvedValue(persona);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ id: "cartesia-voice-id" }, { status: 200 }),
      ),
    );
  });

  it("rejects unauthenticated clone requests", async () => {
    const { POST } = await importRoute();
    const response = await POST(createRequest({ headers: {} }), {
      params: Promise.resolve({ personaId: "wife-e2e" }),
    });

    expect(response.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects clone requests without explicit consent and source rights", async () => {
    const { POST } = await importRoute();
    const response = await POST(createRequest({ consent: false }), {
      params: Promise.resolve({ personaId: "wife-e2e" }),
    });

    expect(response.status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns upstream Cartesia failures without approving the persona", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({ error: "payment_required" }, { status: 402 }),
    );
    const { POST } = await importRoute();
    const response = await POST(createRequest(), {
      params: Promise.resolve({ personaId: "wife-e2e" }),
    });

    expect(response.status).toBe(402);
    expect(upsertPersona).not.toHaveBeenCalled();
  });

  it("rejects invalid consent artifact URLs before cloning", async () => {
    const { POST } = await importRoute();
    const response = await POST(
      createRequest({ consentArtifactUrl: "not a url" }),
      {
        params: Promise.resolve({ personaId: "wife-e2e" }),
      },
    );

    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
    expect(upsertPersona).not.toHaveBeenCalled();
  });

  it("rejects successful Cartesia responses that omit a voice id", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({}, { status: 200 }));
    const { POST } = await importRoute();
    const response = await POST(createRequest(), {
      params: Promise.resolve({ personaId: "wife-e2e" }),
    });

    expect(response.status).toBe(502);
    expect(upsertPersona).not.toHaveBeenCalled();
  });

  it("clones with Cartesia bearer auth and approves the returned voice", async () => {
    const { POST } = await importRoute();
    const response = await POST(createRequest(), {
      params: Promise.resolve({ personaId: "wife-e2e" }),
    });
    const payload = (await response.json()) as { voice_id?: string };
    const cloneRequest = vi.mocked(fetch).mock.calls[0]?.[1];

    expect(response.status).toBe(200);
    expect(payload.voice_id).toBe("cartesia-voice-id");
    expect(cloneRequest?.headers).toMatchObject({
      Authorization: "Bearer cartesia-secret",
      "Cartesia-Version": "2026-03-01",
    });
    expect(upsertPersona).toHaveBeenCalledWith(
      expect.objectContaining({
        cartesia_voice_id: "cartesia-voice-id",
        source_rights_status: "authorized",
        voice_consent_status: "approved",
      }),
    );
  });
});
