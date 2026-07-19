import { describe, expect, it } from "vitest";

import {
  createPersonaSwitchRpcCall,
  createPersonaSwitchRpcPayload,
  PERSONA_TTS_SWITCH_RPC_METHOD,
} from "./persona-switch-rpc";

describe("persona switch RPC helpers", () => {
  it("builds the current TTS switch payload with future persona-scope flags", () => {
    expect(
      createPersonaSwitchRpcPayload({
        memory: true,
        personaId: "wife-e2e",
        prompt: true,
        roomName: "testing-room",
        tools: true,
        userId: "testing-user",
        voice: true,
      }),
    ).toEqual({
      memory: true,
      persona_id: "wife-e2e",
      prompt: true,
      session_id: "testing-room",
      tools: true,
      user_id: "testing-user",
      voice: true,
    });
  });

  it("defaults to a voice-only switch for the current LiveKit RPC", () => {
    const call = createPersonaSwitchRpcCall({
      agentIdentity: "agent-AJ_test",
      request: { personaId: "wife-e2e" },
      roomName: "testing-room",
      userId: "testing-user",
    });

    expect(call).toEqual({
      destinationIdentity: "agent-AJ_test",
      method: PERSONA_TTS_SWITCH_RPC_METHOD,
      payload: JSON.stringify({
        memory: false,
        persona_id: "wife-e2e",
        prompt: false,
        session_id: "testing-room",
        tools: false,
        user_id: "testing-user",
        voice: true,
      }),
      responseTimeout: 8_000,
    });
  });
});
