import { cn } from "../utils";
import {
  AgentControlBar,
  ChatMessage,
  type AgentControlBarState,
  type ChatMessageData,
  type VoiceOption,
  VoiceParameterPanel,
} from "./voice";
import { ChatMessageWithSources, type SourceData } from "./sources";
import { SectionHeader } from "./section-header";
import { X, CircleAlert } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

export type AskMobileExperienceProps = {
  className?: string;
  controlState?: AgentControlBarState;
  errorMessage?: string;
  hasStartupError?: boolean;
  inputValue?: string;
  isMicrophoneEnabled?: boolean;
  latestSearchSources?: SourceData[];
  messages?: ChatMessageData[];
  onBack?: () => void;
  onChangeInput?: (value: string) => void;
  onEnd?: () => void;
  onRetry?: () => void;
  onSend?: (value: string) => void | Promise<void>;
  onStopResponse?: () => void | Promise<void>;
  onToggleMicrophone?: () => void | Promise<void>;
  pending?: boolean;
  renderOrb?: ReactNode;
  showBackButton?: boolean;
  showHeader?: boolean;
  voice?: VoiceOption;
};

export function AskMobileExperience({
  className,
  controlState = "default",
  errorMessage = "",
  hasStartupError = false,
  inputValue = "",
  isMicrophoneEnabled,
  latestSearchSources = [],
  messages = [],
  onBack,
  onChangeInput,
  onEnd,
  onRetry,
  onSend,
  onStopResponse,
  onToggleMicrophone,
  pending = false,
  renderOrb,
  showBackButton = true,
  showHeader = true,
  voice,
}: AskMobileExperienceProps) {
  const transcriptRef = useRef<HTMLDivElement>(null);
  const [isVoicePanelOpen, setIsVoicePanelOpen] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption | undefined>(
    voice,
  );
  const showConversation = messages.length > 0 || pending;
  const transcriptMessages = pending
    ? [
        ...messages,
        { id: "thinking", role: "system" as const, text: "Thinking" },
      ]
    : messages;
  const sourcedMessageId = getLatestSystemMessageId(transcriptMessages);

  useEffect(() => {
    const transcript = transcriptRef.current;

    if (!transcript) return;

    transcript.scrollTop = transcript.scrollHeight;
  }, [transcriptMessages.length, transcriptMessages.at(-1)?.text]);

  return (
    <div
      className={cn(
        "relative h-[874px] w-[402px] overflow-hidden bg-white text-[#121318]",
        className,
      )}
      data-testid="ask-mobile-experience"
    >
      {showHeader ? (
        <SectionHeader
          className="absolute top-[24px] left-[20px] z-20 w-[calc(100%-40px)]"
          onBack={onBack}
          showBackButton={showBackButton}
          subtext={
            showConversation
              ? undefined
              : "This feature uses the memories of living people. It can make some mistakes"
          }
          title={showConversation ? "" : "Hi, what would you like to ask?"}
        />
      ) : null}
      {showConversation ? (
        <div
          className="absolute top-[112px] right-[20px] bottom-[230px] left-[20px] overflow-y-auto pb-[28px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          data-testid="mobile-chat-transcript"
          ref={transcriptRef}
        >
          <div className="flex min-h-full flex-col justify-end gap-[14px]">
            {transcriptMessages.map((message) => (
              <ChatMessageWithSources
                key={message.id}
                message={message}
                pending={message.id === "thinking"}
                sources={
                  message.id === sourcedMessageId ? latestSearchSources : []
                }
              >
                <ChatMessage
                  message={message}
                  pending={message.id === "thinking"}
                />
              </ChatMessageWithSources>
            ))}
          </div>
        </div>
      ) : null}
      {renderOrb ? (
        <div
          className="absolute bottom-[calc(20px_+_var(--ds-agent-control-bar-height)_+_var(--ds-agent-mobile-orb-gap))] left-1/2 z-10 -translate-x-1/2"
          data-testid="mobile-agent-orb"
        >
          {renderOrb}
        </div>
      ) : null}
      <div className="absolute right-[20px] bottom-[20px] left-[20px] z-10 flex flex-col gap-[8px]">
        {isVoicePanelOpen ? (
          <VoiceParameterPanel
            className="w-full"
            onSelectVoice={(nextVoice) => {
              setSelectedVoice(nextVoice);
              setIsVoicePanelOpen(false);
            }}
            selectedVoiceName={(selectedVoice ?? voice)?.name}
          />
        ) : null}
        <AgentControlBar
          className="w-full"
          idleAction={!showConversation ? "send" : "end"}
          inputValue={inputValue}
          isMicrophoneEnabled={isMicrophoneEnabled}
          onChangeInput={onChangeInput}
          onEnd={onEnd}
          onOpenVoicePanel={() => setIsVoicePanelOpen((open) => !open)}
          onSend={onSend}
          onStopResponse={onStopResponse}
          onToggleMicrophone={onToggleMicrophone}
          state={controlState}
          voice={selectedVoice ?? voice}
        />
        {hasStartupError ? (
          <MobileIssuePill
            errorMessage={errorMessage}
            onClose={onEnd}
            onRetry={onRetry}
          />
        ) : null}
      </div>
    </div>
  );
}

function MobileIssuePill({
  errorMessage,
  onClose,
  onRetry,
}: {
  errorMessage: string;
  onClose?: () => void;
  onRetry?: () => void;
}) {
  return (
    <div
      className="absolute bottom-[-4px] left-0 z-30 flex h-[42px] items-center rounded-[21px] border border-[#901923] bg-[#D6222E] pr-[8px] text-white shadow-[0_8px_18px_rgba(18,19,24,0.18)]"
      data-testid="mobile-agent-issue-pill"
      role="alert"
      title={errorMessage}
    >
      <button
        aria-label="Retry voice connection"
        className="flex h-full items-center gap-[10px] rounded-l-[21px] pr-[10px] pl-[12px] text-[16px] leading-[20px] font-[700]"
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
        onClick={onClose}
        type="button"
      >
        <X className="size-[18px]" strokeWidth={2.5} />
      </button>
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
