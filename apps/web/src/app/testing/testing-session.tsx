"use client";

import {
  RoomAudioRenderer,
  SessionProvider,
  useSession,
} from "@livekit/components-react";
import {
  AgentControlBar as DesignAgentControlBar,
  AskMobileExperience,
  ChatMessageWithSources,
  ChatMessage as DesignChatMessage,
  type ChatMessageData,
  type VoiceOption,
} from "@starter/design-system";
import { ConnectionState, TokenSource } from "livekit-client";
import {
  CircleAlert,
  Loader2,
  Mic,
  Play,
  Square,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useMemo, type ReactNode } from "react";

import { AgentSideBar } from "~/components/AgentSideBar";
import {
  fallbackPersonaVoiceOptions,
  type PersonaVoiceOption,
} from "~/components/PersonaVoiceSwitcher";
import { OrbShader } from "~/components/OrbShader";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { ToolCallStatusPanel } from "../livekit-agent/tool-call-status";
import {
  useLiveKitSessionController,
  type LiveKitSessionController,
} from "./use-livekit-session-controller";

const DEFAULT_MOBILE_VOICE: VoiceOption = {
  avatar: "/agent-sidebar/avatar-1.png",
  description: "Softbank founder",
  name: "Masa Son",
};

function personaToVoice(persona: PersonaVoiceOption | undefined): VoiceOption {
  if (!persona) {
    return DEFAULT_MOBILE_VOICE;
  }

  return {
    avatar: persona.avatar_url,
    description: persona.description,
    name: persona.display_name,
  };
}

export type TestingSessionProps = {
  agentName: string;
  className?: string;
  desktopHero?: ReactNode;
  desktopSectionClassName?: string;
  desktopSidebarClassName?: string;
  endRequestKey?: number;
  mobileHero?: ReactNode;
  mobileLayout?: "portfolio" | "ask";
  onMobileBack?: () => void;
  onMobileConversationChange?: (hasConversation: boolean) => void;
  onSelectPersona?: (personaId: string) => void;
  persistMobileAskResume?: boolean;
  personas?: PersonaVoiceOption[];
  selectedPersonaId?: string;
  showMobileHeader?: boolean;
  showMobileBackButton?: boolean;
  onSessionEnded: () => void;
  roomName: string;
  showDebugPanel?: boolean;
  tokenEndpoint: string;
};

export function TestingSession({
  agentName,
  className,
  desktopHero,
  desktopSectionClassName,
  desktopSidebarClassName,
  endRequestKey = 0,
  mobileHero,
  mobileLayout = "portfolio",
  onMobileBack,
  onMobileConversationChange,
  onSelectPersona,
  persistMobileAskResume = false,
  personas = fallbackPersonaVoiceOptions,
  selectedPersonaId = "portfolio-agent",
  showMobileHeader = true,
  showMobileBackButton = true,
  onSessionEnded,
  roomName,
  showDebugPanel = true,
  tokenEndpoint,
}: TestingSessionProps) {
  const tokenSource = useMemo(
    () => TokenSource.endpoint(tokenEndpoint),
    [tokenEndpoint],
  );
  const session = useSession(tokenSource, {
    agentName,
    agentMetadata: JSON.stringify({
      persona_id: selectedPersonaId,
      session_id: roomName,
      user_id: "testing-user",
    }),
    participantName: "Testing Guest",
    roomName,
  });

  return (
    <SessionProvider session={session}>
      <TestingSessionLayout
        agentName={agentName}
        className={className}
        desktopHero={desktopHero}
        desktopSectionClassName={desktopSectionClassName}
        desktopSidebarClassName={desktopSidebarClassName}
        endRequestKey={endRequestKey}
        mobileHero={mobileHero}
        mobileLayout={mobileLayout}
        onMobileBack={onMobileBack}
        onMobileConversationChange={onMobileConversationChange}
        onSelectPersona={onSelectPersona}
        onSessionEnded={onSessionEnded}
        persistMobileAskResume={persistMobileAskResume}
        personas={personas}
        roomName={roomName}
        selectedPersonaId={selectedPersonaId}
        session={session}
        showDebugPanel={showDebugPanel}
        showMobileBackButton={showMobileBackButton}
        showMobileHeader={showMobileHeader}
        tokenEndpoint={tokenEndpoint}
      />
      <RoomAudioRenderer />
    </SessionProvider>
  );
}

function TestingSessionLayout({
  agentName,
  className,
  desktopHero,
  desktopSectionClassName,
  desktopSidebarClassName,
  endRequestKey,
  mobileHero,
  mobileLayout,
  onMobileBack,
  onMobileConversationChange,
  onSelectPersona,
  onSessionEnded,
  persistMobileAskResume,
  personas,
  roomName,
  selectedPersonaId,
  session,
  showDebugPanel,
  showMobileBackButton,
  showMobileHeader,
  tokenEndpoint,
}: Omit<TestingSessionProps, "endRequestKey"> & {
  endRequestKey: number;
  session: ReturnType<typeof useSession>;
}) {
  const controller = useLiveKitSessionController(session, {
    endRequestKey,
    onMobileConversationChange:
      mobileLayout === "ask" ? onMobileConversationChange : undefined,
    onSessionEnded,
    persistMobileAskResume: persistMobileAskResume ?? false,
    tokenEndpoint,
  });
  const selectedPersona =
    personas?.find((persona) => persona.id === selectedPersonaId) ??
    personas?.[0];
  const selectedVoice = personaToVoice(selectedPersona);

  return (
    <div
      className={cn(
        "mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 px-[14px] py-0 md:px-6 md:py-4",
        className,
      )}
    >
      {showDebugPanel ? <TestingDebugHeader controller={controller} /> : null}
      {showDebugPanel ? (
        <ToolCallStatusPanel
          className="md:hidden"
          status={controller.visibleToolCallStatus}
        />
      ) : null}

      <section
        className={cn(
          "grid gap-4 md:grid-cols-[minmax(0,1fr)_402px]",
          desktopSectionClassName,
        )}
      >
        {desktopHero ? (
          <div className="hidden md:block">{desktopHero}</div>
        ) : (
          <TestingDebugPanel
            agentName={agentName}
            controller={controller}
            roomName={roomName}
            tokenEndpoint={tokenEndpoint}
          />
        )}

        {mobileLayout === "ask" ? (
          <AskMobileSessionShell
            controller={controller}
            onBack={onMobileBack}
            showBackButton={showMobileBackButton ?? true}
            showHeader={showMobileHeader ?? true}
            voice={selectedVoice}
          />
        ) : (
          <PortfolioMobileSessionShell
            controller={controller}
            mobileHero={mobileHero}
            voice={selectedVoice}
          />
        )}

        <DesktopAgentSidebar
          className={desktopSidebarClassName}
          controller={controller}
          onSelectPersona={onSelectPersona}
          personas={personas}
          selectedPersonaId={selectedPersonaId}
          voiceName={selectedVoice.name}
        />
      </section>
    </div>
  );
}

function TestingDebugHeader({
  controller,
}: {
  controller: LiveKitSessionController;
}) {
  const statusTone = controller.isConnected
    ? "good"
    : controller.isConnecting
      ? "warn"
      : "neutral";

  return (
    <header className="hidden flex-wrap items-center justify-between gap-3 border-b border-border pb-4 md:flex">
      <div>
        <h1 className="text-xl font-semibold tracking-normal">/testing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live AgentSideBar on web, compact voice controls on mobile.
        </p>
      </div>
      <StatusPill tone={statusTone}>
        {controller.isConnected ? (
          <Wifi className="size-3.5" />
        ) : (
          <WifiOff className="size-3.5" />
        )}
        {controller.connectionState}
      </StatusPill>
    </header>
  );
}

function TestingDebugPanel({
  agentName,
  controller,
  roomName,
  tokenEndpoint,
}: {
  agentName: string;
  controller: LiveKitSessionController;
  roomName: string;
  tokenEndpoint: string;
}) {
  return (
    <div className="hidden min-h-[420px] flex-col border border-border bg-background p-4 md:flex">
      <div className="grid gap-3 border-b border-border pb-4 text-sm md:grid-cols-2">
        <div>
          <p className="text-muted-foreground">Agent</p>
          <p className="font-medium">{agentName}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Agent state</p>
          <p className="font-medium">{controller.agent.state}</p>
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
        status={controller.visibleToolCallStatus}
      />

      <div className="flex flex-1 flex-col justify-center gap-4 py-6">
        <div className="mx-auto flex size-40 items-center justify-center rounded-full border border-border bg-muted text-center">
          <div>
            <p className="text-sm font-medium">{controller.agent.state}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {controller.isConnected
                ? "Ask a spoken question."
                : "Ready to start."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          <Button
            disabled={
              controller.connectionState !== ConnectionState.Disconnected
            }
            onClick={controller.startSession}
            type="button"
          >
            {controller.isConnecting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Play />
            )}
            Start
          </Button>
          <Button
            disabled={
              controller.connectionState === ConnectionState.Disconnected
            }
            onClick={controller.endSession}
            type="button"
            variant="outline"
          >
            <Square />
            End
          </Button>
          <Button
            disabled={!controller.isConnected}
            onClick={controller.toggleMicrophone}
            type="button"
            variant="outline"
          >
            <Mic />
            {controller.isMicrophoneEnabled ? "Mic on" : "Mic off"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AskMobileSessionShell({
  controller,
  onBack,
  showBackButton,
  showHeader,
  voice,
}: {
  controller: LiveKitSessionController;
  onBack?: () => void;
  showBackButton: boolean;
  showHeader: boolean;
  voice: VoiceOption;
}) {
  return (
    <AskMobileExperience
      className="h-svh w-full md:hidden"
      controlState={controller.mobileControlState}
      errorMessage={controller.errorMessage}
      hasStartupError={controller.hasStartupError}
      inputValue={controller.inputValue}
      isMicrophoneEnabled={controller.isMicrophoneEnabled}
      latestSearchSources={controller.completedSources}
      messages={controller.chatMessages}
      onBack={onBack}
      onChangeInput={controller.setInputValue}
      onEnd={controller.endSession}
      onRetry={controller.startSession}
      onSend={controller.sendMessage}
      onStopResponse={controller.endSession}
      onToggleMicrophone={controller.toggleMicrophone}
      pending={controller.showPendingReply}
      renderOrb={
        controller.hasStartupError ? null : (
          <OrbShader
            size={controller.mobileOrbSize}
            state={
              controller.mobileControlState === "agent-streaming"
                ? "thinking"
                : "loading"
            }
          />
        )
      }
      showBackButton={showBackButton}
      showHeader={showHeader}
      voice={voice}
    />
  );
}

function PortfolioMobileSessionShell({
  controller,
  mobileHero,
  voice,
}: {
  controller: LiveKitSessionController;
  mobileHero?: ReactNode;
  voice: VoiceOption;
}) {
  return (
    <div className="relative min-h-svh overflow-hidden md:hidden">
      {mobileHero ? (
        <div className="absolute inset-0 z-0 overflow-hidden">{mobileHero}</div>
      ) : null}
      <MobileTranscript
        messages={controller.chatMessages}
        pending={controller.showPendingReply}
      />
      {controller.hasStartupError ? null : (
        <OrbShader
          className="absolute bottom-[calc(var(--ds-agent-control-bar-height)_+_var(--ds-agent-mobile-orb-gap))] left-1/2 -translate-x-1/2"
          data-testid="mobile-agent-orb"
          size={controller.mobileOrbSize}
          state={
            controller.mobileControlState === "agent-streaming"
              ? "thinking"
              : "loading"
          }
        />
      )}
      <div
        className="absolute bottom-0 left-[20px] right-[20px] z-20 flex flex-col gap-[8px]"
        data-testid="mobile-agent-control-stack"
      >
        {controller.hasStartupError ? (
          <MobileStartupError
            errorMessage={controller.errorMessage}
            onEnd={controller.endSession}
            onRetry={controller.startSession}
          />
        ) : null}
        <DesignAgentControlBar
          className="w-full"
          inputValue={controller.inputValue}
          isMicrophoneEnabled={controller.isMicrophoneEnabled}
          onChangeInput={controller.setInputValue}
          onEnd={controller.endSession}
          onSend={controller.sendMessage}
          onStopResponse={controller.endSession}
          onToggleMicrophone={controller.toggleMicrophone}
          state={controller.mobileControlState}
          voice={voice}
        />
      </div>
    </div>
  );
}

function DesktopAgentSidebar({
  className,
  controller,
  onSelectPersona,
  personas,
  selectedPersonaId,
  voiceName,
}: {
  className?: string;
  controller: LiveKitSessionController;
  onSelectPersona?: (personaId: string) => void;
  personas?: PersonaVoiceOption[];
  selectedPersonaId?: string;
  voiceName: string;
}) {
  return (
    <div className="hidden md:block">
      <AgentSideBar
        className={className}
        errorMessage={controller.errorMessage}
        inputValue={controller.inputValue}
        isMicrophoneEnabled={controller.isMicrophoneEnabled}
        isSending={controller.isSending}
        latestSearchSources={controller.completedSources}
        messages={controller.messages}
        onChangeInput={controller.setInputValue}
        onEnd={controller.endSession}
        onSend={controller.sendMessage}
        onSelectPersona={onSelectPersona}
        onStart={controller.startSession}
        onStopResponse={controller.endSession}
        onToggleMicrophone={controller.toggleMicrophone}
        personas={personas}
        selectedPersonaId={selectedPersonaId}
        state={controller.state}
        voiceName={voiceName}
      />
    </div>
  );
}

function MobileTranscript({
  messages,
  pending,
}: {
  messages: ChatMessageData[];
  pending: boolean;
}) {
  const transcriptMessages = pending
    ? [
        ...messages,
        { id: "agent-thinking", role: "system" as const, text: "Thinking" },
      ]
    : messages;

  return (
    <div className="absolute bottom-[calc(var(--ds-agent-control-bar-height)_+_var(--ds-agent-mobile-orb-gap)_+_var(--ds-agent-mobile-orb-size)_+_var(--ds-agent-mobile-transcript-gap))] left-0 right-0 top-[96px] z-10 overflow-hidden">
      <div className="h-full overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-h-full flex-col gap-[28px]">
          {transcriptMessages.map((message) => (
            <ChatMessageWithSources key={message.id} message={message}>
              <DesignChatMessage
                message={message}
                pending={message.id === "agent-thinking"}
              />
            </ChatMessageWithSources>
          ))}
        </div>
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
    <div
      className="flex w-full flex-col gap-[12px] rounded-[18px] border border-[#F3B2B6] bg-white px-[16px] py-[14px] shadow-[0_18px_40px_rgba(18,19,24,0.08)]"
      data-testid="mobile-agent-error"
      role="alert"
    >
      <div className="flex items-start gap-[10px]">
        <CircleAlert className="mt-[1px] size-[18px] shrink-0 text-[#C6002B]" />
        <div className="min-w-0">
          <p className="text-[15px] font-[700] leading-[20px] text-[#1e1f24]">
            Voice could not start
          </p>
          <p className="mt-[4px] text-[13px] leading-[18px] text-[#595a5d]">
            {errorMessage}
          </p>
        </div>
      </div>
      <div className="flex gap-[8px] pl-[28px]">
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
