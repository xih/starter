import { describe, expect, it, vi } from "vitest";

import {
  createToolCallStatusRpcHandler,
  registerToolCallStatusRpc,
  type ToolCallStatusAction,
} from "./tool-call-status";

describe("createToolCallStatusRpcHandler", () => {
  it("dispatches a running status from agent RPC payload", async () => {
    const actions: ToolCallStatusAction[] = [];
    const handler = createToolCallStatusRpcHandler((action) => {
      actions.push(action);
    });

    const response = await handler({
      payload: JSON.stringify({
        provider: "parallel",
        state: "running",
        summary: "Comparing current search provider pricing",
      }),
    });

    expect(response).toBe("ok");
    expect(actions).toEqual([
      {
        provider: "parallel",
        summary: "Comparing current search provider pricing",
        type: "started",
      },
    ]);
  });

  it("dispatches completion from agent RPC payload", async () => {
    const dispatch = vi.fn();
    const handler = createToolCallStatusRpcHandler(dispatch);

    await handler({
      payload: JSON.stringify({ state: "completed" }),
    });

    expect(dispatch).toHaveBeenCalledWith({ type: "completed" });
  });

  it("dispatches completed sources from agent RPC payload", async () => {
    const actions: ToolCallStatusAction[] = [];
    const handler = createToolCallStatusRpcHandler((action) => {
      actions.push(action);
    });

    const response = await handler({
      payload: JSON.stringify({
        provider: "parallel",
        sources: [
          {
            description: "Argentina beat England 2-1.",
            provider: "parallel",
            published_at: "2026-07-15",
            title: "Argentina beats England",
            url: "https://example.com/argentina-england",
          },
        ],
        state: "completed",
        summary: "Find today's Argentina England match result",
      }),
    });

    expect(response).toBe("ok");
    expect(actions).toEqual([
      {
        provider: "parallel",
        sources: [
          {
            description: "Argentina beat England 2-1.",
            provider: "parallel",
            publishedAt: "2026-07-15",
            title: "Argentina beats England",
            url: "https://example.com/argentina-england",
          },
        ],
        summary: "Find today's Argentina England match result",
        type: "completed",
      },
    ]);
  });

  it("rejects malformed RPC payloads without dispatching secrets", async () => {
    const dispatch = vi.fn();
    const handler = createToolCallStatusRpcHandler(dispatch);

    const response = await handler({
      payload: JSON.stringify({
        apiKey: "parallel-secret",
        state: "running",
      }),
    });

    expect(response).toBe("invalid");
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("rejects invalid JSON without throwing", async () => {
    const dispatch = vi.fn();
    const handler = createToolCallStatusRpcHandler(dispatch);

    const response = await handler({
      payload: "{bad json",
    });

    expect(response).toBe("invalid");
    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe("registerToolCallStatusRpc", () => {
  it("registers and unregisters the browser RPC method on the LiveKit room", () => {
    const registered: Record<string, unknown> = {};
    const room = {
      localParticipant: {
        registerRpcMethod: vi.fn((method: string, handler: unknown) => {
          registered[method] = handler;
        }),
        unregisterRpcMethod: vi.fn(),
      },
    };

    const unregister = registerToolCallStatusRpc(room, vi.fn());

    expect(room.localParticipant.registerRpcMethod).toHaveBeenCalledWith(
      "livekit_agent_tool_status",
      expect.any(Function),
    );
    expect(registered.livekit_agent_tool_status).toEqual(expect.any(Function));

    unregister();

    expect(room.localParticipant.unregisterRpcMethod).toHaveBeenCalledWith(
      "livekit_agent_tool_status",
    );
  });
});
