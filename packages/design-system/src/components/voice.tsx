import { ArrowUp, ChevronDown, Mic, MicOff, Square } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "../utils";
import { DesignSystemButton } from "./primitives/button";

export type VoiceOption = {
  avatar?: string;
  description?: string;
  id?: string;
  name: string;
};

export type MicSelectorProps = {
  className?: string;
  onClick?: () => void;
  state?: "muted" | "listening" | "outlined";
};

export type VoiceSelectorProps = {
  className?: string;
  state?: "default" | "hovered" | "selected";
  voice?: VoiceOption;
};

export type AgentControlBarState =
  | "default"
  | "pre-connected"
  | "user-typing"
  | "agent-streaming";

export type AgentControlBarProps = {
  className?: string;
  idleAction?: "end" | "send";
  inputValue?: string;
  isMicrophoneEnabled?: boolean;
  onChangeInput?: (value: string) => void;
  onEnd?: () => void;
  onOpenVoicePanel?: () => void;
  onSend?: (value: string) => void | Promise<void>;
  onStopResponse?: () => void | Promise<void>;
  onToggleMicrophone?: () => void | Promise<void>;
  onUseVoice?: () => void;
  state?: AgentControlBarState;
  voice?: VoiceOption;
};

export type ChatMessageData = {
  id: string;
  isStreaming?: boolean;
  role: "system" | "user";
  text: string;
};

export const agentControlBarLayout = {
  mobileConnectingOrbSize: 66,
  mobileOrbSize: 66,
} as const;

const defaultVoice: VoiceOption = {
  avatar: "/agent-sidebar/avatar-1.png",
  description: "Softbank",
  name: "Masa Son",
};

const hostAvatars = [
  "/agent-sidebar/avatar-1.png",
  "/agent-sidebar/avatar-2.png",
  "/agent-sidebar/avatar-3.png",
  "/agent-sidebar/avatar-4.png",
];

export function VoiceAvatar({
  avatar = defaultVoice.avatar,
  className,
  name = defaultVoice.name,
  size = 48,
}: {
  avatar?: string;
  className?: string;
  name?: string;
  size?: number;
}) {
  return (
    <span
      aria-label={name}
      className={cn(
        "relative inline-flex shrink-0 overflow-hidden rounded-full bg-[#e8e8e8]",
        className,
      )}
      style={{ height: size, width: size }}
    >
      {avatar ? (
        <img
          alt=""
          className="absolute inset-0 size-full object-cover"
          src={avatar}
        />
      ) : null}
    </span>
  );
}

export function MultipleHosts({ className }: { className?: string }) {
  return (
    <div
      className={cn("h-token-24 flex items-center justify-center", className)}
    >
      {hostAvatars.map((avatar, index) => (
        <VoiceAvatar
          avatar={avatar}
          className={cn(index > 0 && "-ml-token-8")}
          key={avatar}
          name={`Host ${index + 1}`}
          size={24}
        />
      ))}
    </div>
  );
}

export function MicSelector({
  className,
  onClick,
  state = "listening",
}: MicSelectorProps) {
  const muted = state === "muted";
  const outlined = state === "outlined";
  const Icon = muted ? MicOff : Mic;

  return (
    <button
      aria-label={muted ? "Unmute microphone" : "Mute microphone"}
      className={cn(
        "inline-flex h-[36px] min-w-[72px] items-center justify-center rounded-full text-[#121318]",
        outlined
          ? "border border-[#d9d9d9] bg-white"
          : muted
            ? "bg-[#f3d5dc]"
            : "bg-[#f4f4f4]",
        className,
      )}
      data-state={state}
      onClick={onClick}
      type="button"
    >
      <span className="px-token-12 flex h-full items-center">
        <Icon className="size-[18px]" strokeWidth={2.2} />
      </span>
      <span className="h-token-16 w-px bg-[#d9d9d9]" />
      <span className="flex h-full items-center px-[10px]">
        <ChevronDown className="size-[14px]" />
      </span>
    </button>
  );
}

export function VoiceSelector({
  className,
  state = "default",
  voice = defaultVoice,
}: VoiceSelectorProps) {
  return (
    <button
      className={cn(
        "font-body p-token-12 flex h-[113px] w-[144px] flex-col items-start justify-end rounded-[10px] text-left text-[#121318]",
        state === "default" && "bg-[#f5f5f5]",
        state === "hovered" && "bg-[#e8e8e8]",
        state === "selected" && "bg-[#dcdcdc]",
        className,
      )}
      data-state={state}
      type="button"
    >
      <VoiceAvatar avatar={voice.avatar} name={voice.name} size={48} />
      <span className="mt-token-8 text-cta leading-lhBody font-[700]">
        {voice.name}
      </span>
      <span className="leading-lhBody text-[14px] text-[#595a5d]">
        {voice.description}
      </span>
    </button>
  );
}

export function VoiceSelectorPill({
  className,
  onClick,
  voice = defaultVoice,
}: {
  className?: string;
  onClick?: () => void;
  voice?: VoiceOption;
}) {
  return (
    <button
      aria-label="Select voice"
      className={cn(
        "gap-token-8 inline-flex h-[36px] items-center rounded-full border border-[#e5e5e5] bg-white px-[15px] text-[#121318]",
        className,
      )}
      onClick={onClick}
      type="button"
    >
      <VoiceAvatar avatar={voice.avatar} name={voice.name} size={16} />
      <span className="font-body text-[14px] font-[700] leading-[20px]">
        {voice.name}
      </span>
      <ChevronDown className="size-token-12 text-[#8c8d90]" />
    </button>
  );
}

export function VoiceParameterPanel({
  className,
  onSelectVoice,
  selectedVoiceName = defaultVoice.name,
  voices = [
    {
      avatar: "/agent-sidebar/avatar-1.png",
      description: "Apple founder",
      name: "Steve Jobs",
    },
    defaultVoice,
  ],
}: {
  className?: string;
  onSelectVoice?: (voice: VoiceOption) => void;
  selectedVoiceName?: string;
  voices?: VoiceOption[];
}) {
  return (
    <div
      className={cn(
        "font-body px-token-20 flex h-[var(--ds-agent-control-voice-panel-height)] w-[var(--ds-agent-control-voice-panel-width)] flex-col gap-[10px] rounded-[18px] border border-[#dcdcdc] bg-[#f7f7f7] py-[18px] text-[#121318] shadow-[0_18px_40px_rgba(18,19,24,0.08)]",
        className,
      )}
    >
      <h2 className="shrink-0 text-[14px] font-[700] leading-[20px]">Voice</h2>
      <div className="space-y-token-8 pr-token-4 min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
        {voices.map((option) => {
          const selected = option.name === selectedVoiceName;

          return (
            <button
              className={cn(
                "rounded-token-s py-token-8 flex min-h-[60px] w-full shrink-0 items-center gap-[10px] border px-[10px] text-left transition-colors",
                selected
                  ? "border-[#dcdcdc] bg-[#e8e8e8]"
                  : "border-[#e5e5e5] bg-white",
              )}
              key={option.name}
              onClick={() => onSelectVoice?.(option)}
              type="button"
            >
              <VoiceAvatar
                avatar={option.avatar}
                name={option.name}
                size={40}
              />
              <span className="min-w-0 flex-1">
                <span className="text-cta leading-lhBody block truncate font-[700]">
                  {option.name}
                </span>
                <span className="leading-lhBody block truncate text-[14px] text-[#595a5d]">
                  {option.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AgentControlBar({
  className,
  idleAction = "end",
  inputValue,
  isMicrophoneEnabled = true,
  onChangeInput,
  onEnd,
  onOpenVoicePanel,
  onSend,
  onStopResponse,
  onToggleMicrophone,
  onUseVoice,
  state = "default",
  voice = defaultVoice,
}: AgentControlBarProps) {
  const isPreConnected = state === "pre-connected";
  const isTyping = state === "user-typing";
  const isStreaming = state === "agent-streaming";
  const resolvedInputValue = inputValue ?? (isTyping ? "Bonjourno" : "");
  const micState = isMicrophoneEnabled ? "listening" : "muted";
  const sendInput = () => {
    const trimmedValue = resolvedInputValue.trim();

    if (trimmedValue.length > 0) {
      void onSend?.(trimmedValue);
    }
  };

  if (isPreConnected) {
    return (
      <div
        className={cn(
          "flex h-[var(--ds-agent-control-bar-preconnected-height)] w-[var(--ds-agent-control-bar-width)] items-center justify-between rounded-[35px] border border-[#dcdcdc] bg-white px-[14px] shadow-[0_3px_12px_rgba(0,0,0,0.03)]",
          className,
        )}
        data-state={state}
      >
        <div className="gap-token-8 flex min-w-0 items-center">
          <MicSelector state="outlined" onClick={onToggleMicrophone} />
          <VoiceSelectorPill
            className="max-w-[160px] [&>span:nth-child(2)]:truncate"
            onClick={onOpenVoicePanel}
            voice={voice}
          />
        </div>
        <DesignSystemButton
          buttonType="primary"
          className="rounded-token-s px-token-16 h-[36px] w-auto shrink-0 bg-[#050505] text-white"
          onClick={onUseVoice}
          showIcon={false}
          size="small"
        >
          Use Voice
        </DesignSystemButton>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "px-token-20 py-token-16 flex h-[var(--ds-agent-control-bar-height)] w-[var(--ds-agent-control-bar-width)] flex-col justify-between rounded-[31px] border border-[#dcdcdc] bg-white shadow-[0_3px_12px_rgba(0,0,0,0.06)]",
        className,
      )}
      data-state={state}
    >
      <div className="gap-token-8 flex h-[28px] items-center overflow-hidden">
        <input
          aria-label="Message"
          className="font-body font-regular w-[114.285714%] min-w-0 flex-none origin-left scale-[0.875] bg-transparent text-[16px] leading-[22.857143px] text-[#595a5d] outline-none placeholder:text-[#595a5d]"
          onChange={(event) => onChangeInput?.(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              sendInput();
            }
          }}
          placeholder="How are you feeling today?"
          readOnly={!onChangeInput}
          value={resolvedInputValue}
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="gap-token-4 flex items-center">
          <MicSelector state={micState} onClick={onToggleMicrophone} />
          <VoiceSelectorPill onClick={onOpenVoicePanel} voice={voice} />
        </div>
        {isStreaming ? (
          <button
            aria-label="Stop response"
            className="flex size-[36px] items-center justify-center rounded-full bg-[#121318] text-white"
            onClick={onStopResponse}
            type="button"
          >
            <Square className="size-[14px] fill-current" />
          </button>
        ) : isTyping || idleAction === "send" ? (
          <button
            aria-label="Send message"
            className="flex size-[36px] items-center justify-center rounded-full bg-[#121318] text-white"
            onClick={sendInput}
            type="button"
          >
            <ArrowUp className="size-token-20" />
          </button>
        ) : (
          <DesignSystemButton
            buttonType="primary"
            className="rounded-token-s px-token-16 h-[36px] w-auto bg-[#050505] text-white"
            onClick={onEnd}
            showIcon={false}
            size="small"
          >
            End Chat
          </DesignSystemButton>
        )}
      </div>
    </div>
  );
}

export function ChatMessage({
  className,
  message,
  pending = false,
}: {
  className?: string;
  message: ChatMessageData;
  pending?: boolean;
}) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex w-full md:w-[477px]",
        isUser ? "justify-end" : "justify-start",
        className,
      )}
      data-testid={isUser ? "chat-message-user" : "chat-message-ai"}
    >
      <div
        className={cn(
          "font-body text-cta font-regular leading-[26px] text-[#1e1f24]",
          (pending || message.isStreaming) && "ds-text-shimmer",
          isUser &&
            "px-token-16 max-w-[343px] rounded-[22px] bg-[#050505] py-[10px] text-white md:max-w-[404px]",
        )}
      >
        {message.text}
      </div>
    </div>
  );
}

export function ChatConversation({
  className,
  messages,
}: {
  className?: string;
  messages?: ChatMessageData[];
}) {
  const resolvedMessages = messages ?? [
    { id: "1", role: "user", text: "what's your name" },
    {
      id: "2",
      role: "system",
      text: "I'm ChatGPT - specifically GPT-5.5 Thinking.",
    },
    {
      id: "3",
      role: "system",
      text: "I can keep this concise, conversational, and grounded in what is on screen.",
    },
  ];

  return (
    <div className={cn("gap-token-12 flex w-[477px] flex-col", className)}>
      {resolvedMessages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
    </div>
  );
}
