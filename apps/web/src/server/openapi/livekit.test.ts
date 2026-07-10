import { describe, expect, it } from "vitest";

import { liveKitOpenApiSpec } from "./livekit";

describe("LiveKit OpenAPI spec", () => {
  it("documents the public guest, QStash expire, and protected admin routes", () => {
    expect(liveKitOpenApiSpec.openapi).toBe("3.1.0");
    expect(liveKitOpenApiSpec.paths).toHaveProperty(
      "/api/livekit/guest-session",
    );
    expect(liveKitOpenApiSpec.paths).toHaveProperty(
      "/api/livekit/guest-session/expire",
    );
    expect(liveKitOpenApiSpec.paths).toHaveProperty("/api/livekit/token");
  });

  it("marks guest session fields and QStash auth correctly", () => {
    const guestResponse =
      liveKitOpenApiSpec.components.schemas.GuestSessionTokenResponse;
    const expireRoute =
      liveKitOpenApiSpec.paths["/api/livekit/guest-session/expire"].post;

    expect(guestResponse.required).toContain("participant_token");
    expect(guestResponse.required).toContain("expires_at");
    expect(expireRoute.security).toEqual([{ qstashSignature: [] }]);
  });
});
