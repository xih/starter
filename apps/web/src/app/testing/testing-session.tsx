"use client";

import {
  RoomAudioRenderer,
  SessionProvider,
  useAgent,
  useSession,
  useSessionMessages,
} from "@livekit/components-react";
import {
  AgentControlBar as DesignAgentControlBar,
  ChatMessage as DesignChatMessage,
  ChatMessageWithSources,
  VoiceParameterPanel,
  agentControlBarLayout,
  type ChatMessageData,
  type VoiceOption,
} from "@starter/design-system";
import { AnimatePresence, motion } from "framer-motion";
import { ConnectionState, TokenSource } from "livekit-client";
import { Loader2, Mic, Play, Square, Wifi, WifiOff } from "lucide-react";
import {
  useEffect,
  useCallback,
  useMemo,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import {
  AgentSideBar,
  type AgentSideBarMessage,
  type AgentSideBarState,
} from "~/components/AgentSideBar";
import { Button } from "~/components/ui/button";
import { OrbShader } from "~/components/OrbShader";
import { useInputControls } from "~/hooks/agents-ui/use-agent-control-bar";
import { cn } from "~/lib/utils";
import {
  registerToolCallStatusRpc,
  ToolCallStatusPanel,
  type ToolCallStatus,
  toolCallStatusReducer,
} from "../livekit-agent/tool-call-status";

const DEFAULT_MOBILE_VOICE: VoiceOption = {
  avatar: "/agent-sidebar/avatar-1.png",
  description: "Softbank founder",
  name: "Masa Son",
};

type OrderedAgentSideBarMessage = AgentSideBarMessage & {
  order: number;
  source: "live" | "optimistic";
};

function messageText(message: { message?: unknown; text?: unknown }) {
  const value = message.message ?? message.text;
  return typeof value === "string" ? value : "";
}

function toAgentSideBarMessage(
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
  const rawTimestamp =
    typeof message.timestamp === "number" ? message.timestamp : Date.now();
  const timestamp =
    rawTimestamp < 1_000_000_000_000 ? rawTimestamp * 1000 : rawTimestamp;

  return {
    id: message.id ?? `${message.timestamp ?? "message"}-${index}`,
    order: timestamp + index / 1000,
    role: isUser ? "user" : "agent",
    source: "live",
    text: messageText(message),
  };
}

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

function mergeMessages(
  optimisticMessages: OrderedAgentSideBarMessage[],
  liveMessages: OrderedAgentSideBarMessage[],
) {
  const liveMessagesByText = new Map<string, OrderedAgentSideBarMessage[]>();

  for (const message of liveMessages) {
    const key = `${message.role}:${message.text}`;
    const currentMessages = liveMessagesByText.get(key) ?? [];
    currentMessages.push(message);
    liveMessagesByText.set(key, currentMessages);
  }

  return [...optimisticMessages, ...liveMessages]
    .filter((message) => {
      if (message.source !== "optimistic") return true;

      const key = `${message.role}:${message.text}`;
      const matchingLiveMessage = liveMessagesByText
        .get(key)
        ?.some(
          (liveMessage) => Math.abs(liveMessage.order - message.order) < 30_000,
        );

      return !matchingLiveMessage;
    })
    .sort((a, b) => a.order - b.order);
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

function StatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-medium",
        tone === "neutral" && "border-border bg-background text-foreground",
        tone === "good" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        tone === "warn" && "border-amber-200 bg-amber-50 text-amber-800",
        tone === "bad" && "border-red-200 bg-red-50 text-red-700",
      )}
    >
      {children}
    </span>
  );
}

export type TestingSessionProps = {
  agentName: string;
  onSessionEnded: () => void;
  roomName: string;
  tokenEndpoint: string;
};

export function TestingSession({
  agentName,
  onSessionEnded,
  roomName,
  tokenEndpoint,
}: TestingSessionProps) {
  const [inputValue, setInputValue] = useState("");
  const [manualState, setManualState] = useState<AgentSideBarState>("intro");
  const [errorMessage, setErrorMessage] = useState(
    "Could not start the voice session. Check microphone permission, token endpoint, and LiveKit agent configuration.",
  );
  const tokenSource = useMemo(
    () => TokenSource.endpoint(tokenEndpoint),
    [tokenEndpoint],
  );
  const session = useSession(tokenSource, {
    agentName,
    participantName: "Testing Guest",
    roomName,
  });

  return (
    <SessionProvider session={session}>
      <TestingSessionContent
        agentName={agentName}
        errorMessage={errorMessage}
        inputValue={inputValue}
        manualState={manualState}
        onSessionEnded={onSessionEnded}
        roomName={roomName}
        session={session}
        setErrorMessage={setErrorMessage}
        setInputValue={setInputValue}
        setManualState={setManualState}
        tokenEndpoint={tokenEndpoint}
      />
      <RoomAudioRenderer />
    </SessionProvider>
  );
}

function TestingSessionContent({
  agentName,
  errorMessage,
  inputValue,
  manualState,
  onSessionEnded,
  roomName,
  session,
  setErrorMessage,
  setInputValue,
  setManualState,
  tokenEndpoint,
}: {
  agentName: string;
  errorMessage: string;
  inputValue: string;
  manualState: AgentSideBarState;
  onSessionEnded: () => void;
  roomName: string;
  session: ReturnType<typeof useSession>;
  setErrorMessage: (message: string) => void;
  setInputValue: (value: string) => void;
  setManualState: (state: AgentSideBarState) => void;
  tokenEndpoint: string;
}) {
  const agent = useAgent(session);
  const sessionMessages = useSessionMessages(session);
  const { microphoneToggle } = useInputControls();
  const startAbortControllerRef = useRef<AbortController | null>(null);
  const didAutoStartRef = useRef(false);
  const [toolCallStatus, dispatchToolCallStatus] = useReducer(
    toolCallStatusReducer,
    null,
  );
  const completedSources = getCompletedSources(toolCallStatus);
  const visibleToolCallStatus = getVisibleToolCallStatus(toolCallStatus);
  const [optimisticMessages, setOptimisticMessages] = useState<
    OrderedAgentSideBarMessage[]
  >([]);
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
  const latestUserMessageId =
    messages.filter((message) => message.role === "user").at(-1)?.id ?? null;
  const latestUserMessageIdRef = useRef<string | null>(latestUserMessageId);
  const state = stateFromSession({
    agentState: agent.state,
    connectionState: session.connectionState,
    hasInput: inputValue.trim().length > 0,
    hasMessages: messages.length > 0,
    manualState,
  });
  const isConnected = session.connectionState === ConnectionState.Connected;
  const isConnecting = session.connectionState === ConnectionState.Connecting;
  const statusTone = isConnected ? "good" : isConnecting ? "warn" : "neutral";
  const mobileControlState =
    state === "user-typing"
      ? "user-typing"
      : state === "agent-streaming" || isConnecting
        ? "agent-streaming"
        : "default";
  const hasStartupError = state === "error";
  const mobileOrbSize = isConnecting
    ? agentControlBarLayout.mobileConnectingOrbSize
    : agentControlBarLayout.mobileOrbSize;
  const sendMessage = useCallback(
    async (message: string) => {
      const trimmedMessage = message.trim();

      if (!trimmedMessage) return;

      const timestamp = Date.now();
      const tempId = `local-user-${timestamp}`;

      dispatchToolCallStatus({ type: "reset" });
      setInputValue("");
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

      try {
        await sessionMessages.send(trimmedMessage);
      } catch (error) {
        console.error("Testing message send failed", error);
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
        setInputValue(trimmedMessage);
      }
    },
    [sessionMessages, setErrorMessage, setInputValue, setManualState],
  );

  const startSession = useCallback(() => {
    startAbortControllerRef.current?.abort();
    const startAbortController = new AbortController();
    startAbortControllerRef.current = startAbortController;

    setErrorMessage(
      "Connecting to LiveKit. If this fails, check the endpoint and browser console.",
    );
    setManualState("loading");
    void session
      .start({
        tracks: {
          camera: { enabled: false },
          microphone: { enabled: true },
          screenShare: { enabled: false },
        },
        signal: startAbortController.signal,
      })
      .catch((error) => {
        if (startAbortController.signal.aborted) return;

        console.error("Testing LiveKit session start failed", error);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "LiveKit session start failed.",
        );
        setManualState("error");
      })
      .finally(() => {
        if (startAbortControllerRef.current === startAbortController) {
          startAbortControllerRef.current = null;
        }
      });
  }, [session, setErrorMessage, setManualState]);

  const endSession = useCallback(() => {
    setInputValue("");
    setManualState("intro");
    dispatchToolCallStatus({ type: "reset" });
    startAbortControllerRef.current?.abort();
    startAbortControllerRef.current = null;

    void (async () => {
      const sessionEndResult = await Promise.allSettled([session.end()]);

      const deleteResult = await Promise.allSettled([
        fetch("/api/livekit/guest-session", {
          method: "DELETE",
          keepalive: true,
        }),
      ]);

      for (const result of [...sessionEndResult, ...deleteResult]) {
        if (result.status === "rejected") {
          console.error(
            "Testing LiveKit session cleanup failed",
            result.reason,
          );
        }
      }

      onSessionEnded();
    })();
  }, [onSessionEnded, session, setInputValue, setManualState]);

  useEffect(() => {
    if (didAutoStartRef.current) return;
    didAutoStartRef.current = true;
    startSession();
  }, [startSession]);

  useEffect(() => {
    if (!session.room) return;

    return registerToolCallStatusRpc(session.room, dispatchToolCallStatus);
  }, [session.room, session.room?.localParticipant]);

  useEffect(() => {
    if (latestUserMessageIdRef.current === latestUserMessageId) {
      return;
    }

    latestUserMessageIdRef.current = latestUserMessageId;
    dispatchToolCallStatus({ type: "reset" });
  }, [latestUserMessageId]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 px-[14px] py-0 md:px-6 md:py-4">
      <header className="hidden flex-wrap items-center justify-between gap-3 border-b border-border pb-4 md:flex">
        <div>
          <h1 className="text-xl font-semibold tracking-normal">/testing</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live AgentSideBar on web, compact voice controls on mobile.
          </p>
        </div>
        <StatusPill tone={statusTone}>
          {isConnected ? (
            <Wifi className="size-3.5" />
          ) : (
            <WifiOff className="size-3.5" />
          )}
          {session.connectionState}
        </StatusPill>
      </header>
      <ToolCallStatusPanel
        className="md:hidden"
        status={visibleToolCallStatus}
      />

      <section className="grid gap-4 md:grid-cols-[minmax(0,1fr)_402px]">
        <div className="hidden min-h-[420px] flex-col border border-border bg-background p-4 md:flex">
          <div className="grid gap-3 border-b border-border pb-4 text-sm md:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Agent</p>
              <p className="font-medium">{agentName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Agent state</p>
              <p className="font-medium">{agent.state}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Room</p>
              <p className="break-all font-medium">{roomName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Token endpoint</p>
              <p className="break-all font-medium">{tokenEndpoint}</p>
            </div>
          </div>
          <ToolCallStatusPanel
            className="mt-3"
            status={visibleToolCallStatus}
          />

          <div className="flex flex-1 flex-col justify-center gap-4 py-6">
            <div className="mx-auto flex size-40 items-center justify-center rounded-full border border-border bg-muted text-center">
              <div>
                <p className="text-sm font-medium">{agent.state}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isConnected ? "Ask a spoken question." : "Ready to start."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                onClick={startSession}
                disabled={
                  session.connectionState !== ConnectionState.Disconnected
                }
              >
                {isConnecting ? <Loader2 className="animate-spin" /> : <Play />}
                Start
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={endSession}
                disabled={
                  session.connectionState === ConnectionState.Disconnected
                }
              >
                <Square />
                End
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void microphoneToggle.toggle(!microphoneToggle.enabled);
                }}
                disabled={!isConnected}
              >
                <Mic />
                {microphoneToggle.enabled ? "Mic on" : "Mic off"}
              </Button>
            </div>
          </div>
        </div>

        <MobileAgentControlSurface
          agentState={agent.state}
          controlState={mobileControlState}
          errorMessage={errorMessage}
          hasStartupError={hasStartupError}
          inputValue={inputValue}
          isMicrophoneEnabled={microphoneToggle.enabled}
          messages={messages.map(toChatMessageData)}
          latestSearchSources={completedSources}
          onChangeInput={setInputValue}
          orbSize={mobileOrbSize}
          onEnd={endSession}
          onRetry={startSession}
          onSend={sendMessage}
          onStopResponse={endSession}
          onToggleMicrophone={() => {
            void microphoneToggle.toggle(!microphoneToggle.enabled);
          }}
        />

        <div className="hidden md:block">
          <AgentSideBar
            errorMessage={errorMessage}
            inputValue={inputValue}
            isMicrophoneEnabled={microphoneToggle.enabled}
            isSending={sessionMessages.isSending}
            latestSearchSources={completedSources}
            messages={messages}
            onChangeInput={setInputValue}
            onEnd={endSession}
            onSend={sendMessage}
            onStart={startSession}
            onStopResponse={endSession}
            onToggleMicrophone={() => {
              void microphoneToggle.toggle(!microphoneToggle.enabled);
            }}
            state={state}
            voiceName="Portfolio Agent"
          />
        </div>
      </section>
    </div>
  );
}

function MobileAgentControlSurface({
  agentState,
  controlState,
  errorMessage,
  hasStartupError,
  inputValue,
  isMicrophoneEnabled,
  messages,
  latestSearchSources,
  onChangeInput,
  onEnd,
  onRetry,
  onSend,
  onStopResponse,
  onToggleMicrophone,
  orbSize,
}: {
  agentState: string;
  controlState: "default" | "user-typing" | "agent-streaming";
  errorMessage: string;
  hasStartupError: boolean;
  inputValue: string;
  isMicrophoneEnabled: boolean;
  messages: ChatMessageData[];
  latestSearchSources: ToolCallStatus["sources"];
  onChangeInput: (value: string) => void;
  onEnd: () => void;
  onRetry: () => void;
  onSend: (value: string) => void | Promise<void>;
  onStopResponse: () => void | Promise<void>;
  onToggleMicrophone: () => void | Promise<void>;
  orbSize: number;
}) {
  const [isVoicePanelOpen, setIsVoicePanelOpen] = useState(false);
  const [voice, setVoice] = useState<VoiceOption>(DEFAULT_MOBILE_VOICE);
  const toggleVoicePanel = () => setIsVoicePanelOpen((open) => !open);
  const controlStackHeight = isVoicePanelOpen
    ? "var(--ds-agent-control-mobile-open-stack-height)"
    : "var(--ds-agent-control-bar-height)";
  const orbStyle = {
    "--mobile-orb-bottom": `calc(${controlStackHeight} + var(--ds-agent-mobile-orb-gap))`,
    "--mobile-orb-size": `${orbSize}px`,
    "--mobile-transcript-bottom": `calc(var(--mobile-orb-bottom) + var(--mobile-orb-size) + var(--ds-agent-mobile-transcript-gap))`,
  } as CSSProperties;

  return (
    <div className="relative min-h-svh md:hidden" style={orbStyle}>
      <MobileChatTranscript
        agentState={agentState}
        messages={messages}
        latestSearchSources={latestSearchSources ?? []}
      />
      {hasStartupError ? (
        <MobileStartupError
          errorMessage={errorMessage}
          onEnd={onEnd}
          onRetry={onRetry}
        />
      ) : (
        <OrbShader
          className={cn(
            "absolute bottom-[var(--mobile-orb-bottom)] left-1/2 -translate-x-1/2 transition-[bottom] duration-300 ease-out",
          )}
          size={orbSize}
          state={controlState === "agent-streaming" ? "thinking" : "loading"}
        />
      )}
      <div className="absolute bottom-0 left-0 right-0 flex flex-col gap-[8px]">
        <AnimatePresence initial={false}>
          {isVoicePanelOpen ? (
            <motion.div
              animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
              exit={{ filter: "blur(4px)", opacity: 0, y: 8 }}
              initial={{ filter: "blur(4px)", opacity: 0, y: 8 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              <VoiceParameterPanel
                className="w-full"
                onSelectVoice={(nextVoice) => {
                  setVoice(nextVoice);
                  setIsVoicePanelOpen(false);
                }}
                selectedVoiceName={voice.name}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
        <DesignAgentControlBar
          className="w-full"
          inputValue={inputValue}
          isMicrophoneEnabled={isMicrophoneEnabled}
          onChangeInput={onChangeInput}
          onEnd={onEnd}
          onOpenVoicePanel={toggleVoicePanel}
          onSend={onSend}
          onStopResponse={onStopResponse}
          onToggleMicrophone={onToggleMicrophone}
          state={controlState}
          voice={voice}
        />
      </div>
    </div>
  );
}

function MobileStartupError({
  errorMessage,
  onEnd,
  onRetry,
}: {
  errorMessage: string;
  onEnd: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="absolute bottom-[var(--mobile-orb-bottom)] left-0 right-0 rounded-[18px] border border-red-200 bg-white p-[16px] shadow-[0_18px_40px_rgba(18,19,24,0.08)]">
      <p className="text-[15px] font-[700] leading-[20px] text-[#1e1f24]">
        Voice could not start
      </p>
      <p className="mt-[6px] text-[13px] leading-[18px] text-[#595a5d]">
        {errorMessage}
      </p>
      <div className="mt-[14px] flex gap-[8px]">
        <button
          className="h-[36px] rounded-[12px] bg-[#050505] px-[16px] text-[14px] font-[700] leading-[18px] text-white"
          onClick={onRetry}
          type="button"
        >
          Try Again
        </button>
        <button
          className="h-[36px] rounded-[12px] border border-[#dcdcdc] bg-white px-[16px] text-[14px] font-[700] leading-[18px] text-[#1e1f24]"
          onClick={onEnd}
          type="button"
        >
          End Chat
        </button>
      </div>
    </div>
  );
}

function MobileChatTranscript({
  agentState,
  latestSearchSources,
  messages,
}: {
  agentState: string;
  latestSearchSources: NonNullable<ToolCallStatus["sources"]>;
  messages: ChatMessageData[];
}) {
  const transcriptRef = useRef<HTMLDivElement>(null);
  const isThinking = agentState === "thinking";
  const latestMessage = messages.at(-1);
  const shouldShowThinking = isThinking || latestMessage?.role === "user";
  const transcriptMessages = shouldShowThinking
    ? [
        ...messages,
        {
          id: "agent-thinking",
          role: "system" as const,
          text: "Thinking",
        },
      ]
    : messages;
  const latestTranscriptText = transcriptMessages.at(-1)?.text;
  const sourcedMessageId = getLatestSystemMessageId(transcriptMessages);

  useEffect(() => {
    const transcript = transcriptRef.current;

    if (!transcript) return;

    transcript.scrollTop = transcript.scrollHeight;
  }, [transcriptMessages.length, latestTranscriptText]);

  return (
    <div
      aria-label="Conversation transcript"
      className="absolute bottom-[var(--mobile-transcript-bottom)] left-0 right-0 top-[96px] z-10 overflow-hidden"
    >
      <div
        className="flex h-full flex-col gap-[28px] overflow-y-auto pr-[2px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        ref={transcriptRef}
      >
        {transcriptMessages.map((message) => (
          <ChatMessageWithSources
            key={message.id}
            message={message}
            pending={message.id === "agent-thinking"}
            sources={message.id === sourcedMessageId ? latestSearchSources : []}
          >
            <DesignChatMessage
              message={message}
              pending={message.id === "agent-thinking"}
            />
          </ChatMessageWithSources>
        ))}
      </div>
    </div>
  );
}

function getLatestSystemMessageId(messages: ChatMessageData[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === "system") {
      return message.id;
    }
  }

  return null;
}
