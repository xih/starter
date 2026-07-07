"use client";

import {
  Camera,
  CameraOff,
  ChevronDown,
  Mic,
  MicOff,
  MonitorUp,
  MonitorOff,
  PhoneOff,
  SquarePen,
  TextIcon,
  X,
} from "lucide-react";
import type { ReactNode } from "react";

import { AgentControlBar } from "~/components/agents-ui/agent-control-bar";
import { cn } from "~/lib/utils";

export type AgentSessionPanelState =
  | "preconnect"
  | "connecting"
  | "listening"
  | "user-speaking"
  | "thinking"
  | "agent-speaking"
  | "connected"
  | "error"
  | "ended";

export type AgentSessionMessage = {
  id: string;
  speaker: "agent" | "user";
  text: string;
  time?: string;
  code?: string;
};

export type AgentSessionPanelProps = {
  agentName?: string;
  className?: string;
  isLive?: boolean;
  messages?: AgentSessionMessage[];
  isCameraEnabled?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  isMicrophoneEnabled?: boolean;
  isScreenShareEnabled?: boolean;
  onToggleCamera?: () => void;
  onToggleMicrophone?: () => void;
  onToggleScreenShare?: () => void;
  preConnectMessage?: string;
  state?: AgentSessionPanelState;
  supportsChatInput?: boolean;
  supportsScreenShare?: boolean;
  supportsVideoInput?: boolean;
  themeMode?: "dark" | "light";
  variant?: "desktop" | "mobile";
};

function HeaderButton({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <button
      aria-label={label}
      className="flex size-[32px] items-center justify-center rounded-[8px] text-[#4b4b4b]"
      type="button"
    >
      {children}
    </button>
  );
}

function ControlIconButton({
  children,
  disabled,
  label,
  onClick,
  pressed,
  split,
}: {
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick?: () => void;
  pressed?: boolean;
  split?: "left" | "right";
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={pressed}
      className={cn(
        "flex size-[36px] min-w-[36px] items-center justify-center text-[#e7000b]",
        pressed && "bg-[#18181b] text-white",
        !pressed && "bg-[rgba(231,0,11,0.1)]",
        disabled && "bg-[#f5f5f5] text-[#a1a1aa]",
        split === "left" && "rounded-l-full rounded-r-none pl-[4px]",
        split === "right" && "rounded-l-none rounded-r-full pr-[4px]",
        !split && "rounded-full",
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function AgentControlDock({
  compact = false,
  isCameraEnabled = false,
  isConnected = false,
  isLive = false,
  isMicrophoneEnabled = false,
  isScreenShareEnabled = false,
  onDisconnect,
  onToggleCamera,
  onToggleMicrophone,
  onToggleScreenShare,
  supportsScreenShare = true,
  supportsVideoInput = true,
}: {
  compact?: boolean;
  isCameraEnabled?: boolean;
  isConnected?: boolean;
  isLive?: boolean;
  isMicrophoneEnabled?: boolean;
  isScreenShareEnabled?: boolean;
  onDisconnect?: () => void;
  onToggleCamera?: () => void;
  onToggleMicrophone?: () => void;
  onToggleScreenShare?: () => void;
  supportsScreenShare?: boolean;
  supportsVideoInput?: boolean;
}) {
  const dockClassName = cn(
    "absolute",
    compact
      ? "left-[23px] top-[290px] w-[335px]"
      : "left-[33px] top-[767px] w-[373px]",
  );

  if (isLive) {
    return (
      <AgentControlBar
        variant="livekit"
        isChatOpen={false}
        isConnected={isConnected}
        onDisconnect={onDisconnect}
        controls={{
          leave: true,
          microphone: true,
          screenShare: supportsScreenShare,
          camera: supportsVideoInput,
          chat: true,
        }}
        className={cn(
          dockClassName,
          "p-[13px] shadow-[0_3px_3px_rgba(0,0,0,0.03)]",
        )}
        data-agent-control-dock
      />
    );
  }

  return (
    <div
      className={cn(
        "absolute flex h-[63px] flex-col items-start rounded-[31px] border border-[rgba(229,229,229,0.5)] bg-white p-[13px] shadow-[0_3px_3px_rgba(0,0,0,0.03)]",
        dockClassName,
      )}
      data-agent-control-dock
    >
      <div className="flex size-full items-start gap-[4px]">
        <div className="flex flex-1 items-start gap-[4px]">
          <div className="flex h-[36px] rounded-full">
            <ControlIconButton
              label={
                isMicrophoneEnabled ? "Mute microphone" : "Unmute microphone"
              }
              onClick={onToggleMicrophone}
              pressed={isMicrophoneEnabled}
              split="left"
            >
              {isMicrophoneEnabled ? (
                <Mic className="size-[16px]" />
              ) : (
                <MicOff className="size-[16px]" />
              )}
            </ControlIconButton>
            <ControlIconButton label="Select microphone" split="right">
              <ChevronDown className="size-[16px]" />
            </ControlIconButton>
          </div>
          <ControlIconButton
            disabled={!supportsVideoInput}
            label={isCameraEnabled ? "Turn camera off" : "Turn camera on"}
            onClick={onToggleCamera}
            pressed={isCameraEnabled}
          >
            {isCameraEnabled ? (
              <Camera className="size-[16px]" />
            ) : (
              <CameraOff className="size-[16px]" />
            )}
          </ControlIconButton>
          <ControlIconButton
            disabled={!supportsScreenShare}
            label={
              isScreenShareEnabled ? "Stop screen share" : "Start screen share"
            }
            onClick={onToggleScreenShare}
            pressed={isScreenShareEnabled}
          >
            {isScreenShareEnabled ? (
              <MonitorUp className="size-[16px]" />
            ) : (
              <MonitorOff className="size-[16px]" />
            )}
          </ControlIconButton>
          <ControlIconButton disabled label="Toggle transcript">
            <TextIcon className="size-[16px]" />
          </ControlIconButton>
        </div>

        <button
          className="flex h-[36px] shrink-0 items-center justify-center gap-[8px] rounded-full bg-[rgba(231,0,11,0.1)] px-[12px] py-[8px] text-[#3b3b3b]"
          onClick={onDisconnect}
          type="button"
        >
          <PhoneOff className="size-[16px]" />
          <span className="font-mono text-[12px] font-bold uppercase leading-[16px] tracking-[0.6px]">
            End call
          </span>
        </button>
      </div>
    </div>
  );
}

function AuraVisualizer({ dark = false }: { dark?: boolean }) {
  return (
    <div
      className={cn(
        "relative flex size-[270px] items-center justify-center overflow-hidden",
        dark ? "bg-[#1e1f24]" : "bg-[#fcfcfc]",
      )}
      data-agent-aura
    >
      <div className="absolute size-[162px] rounded-full bg-[#1fbdf8] opacity-20 blur-[22px]" />
      <div className="absolute size-[151px] rounded-[46%] border-[14px] border-[#14b8f6] opacity-75 blur-[2px]" />
      <div className="absolute size-[148px] rotate-[22deg] rounded-[42%] border-[15px] border-[#18bdf7] opacity-55 blur-[4px]" />
      <div
        className={cn(
          "relative size-[118px] rounded-full",
          dark ? "bg-[#1e1f24]" : "bg-[#fcfcfc]",
        )}
      />
    </div>
  );
}

function IntroContent({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="absolute left-[27px] top-[37px] w-[347px] text-[#282828]">
        <h1 className="font-title text-[length:var(--font-font-size-title)] font-[var(--font-font-weight-medium)] leading-[var(--font-line-height-lh-title)] tracking-[var(--font-letter-spacing-title)]">
          Dennis Xing is a founding product designer.
        </h1>
        <div className="mt-nell-24 whitespace-pre font-body text-[length:var(--font-font-size-subtext)] leading-[var(--font-line-height-lh-subtext)]">
          {"Past:\nFounding designer at Nell\nAGI\nKrea\nSkydio"}
        </div>
      </div>
    );
  }

  return null;
}

function DesktopHeader() {
  return (
    <header className="h-[64px] w-full shrink-0 border-b border-[rgba(13,13,13,0.05)] bg-white px-[16px] pb-px">
      <div className="flex size-full items-center justify-between">
        <h2 className="whitespace-nowrap font-title text-[length:var(--font-font-size-title)] font-[var(--font-font-weight-medium)] leading-[var(--font-line-height-lh-title)] tracking-[var(--font-letter-spacing-title)] text-[#282828]">
          Talk to Dennis&apos;s Agent
        </h2>
        <div className="flex items-center gap-[6px]">
          <HeaderButton label="Start a new docs agent thread">
            <SquarePen className="size-[16px]" />
          </HeaderButton>
          <HeaderButton label="Close docs agent">
            <X className="size-[16px]" />
          </HeaderButton>
        </div>
      </div>
    </header>
  );
}

function AgentAvatar() {
  return (
    <div className="flex size-[32px] shrink-0 items-center justify-center rounded-full bg-[#f4f4f5] font-sans text-[16px] leading-[28px] text-[#3f3f47]">
      AI
    </div>
  );
}

function ChatMessage({ message }: { message: AgentSessionMessage }) {
  if (message.speaker === "user") {
    return (
      <div className="ml-[71px] w-[343px] rounded-[9.6px] bg-[#18181b] p-[8px] font-sans text-[16px] leading-[28px] text-[#fafafa]">
        {message.text}
      </div>
    );
  }

  return (
    <div className="flex w-full items-start gap-[12px]">
      <AgentAvatar />
      <div className="min-w-0 flex-1 rounded-[9.6px] bg-[#f4f4f5] p-[8px] font-sans text-[16px] leading-[28px] text-[#09090b]">
        <p>{message.text}</p>
        {message.code && (
          <pre className="mt-[8px] max-h-[150px] overflow-hidden rounded-[13.6px] border border-[#e4e4e7] bg-white p-[16px] font-mono text-[13px] leading-[22.75px] text-[#24292e]">
            <code>{message.code}</code>
          </pre>
        )}
        {message.code && message.id === "3" && (
          <div className="mt-[8px]">
            <p>This creates a grid where:</p>
            <p>Columns automatically fit as many as possible</p>
            <p>Each column is at least 250px wide</p>
            <p>Columns expand to fill available space</p>
            <p>There&apos;s a 1rem gap between items</p>
            <p>Would you like me to explain more about how this works?</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ChatTranscript({ messages }: { messages: AgentSessionMessage[] }) {
  return (
    <div className="absolute left-[24px] top-[25px] flex w-[400px] flex-col gap-[16px]">
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
    </div>
  );
}

function DesktopPanel({
  isCameraEnabled,
  isLive,
  isMicrophoneEnabled,
  isScreenShareEnabled,
  messages,
  onConnect,
  onDisconnect,
  onToggleCamera,
  onToggleMicrophone,
  onToggleScreenShare,
  state,
  supportsScreenShare,
  supportsVideoInput,
}: Required<
  Pick<
    AgentSessionPanelProps,
    | "isCameraEnabled"
    | "isLive"
    | "isMicrophoneEnabled"
    | "isScreenShareEnabled"
    | "messages"
    | "state"
    | "supportsScreenShare"
    | "supportsVideoInput"
  >
> & {
  onDisconnect?: () => void;
  onConnect?: () => void;
  onToggleCamera?: () => void;
  onToggleMicrophone?: () => void;
  onToggleScreenShare?: () => void;
}) {
  const isChatting = state === "connected" || state === "thinking";
  const isPreconnect = state === "preconnect" || state === "ended";
  const isError = state === "error";

  return (
    <section
      className="relative flex h-[924px] w-[440px] flex-col items-start overflow-hidden border-l border-[rgba(13,13,13,0.05)] bg-white pl-px"
      data-livekit-state={state}
      data-panel-variant="desktop"
    >
      <DesktopHeader />
      <div className="relative h-[860px] w-[439px] shrink-0 bg-[#fcfcfc]">
        {isPreconnect && (
          <>
            <div className="absolute left-[91px] top-[272px] size-[256px] rounded-[8px] bg-[#f3f3f3]" />
            <button
              className="absolute left-[192px] top-[553px] flex h-[40px] w-[54px] items-center justify-center rounded-[8px] font-sans text-[14px] text-[#282828]"
              onClick={onConnect}
              type="button"
            >
              Start
            </button>
          </>
        )}
        {isError && (
          <div className="absolute left-[72px] top-[264px] flex w-[296px] flex-col items-center gap-[16px] text-center">
            <div className="flex size-[56px] items-center justify-center rounded-full bg-[rgba(231,0,11,0.1)] text-[#e7000b]">
              <X className="size-[24px]" />
            </div>
            <div>
              <h3 className="font-title text-[20px] font-semibold leading-[28px] text-[#18181b]">
                Connection failed
              </h3>
              <p className="mt-[6px] font-sans text-[14px] leading-[20px] text-[#52525b]">
                Check the token endpoint, microphone permission, or LiveKit
                configuration.
              </p>
            </div>
            <button
              className="flex h-[40px] min-w-[72px] items-center justify-center rounded-[8px] bg-[#18181b] px-[16px] font-sans text-[14px] font-medium text-white"
              onClick={onConnect}
              type="button"
            >
              Retry
            </button>
          </div>
        )}
        {!isPreconnect && !isChatting && !isError && (
          <>
            <div className="absolute left-[85px] top-[249px] size-[270px]">
              <AuraVisualizer />
            </div>
            <AgentControlDock
              isCameraEnabled={isCameraEnabled}
              isConnected
              isLive={isLive}
              isMicrophoneEnabled={isMicrophoneEnabled}
              isScreenShareEnabled={isScreenShareEnabled}
              onDisconnect={onDisconnect}
              onToggleCamera={onToggleCamera}
              onToggleMicrophone={onToggleMicrophone}
              onToggleScreenShare={onToggleScreenShare}
              supportsScreenShare={supportsScreenShare}
              supportsVideoInput={supportsVideoInput}
            />
          </>
        )}
        {isChatting && (
          <>
            <ChatTranscript messages={messages} />
            <AgentControlDock
              isCameraEnabled={isCameraEnabled}
              isConnected
              isLive={isLive}
              isMicrophoneEnabled={isMicrophoneEnabled}
              isScreenShareEnabled={isScreenShareEnabled}
              onDisconnect={onDisconnect}
              onToggleCamera={onToggleCamera}
              onToggleMicrophone={onToggleMicrophone}
              onToggleScreenShare={onToggleScreenShare}
              supportsScreenShare={supportsScreenShare}
              supportsVideoInput={supportsVideoInput}
            />
          </>
        )}
      </div>
    </section>
  );
}

function MobileCard({
  isCameraEnabled,
  isLive,
  isMicrophoneEnabled,
  isScreenShareEnabled,
  onConnect,
  onDisconnect,
  onToggleCamera,
  onToggleMicrophone,
  onToggleScreenShare,
  state,
  supportsScreenShare,
  supportsVideoInput,
}: Required<
  Pick<
    AgentSessionPanelProps,
    | "isCameraEnabled"
    | "isLive"
    | "isMicrophoneEnabled"
    | "isScreenShareEnabled"
    | "state"
    | "supportsScreenShare"
    | "supportsVideoInput"
  >
> & {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onToggleCamera?: () => void;
  onToggleMicrophone?: () => void;
  onToggleScreenShare?: () => void;
}) {
  const isConnected =
    state !== "preconnect" && state !== "ended" && state !== "error";

  return (
    <div
      className="relative h-[874px] w-[402px] overflow-hidden bg-white"
      data-livekit-state={state}
      data-panel-variant="mobile"
    >
      <IntroContent compact />
      <div className="absolute left-[8px] top-[450px] h-[372px] w-[381px] overflow-hidden rounded-[12px] bg-[#1e1f24]">
        {isConnected && (
          <div className="absolute left-[56px] top-[12px] size-[270px]">
            <AuraVisualizer dark />
          </div>
        )}
        {state === "error" && (
          <div className="absolute left-[40px] top-[84px] flex w-[300px] flex-col items-center gap-[14px] text-center">
            <div className="flex size-[48px] items-center justify-center rounded-full bg-[rgba(231,0,11,0.16)] text-[#ff4d55]">
              <X className="size-[22px]" />
            </div>
            <div>
              <h3 className="font-title text-[18px] font-semibold leading-[24px] text-white">
                Connection failed
              </h3>
              <p className="mt-[6px] font-sans text-[13px] leading-[18px] text-[#d4d4d8]">
                Check the token endpoint, microphone permission, or LiveKit
                configuration.
              </p>
            </div>
            <button
              className="flex h-[36px] min-w-[70px] items-center justify-center rounded-[8px] bg-white px-[14px] font-sans text-[13px] font-medium text-[#18181b]"
              onClick={onConnect}
              type="button"
            >
              Retry
            </button>
          </div>
        )}
        <AgentControlDock
          compact
          isCameraEnabled={isCameraEnabled}
          isConnected={isConnected}
          isLive={isLive}
          isMicrophoneEnabled={isMicrophoneEnabled}
          isScreenShareEnabled={isScreenShareEnabled}
          onDisconnect={onDisconnect}
          onToggleCamera={onToggleCamera}
          onToggleMicrophone={onToggleMicrophone}
          onToggleScreenShare={onToggleScreenShare}
          supportsScreenShare={supportsScreenShare}
          supportsVideoInput={supportsVideoInput}
        />
      </div>
      <div className="absolute bottom-0 left-0 h-[34px] w-[402px] overflow-hidden bg-[#121318]">
        <div className="flex h-full items-center gap-[16px] p-[8px] font-title text-[12px] uppercase leading-[18px] text-white">
          <span>2:16:05 PM</span>
          <span className="normal-case">San Francisco</span>
          <span className="normal-case">Overcast, 70°F</span>
        </div>
      </div>
    </div>
  );
}

export function AgentSessionPanel({
  className,
  isCameraEnabled = false,
  isLive = false,
  messages = [],
  isMicrophoneEnabled = false,
  isScreenShareEnabled = false,
  onDisconnect,
  onConnect,
  onToggleCamera,
  onToggleMicrophone,
  onToggleScreenShare,
  state = "preconnect",
  supportsScreenShare = true,
  supportsVideoInput = true,
  themeMode = "light",
  variant = "desktop",
}: AgentSessionPanelProps) {
  if (variant === "mobile") {
    return (
      <div className={cn(themeMode === "dark" && "dark", className)}>
        <MobileCard
          isCameraEnabled={isCameraEnabled}
          isLive={isLive}
          isMicrophoneEnabled={isMicrophoneEnabled}
          isScreenShareEnabled={isScreenShareEnabled}
          onConnect={onConnect}
          onDisconnect={onDisconnect}
          onToggleCamera={onToggleCamera}
          onToggleMicrophone={onToggleMicrophone}
          onToggleScreenShare={onToggleScreenShare}
          state={state}
          supportsScreenShare={supportsScreenShare}
          supportsVideoInput={supportsVideoInput}
        />
      </div>
    );
  }

  return (
    <div className={cn(themeMode === "dark" && "dark", className)}>
      <DesktopPanel
        isCameraEnabled={isCameraEnabled}
        isLive={isLive}
        isMicrophoneEnabled={isMicrophoneEnabled}
        isScreenShareEnabled={isScreenShareEnabled}
        messages={messages}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
        onToggleCamera={onToggleCamera}
        onToggleMicrophone={onToggleMicrophone}
        onToggleScreenShare={onToggleScreenShare}
        state={state}
        supportsScreenShare={supportsScreenShare}
        supportsVideoInput={supportsVideoInput}
      />
    </div>
  );
}
