import type { AgentSideBarMessage } from "~/components/AgentSideBar";

export type OrderedAgentSideBarMessage = AgentSideBarMessage & {
  order: number;
  source: "live" | "optimistic";
};

export type PendingReplyMarker = {
  liveMessageCount: number;
  startedAt: number;
  tempId: string;
};

export function messageText(message: { message?: unknown; text?: unknown }) {
  const value = message.message ?? message.text;
  return typeof value === "string" ? value : "";
}

export function toAgentSideBarMessage(
  message: {
    from?: { identity?: string };
    id?: string;
    message?: unknown;
    text?: unknown;
    timestamp?: number;
    type?: string;
  },
  localIdentity: string | undefined,
  index: number,
): OrderedAgentSideBarMessage {
  const isUser =
    message.type === "userTranscript" ||
    (!!localIdentity && message.from?.identity === localIdentity);

  return {
    id: message.id ?? `${message.timestamp ?? "message"}-${index}`,
    order: index,
    role: isUser ? "user" : "agent",
    source: "live",
    text: messageText(message),
  };
}

export function mergeMessages(
  optimisticMessages: OrderedAgentSideBarMessage[],
  liveMessages: OrderedAgentSideBarMessage[],
) {
  const liveMessageKeys = new Set(
    liveMessages.map((message) => `${message.role}:${message.text}`),
  );
  const remainingOptimisticMessages = optimisticMessages.filter(
    (message) => !liveMessageKeys.has(`${message.role}:${message.text}`),
  );

  return [
    ...liveMessages,
    ...remainingOptimisticMessages.map((message, index) => ({
      ...message,
      order: liveMessages.length + index,
    })),
  ].sort((a, b) => a.order - b.order);
}

export function hasAgentReplyAfterPending(
  liveMessages: OrderedAgentSideBarMessage[],
  pendingReply: PendingReplyMarker | null,
) {
  if (!pendingReply) return false;

  return liveMessages
    .slice(pendingReply.liveMessageCount)
    .some((message) => message.role === "agent");
}

export function hasUnansweredLatestUserMessage(
  messages: OrderedAgentSideBarMessage[],
) {
  let latestUserIndex = -1;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "user") {
      latestUserIndex = index;
      break;
    }
  }

  if (latestUserIndex === -1) return false;

  return !messages
    .slice(latestUserIndex + 1)
    .some((message) => message.role === "agent");
}

export function isPendingReplyTimedOut({
  now,
  pendingReply,
  timeoutMs,
}: {
  now: number;
  pendingReply: PendingReplyMarker | null;
  timeoutMs: number;
}) {
  return pendingReply !== null && now - pendingReply.startedAt >= timeoutMs;
}
