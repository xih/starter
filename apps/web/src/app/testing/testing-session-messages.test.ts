import { describe, expect, it } from "vitest";

import {
  hasAgentReplyAfterPending,
  hasUnansweredLatestUserMessage,
  isPendingReplyTimedOut,
  mergeMessages,
  toAgentSideBarMessage,
  type OrderedAgentSideBarMessage,
  type PendingReplyMarker,
} from "./testing-session-messages";

function optimisticUser(
  text: string,
  overrides: Partial<OrderedAgentSideBarMessage> = {},
): OrderedAgentSideBarMessage {
  return {
    id: "local-user",
    order: 0,
    role: "user",
    source: "optimistic",
    text,
    ...overrides,
  };
}

describe("testing session message state", () => {
  it("clears the pending reply once a new LiveKit agent message arrives", () => {
    const beforeSend = [
      toAgentSideBarMessage(
        { id: "old-agent", text: "Hello before send", timestamp: 1 },
        "guest",
        0,
      ),
    ];
    const pending: PendingReplyMarker = {
      liveMessageCount: beforeSend.length,
      sentAt: Date.now(),
      startedAt: Date.now(),
      tempId: "local-user",
    };
    const afterReply = [
      ...beforeSend,
      toAgentSideBarMessage(
        {
          id: "live-user",
          text: "hello",
          timestamp: 2,
          type: "userTranscript",
        },
        "guest",
        1,
      ),
      toAgentSideBarMessage(
        { id: "agent-reply", text: "Hi, Dennis.", timestamp: 3 },
        "guest",
        2,
      ),
    ];

    expect(hasAgentReplyAfterPending(afterReply, pending)).toBe(true);
  });

  it("does not depend on epoch timestamps to decide that the agent replied", () => {
    const pending: PendingReplyMarker = {
      liveMessageCount: 0,
      sentAt: 1_721_000_000_000,
      startedAt: 1_721_000_000_000,
      tempId: "local-user",
    };
    const liveMessages = [
      toAgentSideBarMessage(
        { id: "agent-reply", text: "I can answer that.", timestamp: 4.2 },
        "guest",
        0,
      ),
    ];

    expect(hasAgentReplyAfterPending(liveMessages, pending)).toBe(true);
  });

  it("keeps pending visible when the latest user message has no later agent reply", () => {
    const messages = mergeMessages(
      [optimisticUser("hello")],
      [
        toAgentSideBarMessage(
          { id: "old-agent", text: "Earlier answer", timestamp: 1 },
          "guest",
          0,
        ),
      ],
    );

    expect(hasUnansweredLatestUserMessage(messages)).toBe(true);
  });

  it("removes optimistic duplicates when LiveKit echoes the user message", () => {
    const messages = mergeMessages(
      [optimisticUser("hello")],
      [
        toAgentSideBarMessage(
          { id: "live-user", text: "hello", type: "userTranscript" },
          "guest",
          0,
        ),
      ],
    );

    expect(messages).toHaveLength(1);
    expect(messages[0]?.id).toBe("live-user");
  });

  it("detects a pending reply timeout before the UI can stay stuck on Thinking", () => {
    expect(
      isPendingReplyTimedOut({
        now: 25_000,
        pendingReply: {
          liveMessageCount: 1,
          sentAt: 1_000,
          startedAt: 1_000,
          tempId: "temp-user",
        },
        timeoutMs: 20_000,
      }),
    ).toBe(true);
  });

  it("does not time out queued messages before they are sent to LiveKit", () => {
    expect(
      isPendingReplyTimedOut({
        now: 120_000,
        pendingReply: {
          liveMessageCount: 1,
          sentAt: null,
          startedAt: 1_000,
          tempId: "temp-user",
        },
        timeoutMs: 20_000,
      }),
    ).toBe(false);
  });
});
