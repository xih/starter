"use client";

import {
  AgentControlBar as DesignAgentControlBar,
  ChatMessage as DesignChatMessage,
  ChatMessageWithSources,
  type AgentControlBarState,
  type ChatMessageData,
  type VoiceOption,
  VoiceParameterPanel,
} from "@starter/design-system";
import { CircleAlert, X } from "lucide-react";
import { useState, type ReactNode } from "react";

export type MobilePortfolioVoiceSessionProps = {
  chatMessages: ChatMessageData[];
  controlState: AgentControlBarState;
  errorMessage?: string;
  hasStartupError?: boolean;
  inputValue?: string;
  isMicrophoneEnabled?: boolean;
  mobileHero?: ReactNode;
  onChangeInput?: (value: string) => void;
  onEnd?: () => void;
  onRetry?: () => void;
  onSelectVoice: (voice: VoiceOption) => void;
  onSend?: (value: string) => void | Promise<void>;
  onStopResponse?: () => void | Promise<void>;
  onToggleMicrophone?: () => void | Promise<void>;
  pending?: boolean;
  renderOrb?: ReactNode;
  voice: VoiceOption;
  voiceOptions: VoiceOption[];
};

export function MobilePortfolioVoiceSession({
  chatMessages,
  controlState,
  errorMessage = "",
  hasStartupError = false,
  inputValue = "",
  isMicrophoneEnabled,
  mobileHero,
  onChangeInput,
  onEnd,
  onRetry,
  onSelectVoice,
  onSend,
  onStopResponse,
  onToggleMicrophone,
  pending = false,
  renderOrb,
  voice,
  voiceOptions,
}: MobilePortfolioVoiceSessionProps) {
  const [isVoicePanelOpen, setIsVoicePanelOpen] = useState(false);

  return (
    <div className="relative min-h-svh overflow-hidden md:hidden">
      {mobileHero ? (
        <div className="absolute inset-0 z-0 overflow-hidden">{mobileHero}</div>
      ) : null}
      <MobileTranscript messages={chatMessages} pending={pending} />
      {hasStartupError ? null : renderOrb}
      <div
        className="absolute bottom-0 left-[20px] right-[20px] z-20 flex flex-col gap-[8px]"
        data-testid="mobile-agent-control-stack"
      >
        {hasStartupError ? (
          <MobileStartupError
            errorMessage={errorMessage}
            onEnd={onEnd}
            onRetry={onRetry}
          />
        ) : null}
        {isVoicePanelOpen ? (
          <VoiceParameterPanel
            className="w-full"
            onSelectVoice={(nextVoice) => {
              onSelectVoice(nextVoice);
              setIsVoicePanelOpen(false);
            }}
            selectedVoiceName={voice.name}
            voices={voiceOptions}
          />
        ) : null}
        <DesignAgentControlBar
          className="w-full"
          inputValue={inputValue}
          isMicrophoneEnabled={isMicrophoneEnabled}
          onChangeInput={onChangeInput}
          onEnd={onEnd}
          onOpenVoicePanel={() => setIsVoicePanelOpen((open) => !open)}
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
                pending={message.id === "agent-thinking" || message.isStreaming}
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
  onEnd?: () => void;
  onRetry?: () => void;
}) {
  return (
    <div
      className="absolute bottom-[calc(100%_+_8px)] left-0 z-30 flex h-[42px] items-center rounded-[21px] border border-[#901923] bg-[#D6222E] pr-[8px] text-white shadow-[0_8px_18px_rgba(18,19,24,0.18)]"
      data-testid="mobile-agent-issue-pill"
      role="alert"
      title={errorMessage}
    >
      <button
        aria-label="Retry voice connection"
        className="flex h-full items-center gap-[10px] rounded-l-[21px] pl-[12px] pr-[10px] text-[16px] font-[700] leading-[20px]"
        onClick={onRetry}
        type="button"
      >
        <span className="flex size-[34px] items-center justify-center rounded-full bg-white/10 text-[21px] leading-none">
          N
        </span>
        <span className="inline-flex items-center gap-[6px]">
          <CircleAlert className="size-[16px]" strokeWidth={2.2} />1 Issue
        </span>
      </button>
      <button
        aria-label="Close issue"
        className="flex size-[28px] items-center justify-center rounded-full text-white/95"
        onClick={onEnd}
        type="button"
      >
        <X className="size-[18px]" strokeWidth={2.5} />
      </button>
    </div>
  );
}
