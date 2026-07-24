"use client";

import {
  RoomAudioRenderer,
  SessionProvider,
  useSession,
} from "@livekit/components-react";
import {
  AskMobileExperience,
  type ChatMessageData,
  type VoiceOption,
} from "@starter/design-system";
import { ConnectionState, TokenSource } from "livekit-client";
import { Loader2, Mic, Play, Square, Wifi, WifiOff } from "lucide-react";
import { useCallback, useMemo, useState, type ReactNode } from "react";

import {
  AgentSideBar,
  type AgentSideBarMessage,
} from "~/components/AgentSideBar";
import {
  getPersonaSwitchRpcIdentity,
  usePersonaSwitchRpc,
} from "~/components/persona-switch-rpc";
import {
  fallbackPersonaVoiceOptions,
  type PersonaVoiceOption,
} from "~/components/PersonaVoiceSwitcher";
import { OrbShader } from "~/components/OrbShader";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { ToolCallStatusPanel } from "../livekit-agent/tool-call-status";
import { MobilePortfolioVoiceSession } from "./mobile-portfolio-voice-session";
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
    id: persona.id,
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
  selectedPersonaId,
  showMobileHeader = true,
  showMobileBackButton = true,
  onSessionEnded,
  roomName,
  showDebugPanel = true,
  tokenEndpoint,
}: TestingSessionProps) {
  const [uncontrolledSelectedPersonaId, setUncontrolledSelectedPersonaId] =
    useState("portfolio-agent");
  const resolvedSelectedPersonaId =
    selectedPersonaId ?? uncontrolledSelectedPersonaId;
  const selectPersonaId = useCallback(
    (personaId: string) => {
      setUncontrolledSelectedPersonaId(personaId);
      onSelectPersona?.(personaId);
    },
    [onSelectPersona],
  );
  const agentMetadata = useMemo(
    () => ({
      persona_id: resolvedSelectedPersonaId,
      session_id: roomName,
      user_id: "testing-user",
    }),
    [roomName, resolvedSelectedPersonaId],
  );
  const tokenSource = useMemo(
    () => TokenSource.endpoint(tokenEndpoint),
    [tokenEndpoint],
  );
  const session = useSession(tokenSource, {
    agentName,
    agentMetadata: JSON.stringify(agentMetadata),
    participantName: "Testing Guest",
    roomName,
  });

  return (
    <SessionProvider session={session}>
      <TestingSessionLayout
        agentName={agentName}
        agentMetadata={agentMetadata}
        className={className}
        desktopHero={desktopHero}
        desktopSectionClassName={desktopSectionClassName}
        desktopSidebarClassName={desktopSidebarClassName}
        endRequestKey={endRequestKey}
        mobileHero={mobileHero}
        mobileLayout={mobileLayout}
        onMobileBack={onMobileBack}
        onMobileConversationChange={onMobileConversationChange}
        onSelectPersona={selectPersonaId}
        onSessionEnded={onSessionEnded}
        persistMobileAskResume={persistMobileAskResume}
        personas={personas}
        roomName={roomName}
        selectedPersonaId={resolvedSelectedPersonaId}
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
  agentMetadata,
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
  agentMetadata: {
    persona_id: string;
    session_id: string;
    user_id: string;
  };
  endRequestKey: number;
  session: ReturnType<typeof useSession>;
}) {
  const controller = useLiveKitSessionController(session, {
    agentMetadata,
    endRequestKey,
    onMobileConversationChange:
      mobileLayout === "ask" ? onMobileConversationChange : undefined,
    onSessionEnded,
    persistMobileAskResume: persistMobileAskResume ?? false,
    tokenEndpoint,
  });
  const resolvedPersonas = personas ?? fallbackPersonaVoiceOptions;
  const selectedPersona =
    resolvedPersonas.find((persona) => persona.id === selectedPersonaId) ??
    resolvedPersonas[0];
  const selectedVoice = personaToVoice(selectedPersona);
  const voiceOptions = resolvedPersonas.map(personaToVoice);
  const switchPersonaTts = usePersonaSwitchRpc({
    agentIdentity: getPersonaSwitchRpcIdentity(controller.agent),
    localParticipant: session.room.localParticipant,
    roomName,
    userId: agentMetadata.user_id,
  });
  const selectPersona = useCallback(
    (personaId: string) => {
      if (personaId === selectedPersonaId) return;

      onSelectPersona?.(personaId);

      if (!controller.isConnected) {
        return;
      }

      void switchPersonaTts({ personaId }).catch((error) => {
        console.error("Testing persona TTS switch failed", error);
      });
    },
    [
      controller.isConnected,
      onSelectPersona,
      selectedPersonaId,
      switchPersonaTts,
    ],
  );
  const selectVoice = useCallback(
    (voice: VoiceOption) => {
      if (voice.id) {
        selectPersona(voice.id);
      }
    },
    [selectPersona],
  );

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
            chatMessages={controller.chatMessages}
            controller={controller}
            onBack={onMobileBack}
            onSelectVoice={selectVoice}
            showBackButton={showMobileBackButton ?? true}
            showHeader={showMobileHeader ?? true}
            voice={selectedVoice}
            voiceOptions={voiceOptions}
          />
        ) : (
          <PortfolioMobileSessionShell
            chatMessages={controller.chatMessages}
            controller={controller}
            mobileHero={mobileHero}
            onSelectVoice={selectVoice}
            voice={selectedVoice}
            voiceOptions={voiceOptions}
          />
        )}

        <DesktopAgentSidebar
          className={desktopSidebarClassName}
          controller={controller}
          messages={controller.messages}
          onSelectPersona={selectPersona}
          personas={resolvedPersonas}
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
  chatMessages,
  controller,
  onBack,
  showBackButton,
  showHeader,
  voiceOptions,
  onSelectVoice,
  voice,
}: {
  chatMessages: ChatMessageData[];
  controller: LiveKitSessionController;
  onBack?: () => void;
  onSelectVoice: (voice: VoiceOption) => void;
  showBackButton: boolean;
  showHeader: boolean;
  voiceOptions: VoiceOption[];
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
      messages={chatMessages}
      onBack={onBack}
      onChangeInput={controller.setInputValue}
      onEnd={controller.endSession}
      onRetry={controller.startSession}
      onSend={controller.sendMessage}
      onStopResponse={controller.endSession}
      onToggleMicrophone={controller.toggleMicrophone}
      onSelectVoice={onSelectVoice}
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
      voiceOptions={voiceOptions}
    />
  );
}

function PortfolioMobileSessionShell({
  chatMessages,
  controller,
  mobileHero,
  onSelectVoice,
  voiceOptions,
  voice,
}: {
  chatMessages: ChatMessageData[];
  controller: LiveKitSessionController;
  mobileHero?: ReactNode;
  onSelectVoice: (voice: VoiceOption) => void;
  voiceOptions: VoiceOption[];
  voice: VoiceOption;
}) {
  return (
    <MobilePortfolioVoiceSession
      chatMessages={chatMessages}
      controlState={controller.mobileControlState}
      errorMessage={controller.errorMessage}
      hasStartupError={controller.hasStartupError}
      inputValue={controller.inputValue}
      isMicrophoneEnabled={controller.isMicrophoneEnabled}
      mobileHero={mobileHero}
      onChangeInput={controller.setInputValue}
      onEnd={controller.endSession}
      onRetry={controller.startSession}
      onSelectVoice={onSelectVoice}
      onSend={controller.sendMessage}
      onStopResponse={controller.endSession}
      onToggleMicrophone={controller.toggleMicrophone}
      pending={controller.showPendingReply}
      renderOrb={
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
      }
      voice={voice}
      voiceOptions={voiceOptions}
    />
  );
}

function DesktopAgentSidebar({
  className,
  controller,
  messages,
  onSelectPersona,
  personas,
  selectedPersonaId,
  voiceName,
}: {
  className?: string;
  controller: LiveKitSessionController;
  messages: AgentSideBarMessage[];
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
        messages={messages}
        onChangeInput={controller.setInputValue}
        onEnd={controller.endSession}
        onSend={controller.sendMessage}
        onSelectPersona={onSelectPersona}
        onStart={controller.startSession}
        onStopResponse={controller.endSession}
        onToggleMicrophone={controller.toggleMicrophone}
        personas={personas}
        selectedPersonaId={selectedPersonaId}
        showThinkingMessage={controller.showDesktopThinking}
        state={controller.state}
        voiceName={voiceName}
      />
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
