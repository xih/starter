import { describe, expect, it } from "vitest";

import { resolveTestingClientUrlConfig } from "./testing-client";

describe("resolveTestingClientUrlConfig", () => {
  it("keeps safe URL presets and ignores URL-supplied room names", () => {
    const config = resolveTestingClientUrlConfig(
      "?agentName=qa-agent&tokenEndpoint=/api/livekit/token&roomName=my-test-room",
    );

    expect(config.agentName).toBe("qa-agent");
    expect(config.tokenEndpoint).toBe("/api/livekit/token");
    expect(config.roomName).toMatch(/^testing_agent_/);
    expect(config.roomName).not.toBe("my-test-room");
  });

  it("falls back to the guest session endpoint for unsafe token endpoint URLs", () => {
    const config = resolveTestingClientUrlConfig(
      "?tokenEndpoint=https://attacker.invalid/api/livekit/token",
    );

    expect(config.tokenEndpoint).toBe("/api/livekit/guest-session");
  });
});
