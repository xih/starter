"use client";

import { useAgent, useSessionMessages } from "@livekit/components-react";
import type { useSession } from "@livekit/components-react";
import {
  agentControlBarLayout,
  type AgentControlBarState,
  type ChatMessageData,
} from "@starter/design-system";
import { ConnectionState } from "livekit-client";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import {
  clearMobileAskResume,
  markMobileAskResumeActive,
} from "~/app/portfolio/mobile-ask-resume";
import type {
  AgentSideBarMessage,
  AgentSideBarState,
} from "~/components/AgentSideBar";
import { useInputControls } from "~/hooks/agents-ui/use-agent-control-bar";
import {
  registerToolCallStatusRpc,
  type ToolCallStatus,
  toolCallStatusReducer,
} from "../livekit-agent/tool-call-status";
import {
  hasAgentReplyAfterPending,
  hasUnansweredLatestUserMessage,
  isPendingReplyTimedOut,
  mergeMessages,
  toAgentSideBarMessage,
  type OrderedAgentSideBarMessage,
  type PendingReplyMarker,
} from "./testing-session-messages";

const SESSION_AUTO_END_MS = 2 * 60 * 1000;
const SESSION_IDLE_END_MS = 30_000;
const AGENT_READY_TIMEOUT_MS = 45_000;
const HIDDEN_TAB_DISCONNECT_MS = 5_000;
const MIN_PENDING_REPLY_MS = 700;
const PENDING_REPLY_TIMEOUT_MS = 20_000;

export type LiveKitSessionControllerOptions = {
  agentMetadata: {
    persona_id: string;
    session_id: string;
    user_id: string;
  };
  endRequestKey: number;
  onMobileConversationChange?: (hasConversation: boolean) => void;
  onSessionEnded: () => void;
  persistMobileAskResume: boolean;
  tokenEndpoint: string;
};

export type LiveKitSessionController = ReturnType<
  typeof useLiveKitSessionController
>;

function toChatMessageData(message: AgentSideBarMessage): ChatMessageData {
  return {
    id: message.id,
    role: message.role === "user" ? "user" : "system",
    text: message.text,
  };
}

function getCompletedSources(toolCallStatus: ToolCallStatus | null) {
  return toolCallStatus?.state === "completed"
    ? (toolCallStatus.sources ?? [])
    : [];
}

function getVisibleToolCallStatus(toolCallStatus: ToolCallStatus | null) {
  return toolCallStatus?.state === "completed" ? null : toolCallStatus;
}

function stateFromSession({
  agentState,
  connectionState,
  hasInput,
  hasMessages,
  manualState,
}: {
  agentState: string;
  connectionState: ConnectionState;
  hasInput: boolean;
  hasMessages: boolean;
  manualState: AgentSideBarState;
}): AgentSideBarState {
  if (manualState === "error") return "error";
  if (hasInput) return "user-typing";
  if (connectionState === ConnectionState.Connecting) return "loading";
  if (agentState === "speaking" || agentState === "thinking") {
    return "agent-streaming";
  }
  if (connectionState === ConnectionState.Connected && !hasMessages) {
    return "begin";
  }
  if (connectionState === ConnectionState.Connected) return "idle";

  return manualState;
}

export function useLiveKitSessionController(
  session: ReturnType<typeof useSession>,
  {
    agentMetadata,
    endRequestKey,
    onMobileConversationChange,
    onSessionEnded,
    persistMobileAskResume,
    tokenEndpoint,
  }: LiveKitSessionControllerOptions,
) {
  const agent = useAgent(session);
  const sessionMessages = useSessionMessages(session);
  const { microphoneToggle } = useInputControls();
  const startAbortControllerRef = useRef<AbortController | null>(null);
  const didAutoStartRef = useRef(false);
  const didEnsureGuestDispatchRef = useRef(false);
  const didPersistMobileAskResumeRef = useRef(false);
  const didCleanupAfterErrorRef = useRef(false);
  const pendingOutboundMessagesRef = useRef<
    Array<{ tempId: string; text: string; timestamp: number }>
  >([]);
  const latestUserMessageIdRef = useRef<string | null>(null);
  const previousEndRequestKeyRef = useRef(endRequestKey);
  const [inputValue, setInputValue] = useState("");
  const [manualState, setManualState] = useState<AgentSideBarState>("intro");
  const [errorMessage, setErrorMessage] = useState(
    "Could not start the voice session. Check microphone permission, token endpoint, and LiveKit agent configuration.",
  );
  const [toolCallStatus, dispatchToolCallStatus] = useReducer(
    toolCallStatusReducer,
    null,
  );
  const [optimisticMessages, setOptimisticMessages] = useState<
    OrderedAgentSideBarMessage[]
  >([]);
  const [pendingReply, setPendingReply] = useState<PendingReplyMarker | null>(
    null,
  );
  const liveMessages = sessionMessages.messages
    .map((message, index) =>
      toAgentSideBarMessage(
        message,
        session.room?.localParticipant?.identity,
        index,
      ),
    )
    .filter((message) => message.text.length > 0);
  const messages = mergeMessages(optimisticMessages, liveMessages);
  const hasAgentMessageAfterPending = hasAgentReplyAfterPending(
    liveMessages,
    pendingReply,
  );
  const latestUserMessage = messages
    .filter((message) => message.role === "user")
    .at(-1);
  const hasUnansweredUserMessage = hasUnansweredLatestUserMessage(messages);
  const showPendingReply =
    manualState !== "error" &&
    ((pendingReply !== null && !hasAgentMessageAfterPending) ||
      hasUnansweredUserMessage);
  const hasMobileConversation =
    messages.length > 0 || showPendingReply || agent.state === "thinking";
  const latestUserMessageId = latestUserMessage?.id ?? null;
  const state = stateFromSession({
    agentState: agent.state,
    connectionState: session.connectionState,
    hasInput: inputValue.trim().length > 0,
    hasMessages: messages.length > 0,
    manualState,
  });
  const isConnected = session.connectionState === ConnectionState.Connected;
  const isConnecting = session.connectionState === ConnectionState.Connecting;
  const canSendLiveMessage = isConnected && agent.state === "listening";
  const mobileControlState: AgentControlBarState =
    state === "user-typing"
      ? "user-typing"
      : state === "agent-streaming" || isConnecting
        ? "agent-streaming"
        : "default";
  const hasStartupError = state === "error";
  const mobileOrbSize = isConnecting
    ? agentControlBarLayout.mobileConnectingOrbSize
    : agentControlBarLayout.mobileOrbSize;
  const completedSources = getCompletedSources(toolCallStatus);
  const visibleToolCallStatus = getVisibleToolCallStatus(toolCallStatus);
  const isAgentReady =
    agent.state === "listening" ||
    agent.state === "speaking" ||
    agent.state === "thinking";

  const cleanupLiveKitSession = useCallback(async () => {
    const sessionEndResult = await Promise.allSettled([session.end()]);
    const deleteResult = await Promise.allSettled([
      fetch("/api/livekit/guest-session", {
        method: "DELETE",
        keepalive: true,
      }),
    ]);

    for (const result of [...sessionEndResult, ...deleteResult]) {
      if (result.status === "rejected") {
        console.error("Testing LiveKit session cleanup failed", result.reason);
      }
    }
  }, [session]);

  const cleanupAfterError = useCallback(
    (message: string) => {
      if (didCleanupAfterErrorRef.current) return;

      didCleanupAfterErrorRef.current = true;
      setErrorMessage(message);
      setManualState("error");
      pendingOutboundMessagesRef.current = [];
      startAbortControllerRef.current?.abort();
      startAbortControllerRef.current = null;
      void cleanupLiveKitSession();
    },
    [cleanupLiveKitSession],
  );

  const sendLiveMessage = useCallback(
    async ({
      tempId,
      text,
      timestamp,
    }: {
      tempId: string;
      text: string;
      timestamp: number;
    }) => {
      try {
        const sentAt = Date.now();
        setPendingReply((currentPendingReply) =>
          currentPendingReply?.tempId === tempId
            ? { ...currentPendingReply, sentAt }
            : currentPendingReply,
        );
        await sessionMessages.send(text);
      } catch (error) {
        console.error("Testing message send failed", error);
        const pendingElapsedMs = Date.now() - timestamp;
        if (pendingElapsedMs < MIN_PENDING_REPLY_MS) {
          await new Promise((resolve) =>
            setTimeout(resolve, MIN_PENDING_REPLY_MS - pendingElapsedMs),
          );
        }
        setPendingReply(null);
        setOptimisticMessages((currentMessages) =>
          currentMessages.filter(
            (currentMessage) => currentMessage.id !== tempId,
          ),
        );
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Could not send that message. Check the LiveKit session and try again.",
        );
        setManualState("error");
        setInputValue(text);
      }
    },
    [sessionMessages],
  );

  const sendMessage = useCallback(
    async (message: string) => {
      const trimmedMessage = message.trim();

      if (!trimmedMessage) return;

      const timestamp = Date.now();
      const tempId = `local-user-${timestamp}`;

      dispatchToolCallStatus({ type: "reset" });
      setInputValue("");
      setPendingReply({
        liveMessageCount: liveMessages.length,
        sentAt: null,
        startedAt: timestamp,
        tempId,
      });
      setOptimisticMessages((currentMessages) => [
        ...currentMessages,
        {
          id: tempId,
          order: timestamp,
          role: "user",
          source: "optimistic",
          text: trimmedMessage,
        },
      ]);

      const outboundMessage = {
        tempId,
        text: trimmedMessage,
        timestamp,
      };

      if (!canSendLiveMessage) {
        pendingOutboundMessagesRef.current.push(outboundMessage);
        return;
      }

      await sendLiveMessage(outboundMessage);
    },
    [canSendLiveMessage, liveMessages.length, sendLiveMessage],
  );

  const startSession = useCallback(() => {
    startAbortControllerRef.current?.abort();
    const startAbortController = new AbortController();
    startAbortControllerRef.current = startAbortController;

    setErrorMessage(
      "Connecting to LiveKit. If this fails, check the endpoint and browser console.",
    );
    setManualState("loading");
    didCleanupAfterErrorRef.current = false;
    void (async () => {
      try {
        const preflightErrorMessage = await getTokenEndpointPreflightError(
          tokenEndpoint,
          startAbortController.signal,
        );

        if (preflightErrorMessage) {
          setErrorMessage(preflightErrorMessage);
          setManualState("error");
          return;
        }

        await session.start({
          tracks: {
            camera: { enabled: false },
            microphone: { enabled: true },
            screenShare: { enabled: false },
          },
          signal: startAbortController.signal,
        });
      } catch (error) {
        if (startAbortController.signal.aborted) return;

        console.error("Testing LiveKit session start failed", error);
        setErrorMessage(getLiveKitStartupErrorMessage(error));
        setManualState("error");
      } finally {
        if (startAbortControllerRef.current === startAbortController) {
          startAbortControllerRef.current = null;
        }
      }
    })();
  }, [session, tokenEndpoint]);

  const endSession = useCallback(() => {
    if (persistMobileAskResume) {
      clearMobileAskResume();
    }

    setInputValue("");
    setPendingReply(null);
    setManualState("intro");
    pendingOutboundMessagesRef.current = [];
    dispatchToolCallStatus({ type: "reset" });
    startAbortControllerRef.current?.abort();
    startAbortControllerRef.current = null;

    void (async () => {
      await cleanupLiveKitSession();
      onSessionEnded();
    })();
  }, [cleanupLiveKitSession, onSessionEnded, persistMobileAskResume]);

  useEffect(() => {
    if (session.connectionState !== ConnectionState.Connected) return;

    if (persistMobileAskResume) {
      markMobileAskResumeActive();
      didPersistMobileAskResumeRef.current = true;
    }

    const handlePageHide = () => {
      if (persistMobileAskResume) {
        clearMobileAskResume();
      }

      startAbortControllerRef.current?.abort();

      void cleanupLiveKitSession();
    };

    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [cleanupLiveKitSession, persistMobileAskResume, session.connectionState]);

  useEffect(() => {
    if (!persistMobileAskResume) return;
    if (session.connectionState === ConnectionState.Connected) return;
    if (!didPersistMobileAskResumeRef.current) return;

    clearMobileAskResume();
    didPersistMobileAskResumeRef.current = false;
  }, [persistMobileAskResume, session.connectionState]);

  useEffect(() => {
    if (previousEndRequestKeyRef.current === endRequestKey) {
      return;
    }

    previousEndRequestKeyRef.current = endRequestKey;
    endSession();
  }, [endRequestKey, endSession]);

  useEffect(() => {
    if (didAutoStartRef.current) return;
    didAutoStartRef.current = true;
    startSession();
  }, [startSession]);

  useEffect(() => {
    if (!canSendLiveMessage) return;
    if (pendingOutboundMessagesRef.current.length === 0) return;

    const messagesToSend = pendingOutboundMessagesRef.current;
    pendingOutboundMessagesRef.current = [];

    for (const outboundMessage of messagesToSend) {
      void sendLiveMessage(outboundMessage);
    }
  }, [canSendLiveMessage, sendLiveMessage]);

  useEffect(() => {
    if (!tokenEndpoint.includes("/api/livekit/guest-session")) return;

    if (session.connectionState !== ConnectionState.Connected) {
      didEnsureGuestDispatchRef.current = false;
      return;
    }

    if (didEnsureGuestDispatchRef.current) return;
    didEnsureGuestDispatchRef.current = true;

    void fetch(tokenEndpoint, {
      body: JSON.stringify({
        ensure_dispatch: true,
        persona_id: agentMetadata.persona_id,
        room_config: {
          agents: [{ agent_metadata: JSON.stringify(agentMetadata) }],
        },
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    })
      .then(async (response) => {
        if (response.ok) return;

        const body = await response.text().catch(() => "");
        throw new Error(
          `received ${response.status}${body ? ` / ${body}` : ""}`,
        );
      })
      .catch((error) => {
        didEnsureGuestDispatchRef.current = false;
        const message =
          error instanceof Error
            ? error.message
            : "Unknown LiveKit dispatch error";
        cleanupAfterError(`Could not dispatch the portfolio agent: ${message}`);
        console.error("Testing LiveKit guest dispatch ensure failed", error);
      });
  }, [
    agentMetadata,
    cleanupAfterError,
    session.connectionState,
    tokenEndpoint,
  ]);

  useEffect(() => {
    if (session.connectionState !== ConnectionState.Connected) return;

    const timeoutId = window.setTimeout(() => {
      setErrorMessage("Voice session ended after 2 minutes.");
      endSession();
    }, SESSION_AUTO_END_MS);

    return () => window.clearTimeout(timeoutId);
  }, [endSession, session.connectionState]);

  useEffect(() => {
    if (session.connectionState !== ConnectionState.Connected) return;
    if (!isAgentReady) return;
    if (messages.length > 0 || pendingReply || inputValue.trim().length > 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      cleanupAfterError(
        "Voice session ended because it was idle. Start again when you are ready to ask.",
      );
    }, SESSION_IDLE_END_MS);

    return () => window.clearTimeout(timeoutId);
  }, [
    cleanupAfterError,
    inputValue,
    isAgentReady,
    messages.length,
    pendingReply,
    session.connectionState,
  ]);

  useEffect(() => {
    if (session.connectionState !== ConnectionState.Connected) return;
    if (isAgentReady) return;

    const timeoutId = window.setTimeout(() => {
      cleanupAfterError(
        "The voice agent did not become ready in time. The room was closed to avoid using extra LiveKit minutes.",
      );
    }, AGENT_READY_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [cleanupAfterError, isAgentReady, session.connectionState]);

  useEffect(() => {
    if (session.connectionState !== ConnectionState.Connected) return;

    let disconnectTimeoutId: number | null = null;
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (disconnectTimeoutId !== null) {
          window.clearTimeout(disconnectTimeoutId);
          disconnectTimeoutId = null;
        }
        return;
      }

      disconnectTimeoutId = window.setTimeout(() => {
        cleanupAfterError(
          "Voice session ended because the tab was hidden. Start again when you are ready.",
        );
      }, HIDDEN_TAB_DISCONNECT_MS);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    handleVisibilityChange();

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (disconnectTimeoutId !== null) {
        window.clearTimeout(disconnectTimeoutId);
      }
    };
  }, [cleanupAfterError, session.connectionState]);

  useEffect(() => {
    if (!session.room) return;

    return registerToolCallStatusRpc(session.room, dispatchToolCallStatus);
  }, [session.room, session.room?.localParticipant]);

  useEffect(() => {
    onMobileConversationChange?.(hasMobileConversation);
  }, [hasMobileConversation, onMobileConversationChange]);

  useEffect(() => {
    if (hasAgentMessageAfterPending) {
      setPendingReply(null);
      if (pendingReply?.tempId) {
        setOptimisticMessages((currentMessages) =>
          currentMessages.filter(
            (message) => message.id !== pendingReply.tempId,
          ),
        );
      }
    }
  }, [cleanupLiveKitSession, hasAgentMessageAfterPending, pendingReply]);

  useEffect(() => {
    if (!pendingReply || hasAgentMessageAfterPending) return;

    const remainingMs = Math.max(
      pendingReply.sentAt === null
        ? PENDING_REPLY_TIMEOUT_MS
        : PENDING_REPLY_TIMEOUT_MS - (Date.now() - pendingReply.sentAt),
      0,
    );
    const timeoutId = window.setTimeout(() => {
      if (
        !isPendingReplyTimedOut({
          now: Date.now(),
          pendingReply,
          timeoutMs: PENDING_REPLY_TIMEOUT_MS,
        })
      ) {
        return;
      }

      setPendingReply(null);
      setManualState("error");
      setErrorMessage(
        "The agent joined but did not respond in time. The room was closed to avoid using extra LiveKit minutes.",
      );
      void cleanupLiveKitSession();
    }, remainingMs);

    return () => window.clearTimeout(timeoutId);
  }, [cleanupLiveKitSession, hasAgentMessageAfterPending, pendingReply]);

  useEffect(() => {
    if (latestUserMessageIdRef.current === latestUserMessageId) {
      return;
    }

    latestUserMessageIdRef.current = latestUserMessageId;
    dispatchToolCallStatus({ type: "reset" });
  }, [latestUserMessageId]);

  return {
    agent,
    chatMessages: messages.map(toChatMessageData),
    completedSources,
    connectionState: session.connectionState,
    endSession,
    errorMessage,
    hasStartupError,
    inputValue,
    isConnected,
    isConnecting,
    isMicrophoneEnabled: microphoneToggle.enabled,
    isSending: sessionMessages.isSending,
    messages,
    mobileControlState,
    mobileOrbSize,
    room: session.room,
    sendMessage,
    setInputValue,
    showDesktopThinking: showPendingReply && messages.at(-1)?.role !== "agent",
    showPendingReply,
    startSession,
    state,
    toggleMicrophone: () => {
      void microphoneToggle.toggle(!microphoneToggle.enabled);
    },
    visibleToolCallStatus,
  };
}

function getLiveKitStartupErrorMessage(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  if (
    message.includes("LIVEKIT_URL") ||
    message.includes("LIVEKIT_API_KEY") ||
    message.includes("LIVEKIT_API_SECRET")
  ) {
    return "Voice is not configured for this environment yet. Add the LiveKit URL, API key, and API secret to enable the portfolio agent.";
  }

  if (
    message.includes("Upstash Redis") ||
    message.includes("LIVEKIT_GUEST_RATE_LIMIT_SALT")
  ) {
    return "Guest voice sessions are not configured for this environment yet. Add the guest session Redis settings to enable the portfolio agent.";
  }

  return message || "LiveKit session start failed.";
}

async function getTokenEndpointPreflightError(
  tokenEndpoint: string,
  signal: AbortSignal,
) {
  if (!tokenEndpoint.includes("/api/livekit/guest-session")) {
    return null;
  }

  const response = await fetch(tokenEndpoint, {
    method: "GET",
    signal,
  });

  if (response.ok) {
    return null;
  }

  let errorMessage = "";

  try {
    const body = (await response.json()) as { error?: unknown };
    errorMessage = typeof body.error === "string" ? body.error : "";
  } catch {
    errorMessage = await response.text().catch(() => "");
  }

  return getLiveKitStartupErrorMessage(errorMessage);
}
