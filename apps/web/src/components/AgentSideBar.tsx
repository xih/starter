"use client";

import {
  ArrowUp,
  Check,
  ChevronDown,
  CircleAlert,
  Mic,
  MicOff,
  Settings2,
  Square,
} from "lucide-react";
import { SourcesRail, type SourceData } from "@starter/design-system";
import { useState, type CSSProperties, type ReactNode } from "react";

import { cn } from "~/lib/utils";

export type AgentSideBarState =
  | "intro"
  | "loading"
  | "begin"
  | "agent-streaming"
  | "idle"
  | "user-typing"
  | "error";

export type AgentSideBarMessage = {
  id: string;
  role: "agent" | "user";
  text: string;
  isStreaming?: boolean;
};

export type AgentSideBarProps = {
  className?: string;
  errorMessage?: string;
  inputValue?: string;
  isMicrophoneEnabled?: boolean;
  isSending?: boolean;
  isThinking?: boolean;
  latestSearchSources?: SourceData[];
  messages?: AgentSideBarMessage[];
  onChangeInput?: (value: string) => void;
  onEnd?: () => void;
  onSend?: (message: string) => void | Promise<void>;
  onStart?: () => void;
  onStopResponse?: () => void;
  onToggleMicrophone?: () => void | Promise<void>;
  state?: AgentSideBarState;
  voiceName?: string;
};

const hostNames = ["Masa", "Sam", "Elon"];
const hostAvatars = [
  "/agent-sidebar/avatar-1.png",
  "/agent-sidebar/avatar-2.png",
  "/agent-sidebar/avatar-3.png",
  "/agent-sidebar/avatar-4.png",
];

const voiceOptions = [
  {
    avatar: "/agent-sidebar/avatar-1.png",
    description: "Warm, direct, reflective",
    name: "Masa Son",
  },
  {
    avatar: "/agent-sidebar/avatar-2.png",
    description: "Calm, precise, product-minded",
    name: "Sam Altman",
  },
  {
    avatar: "/agent-sidebar/avatar-3.png",
    description: "Fast, energetic, technical",
    name: "Elon Musk",
  },
  {
    avatar: "/agent-sidebar/avatar-4.png",
    description: "Neutral test voice",
    name: "Portfolio Agent",
  },
];

const defaultMessages: AgentSideBarMessage[] = [
  {
    id: "1",
    role: "agent",
    text: "Hi, I am listening. Ask me anything.",
  },
  {
    id: "2",
    role: "user",
    text: "Can you help me pressure test the portfolio voice flow?",
  },
  {
    id: "3",
    role: "agent",
    text: "Yes. I will keep the responses concise and conversational.",
  },
];

const surfaceStyle = {
  "--agent-sidebar-surface": "var(--color-background-primary)",
  "--agent-sidebar-text": "var(--color-text-primary)",
  "--agent-sidebar-muted": "var(--color-text-secondary)",
  "--agent-sidebar-border": "var(--color-border-opaque)",
  "--agent-sidebar-shadow": "0 3px 3px rgba(0, 0, 0, 0.03)",
  "--agent-sidebar-menu-shadow": "0 12px 32px rgba(0, 0, 0, 0.12)",
} as CSSProperties;

function AgentTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "font-title text-[length:var(--font-font-size-title)] font-[var(--font-font-weight-regular)] leading-[var(--font-line-height-lh-title)] tracking-[var(--font-letter-spacing-title)] text-[var(--agent-sidebar-text)]",
        className,
      )}
    >
      {children}
    </h2>
  );
}

function HostAvatar({ index, name }: { index: number; name: string }) {
  return (
    <div
      aria-label={name}
      className="relative size-[24px] shrink-0 overflow-hidden rounded-token-round"
    >
      <img
        alt=""
        className="absolute inset-0 size-full object-cover"
        src={hostAvatars[index]}
      />
    </div>
  );
}

function HostStack() {
  return (
    <div className="flex h-[24px] items-center justify-center">
      {hostAvatars.map((_, index) => (
        <div
          className={cn(index > 0 && "-ml-token-8")}
          key={hostAvatars[index]}
          style={{ zIndex: hostAvatars.length - index }}
        >
          <HostAvatar
            index={index}
            name={hostNames[index] ?? `Host ${index + 1}`}
          />
        </div>
      ))}
    </div>
  );
}

function PrimaryAction({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      className="inline-flex h-[38px] items-center justify-center rounded-token-s bg-[var(--color-bg-secondary)] px-token-12 font-body text-[length:var(--font-font-size-cta)] font-[var(--font-font-weight-medium)] leading-[var(--font-line-height-lh-subtext)] text-[var(--color-text-inverse-primary)] transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-selected)]"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export function MicSelector({
  enabled,
  onToggle,
}: {
  enabled?: boolean;
  onToggle?: () => void | Promise<void>;
}) {
  const Icon = enabled ? Mic : MicOff;

  return (
    <div
      className={cn(
        "flex h-[36px] min-w-[72px] items-center rounded-token-round",
        enabled
          ? "bg-[var(--color-background-secondary)] text-[var(--color-text-primary)]"
          : "bg-[var(--color-background-error-bg)] text-[var(--color-text-negative)]",
      )}
      data-state={enabled ? "listening" : "muted"}
    >
      <button
        aria-label={enabled ? "Mute microphone" : "Unmute microphone"}
        aria-pressed={enabled}
        className="flex h-full flex-1 items-center justify-center rounded-l-token-round pl-token-12 pr-token-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-selected)]"
        onClick={() => {
          void onToggle?.();
        }}
        type="button"
      >
        <Icon className="size-[18px]" strokeWidth={2.3} />
      </button>
      <button
        aria-label="Select microphone"
        className={cn(
          "relative flex h-full w-[36px] items-center justify-center rounded-r-token-round pl-token-8 pr-token-12 before:absolute before:left-0 before:top-1/2 before:h-token-16 before:w-px before:-translate-y-1/2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-selected)]",
          enabled
            ? "before:bg-[var(--color-bg-secondary)]"
            : "before:bg-[var(--color-core-negative)]",
        )}
        type="button"
      >
        <ChevronDown className="size-[16px]" strokeWidth={2.3} />
      </button>
    </div>
  );
}

export function VoiceSelector({
  avatar,
  isOpen,
  onClick,
  voiceName = "Masa Son",
}: {
  avatar?: string;
  isOpen?: boolean;
  onClick?: () => void;
  voiceName?: string;
}) {
  return (
    <button
      aria-label="Select voice"
      aria-expanded={isOpen}
      className="inline-flex h-[36px] max-w-[139px] items-center justify-center gap-token-8 rounded-token-round border border-[var(--color-border-subtle)] bg-[var(--agent-sidebar-surface)] px-token-16 py-token-8 text-left"
      onClick={onClick}
      type="button"
    >
      <span className="relative flex size-[16px] shrink-0 items-center justify-center overflow-hidden rounded-token-round bg-[var(--color-bg-secondary)] font-body text-[length:var(--font-font-size-caption)] font-[var(--font-font-weight-semi-bold)] leading-none text-[var(--color-text-inverse-primary)]">
        {avatar ? (
          <img
            alt=""
            className="absolute inset-0 size-full object-cover"
            src={avatar}
          />
        ) : (
          voiceName.slice(0, 1)
        )}
      </span>
      <span className="min-w-0 flex-1 truncate font-body text-[length:var(--font-font-size-body)] font-[var(--font-font-weight-semi-bold)] leading-[var(--font-line-height-lh-body)] text-[var(--agent-sidebar-text)]">
        {voiceName}
      </span>
      <ChevronDown className="size-[12px] shrink-0 text-[var(--agent-sidebar-muted)]" />
    </button>
  );
}

function VoicePanel({
  onSelect,
  selectedVoice,
}: {
  onSelect: (voiceName: string) => void;
  selectedVoice: string;
}) {
  return (
    <div className="absolute bottom-full left-0 z-10 mb-token-8 w-[341px] max-w-[calc(100vw-var(--spacing-48))] rounded-token-m border border-[var(--color-border-opaque)] bg-[var(--agent-sidebar-surface)] p-token-8 shadow-[var(--agent-sidebar-menu-shadow)]">
      <div className="flex flex-col gap-token-4">
        {voiceOptions.map((voice) => {
          const selected = voice.name === selectedVoice;

          return (
            <button
              className={cn(
                "flex w-full items-center gap-token-12 rounded-token-s px-token-12 py-token-8 text-left transition hover:bg-[var(--color-background-secondary)]",
                selected && "bg-[var(--color-background-secondary)]",
              )}
              key={voice.name}
              onClick={() => onSelect(voice.name)}
              type="button"
            >
              <span className="relative size-[32px] shrink-0 overflow-hidden rounded-token-round">
                <img
                  alt=""
                  className="absolute inset-0 size-full object-cover"
                  src={voice.avatar}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-body text-[length:var(--font-font-size-body)] font-[var(--font-font-weight-semi-bold)] leading-[var(--font-line-height-lh-body)] text-[var(--agent-sidebar-text)]">
                  {voice.name}
                </span>
                <span className="block truncate font-body text-[length:var(--font-font-size-caption)] leading-[var(--font-line-height-lh-caption)] text-[var(--agent-sidebar-muted)]">
                  {voice.description}
                </span>
              </span>
              {selected ? (
                <Check className="size-[16px] shrink-0 text-[var(--color-core-primary-a)]" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SendButton({
  disabled,
  isSending,
  onClick,
}: {
  disabled?: boolean;
  isSending?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      aria-label={isSending ? "Sending message" : "Send message"}
      className="flex size-[36px] shrink-0 items-center justify-center rounded-token-round bg-[var(--color-core-primary-a)] text-[var(--color-text-inverse-primary)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-[var(--color-background-selected)]"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <ArrowUp className="size-[20px]" />
    </button>
  );
}

function StopButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      aria-label="Stop response"
      className="flex size-[36px] shrink-0 items-center justify-center rounded-token-round bg-[var(--color-core-primary-a)] text-[var(--color-text-inverse-primary)] transition hover:opacity-90"
      onClick={onClick}
      type="button"
    >
      <Square className="size-[16px] fill-current" />
    </button>
  );
}

function EndChatButton({ onEnd }: { onEnd?: () => void }) {
  return (
    <button
      className="inline-flex h-[36px] shrink-0 items-center justify-center rounded-token-s bg-[var(--color-core-primary-a)] px-token-12 py-token-8 font-body text-[length:var(--font-font-size-body)] font-[var(--font-font-weight-semi-bold)] leading-[var(--font-line-height-lh-body)] text-[var(--color-text-inverse-primary)] transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-selected)]"
      onClick={onEnd}
      type="button"
    >
      End Chat
    </button>
  );
}

function AgentPromptBar({
  inputValue = "",
  isMicrophoneEnabled,
  isSending,
  onChangeInput,
  onEnd,
  onSend,
  onStopResponse,
  onToggleMicrophone,
  state,
  voiceName,
}: Pick<
  AgentSideBarProps,
  | "inputValue"
  | "isMicrophoneEnabled"
  | "isSending"
  | "onChangeInput"
  | "onEnd"
  | "onSend"
  | "onStopResponse"
  | "onToggleMicrophone"
  | "state"
  | "voiceName"
>) {
  const [isVoicePanelOpen, setIsVoicePanelOpen] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(voiceName ?? "Masa Son");
  const hasInput = inputValue.trim().length > 0;
  const isTyping = state === "user-typing" || hasInput;
  const isStreaming = state === "agent-streaming";
  const placeholder = "How are you feeling today?";
  const selectedVoiceOption =
    voiceOptions.find((voice) => voice.name === selectedVoice) ??
    voiceOptions.find((voice) => voice.name === "Masa Son");

  return (
    <div className="w-full rounded-[31px] border border-[var(--agent-sidebar-border)] bg-[var(--agent-sidebar-surface)] px-token-20 py-token-16 shadow-[var(--agent-sidebar-shadow)]">
      <div className="flex h-[74px] flex-col justify-between gap-token-20">
        <div className="flex h-[28px] items-center gap-token-8 px-token-4">
          <input
            aria-label="Message"
            className="min-w-0 flex-1 bg-transparent font-body text-[length:var(--font-font-size-body)] font-[var(--font-font-weight-regular)] leading-[var(--font-line-height-lh-body)] text-[var(--agent-sidebar-text)] outline-none placeholder:text-[var(--agent-sidebar-muted)]"
            onChange={(event) => onChangeInput?.(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (hasInput) void onSend?.(inputValue.trim());
              }
            }}
            placeholder={placeholder}
            value={inputValue}
          />
          <Settings2 className="size-[20px] shrink-0 text-[var(--agent-sidebar-muted)]" />
        </div>

        <div className="flex items-start justify-between">
          <div className="relative flex items-center gap-token-4">
            {isVoicePanelOpen ? (
              <VoicePanel
                onSelect={(nextVoice) => {
                  setSelectedVoice(nextVoice);
                  setIsVoicePanelOpen(false);
                }}
                selectedVoice={selectedVoice}
              />
            ) : null}
            <MicSelector
              enabled={isMicrophoneEnabled}
              onToggle={onToggleMicrophone}
            />
            <VoiceSelector
              avatar={selectedVoiceOption?.avatar}
              isOpen={isVoicePanelOpen}
              onClick={() => setIsVoicePanelOpen((open) => !open)}
              voiceName={selectedVoice}
            />
          </div>
          <div className="ml-auto">
            {isStreaming ? (
              <StopButton onClick={onStopResponse} />
            ) : isTyping ? (
              <SendButton
                disabled={!hasInput || isSending}
                isSending={isSending}
                onClick={() => {
                  if (hasInput) void onSend?.(inputValue.trim());
                }}
              />
            ) : (
              <EndChatButton onEnd={onEnd} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChatMessage({
  message,
  sources = [],
}: {
  message: AgentSideBarMessage;
  sources?: SourceData[];
}) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex w-full flex-col",
        isUser ? "items-end pb-token-16 pt-0" : "items-start pb-token-20",
      )}
      data-testid={
        isUser ? "desktop-chat-message-user" : "desktop-chat-message-ai"
      }
    >
      <div
        className={cn(
          "font-body text-[length:var(--font-font-size-subtext)] font-[var(--font-font-weight-regular)] tracking-normal",
          message.isStreaming && "ds-text-shimmer inline-block",
          isUser
            ? "max-w-[404px] rounded-[22px] bg-[var(--color-core-primary-a)] px-token-16 py-token-8 leading-[var(--font-line-height-lh-heading)] text-[var(--color-text-inverse-primary)]"
            : "max-w-[477px] pb-token-4 leading-[var(--font-line-height-lh-title)] text-[var(--color-text-primary)]",
        )}
      >
        {message.text}
      </div>
      {!isUser && sources.length > 0 ? <SourcesRail sources={sources} /> : null}
    </div>
  );
}

function ChatConversation({
  latestSearchSources = [],
  messages,
}: {
  latestSearchSources?: SourceData[];
  messages: AgentSideBarMessage[];
}) {
  const sourcedMessageId = getLatestAgentMessageId(messages);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pr-token-4 [scrollbar-width:thin]">
      {messages.map((message) => (
        <ChatMessage
          key={message.id}
          message={message}
          sources={message.id === sourcedMessageId ? latestSearchSources : []}
        />
      ))}
    </div>
  );
}

function getLatestAgentMessageId(messages: AgentSideBarMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === "agent") {
      return message.id;
    }
  }

  return null;
}

function ErrorToast({ message }: { message: string }) {
  return (
    <div className="mb-token-16 flex min-h-[48px] w-full items-center gap-token-12 rounded-token-m bg-[var(--color-state-error)] px-token-16 py-token-12 text-[var(--color-text-inverse)]">
      <CircleAlert className="size-[18px] shrink-0" />
      <span className="font-body text-[length:var(--font-font-size-body)] leading-[var(--font-line-height-lh-body)]">
        {message}
      </span>
    </div>
  );
}

function IntroState({ onStart }: { onStart?: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-token-24 text-center">
      <HostStack />
      <AgentTitle className="mt-token-8 w-[404px] max-w-full font-[var(--font-font-weight-medium)] text-[var(--color-text-primary)]">
        Chat with Masa Son, Sam Altman, Elon Musk
      </AgentTitle>
      <div className="mt-token-16">
        <PrimaryAction onClick={onStart}>Chat</PrimaryAction>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-token-24 text-center">
      <img
        alt=""
        className="h-[164px] w-[269px] object-contain"
        src="/agent-sidebar/cloud.png"
      />
      <p className="mt-token-24 max-w-[292px] font-body text-[length:var(--font-font-size-body)] leading-[var(--font-line-height-lh-body)] text-[var(--agent-sidebar-muted)]">
        Watch the clouds move while we connect you to their consciousness
      </p>
    </div>
  );
}

export function AgentSideBar({
  className,
  errorMessage = "Could not start voice session. Run the token probe and share the endpoint status with engineering.",
  inputValue = "",
  isMicrophoneEnabled = true,
  isSending = false,
  isThinking = false,
  latestSearchSources = [],
  messages = defaultMessages,
  onChangeInput,
  onEnd,
  onSend,
  onStart,
  onStopResponse,
  onToggleMicrophone,
  state = "intro",
  voiceName = "Masa Son",
}: AgentSideBarProps) {
  const showConversation = !["intro", "loading"].includes(state);
  const resolvedMessages =
    state === "begin"
      ? []
      : state === "agent-streaming" || isThinking
        ? [
            ...messages,
            {
              id: "streaming",
              isStreaming: true,
              role: "agent" as const,
              text: "Thinking",
            },
          ]
        : messages;

  return (
    <aside
      className={cn(
        "relative flex h-[1117px] w-[428px] max-w-full flex-col overflow-hidden border-l border-[var(--agent-sidebar-border)] bg-[var(--agent-sidebar-surface)] p-token-24 text-[var(--agent-sidebar-text)]",
        className,
      )}
      data-state={state}
      style={surfaceStyle}
    >
      {state === "intro" ? <IntroState onStart={onStart} /> : null}
      {state === "loading" ? <LoadingState /> : null}

      {showConversation ? (
        <div className="flex min-h-0 flex-1 flex-col">
          {state === "begin" ? (
            <div className="flex flex-1 items-center justify-center text-center">
              <AgentTitle className="w-full">Ask a question</AgentTitle>
            </div>
          ) : (
            <ChatConversation
              latestSearchSources={latestSearchSources}
              messages={resolvedMessages}
            />
          )}

          <div className="mt-token-24 shrink-0">
            {state === "error" ? <ErrorToast message={errorMessage} /> : null}
            <AgentPromptBar
              inputValue={inputValue}
              isMicrophoneEnabled={isMicrophoneEnabled}
              isSending={isSending}
              onChangeInput={onChangeInput}
              onEnd={onEnd}
              onSend={onSend}
              onStopResponse={onStopResponse}
              onToggleMicrophone={onToggleMicrophone}
              state={state}
              voiceName={voiceName}
            />
          </div>
        </div>
      ) : null}
    </aside>
  );
}
