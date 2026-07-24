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
  mobileConnectingOrbSize: 162,
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
    <div className={cn("flex h-[24px] items-center justify-center", className)}>
      {hostAvatars.map((avatar, index) => (
        <VoiceAvatar
          avatar={avatar}
          className={cn(index > 0 && "-ml-[8px]")}
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
      <span className="flex h-full items-center px-[12px]">
        <Icon className="size-[18px]" strokeWidth={2.2} />
      </span>
      <span className="h-[16px] w-px bg-[#d9d9d9]" />
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
        "font-body flex h-[113px] w-[144px] flex-col items-start justify-end rounded-[10px] p-[12px] text-left text-[#121318]",
        state === "default" && "bg-[#f5f5f5]",
        state === "hovered" && "bg-[#e8e8e8]",
        state === "selected" && "bg-[#dcdcdc]",
        className,
      )}
      data-state={state}
      type="button"
    >
      <VoiceAvatar avatar={voice.avatar} name={voice.name} size={48} />
      <span className="mt-[8px] text-[16px] leading-[18px] font-[700]">
        {voice.name}
      </span>
      <span className="text-[14px] leading-[18px] text-[#595a5d]">
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
        "inline-flex h-[36px] items-center gap-[8px] rounded-full border border-[#e5e5e5] bg-white px-[15px] text-[#121318]",
        className,
      )}
      onClick={onClick}
      type="button"
    >
      <VoiceAvatar avatar={voice.avatar} name={voice.name} size={16} />
      <span className="font-body text-[14px] leading-[20px] font-[700]">
        {voice.name}
      </span>
      <ChevronDown className="size-[12px] text-[#8c8d90]" />
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
        "font-body flex h-[var(--ds-agent-control-voice-panel-height)] w-[var(--ds-agent-control-voice-panel-width)] flex-col gap-[10px] rounded-[18px] border border-[#dcdcdc] bg-[#f7f7f7] px-[20px] py-[18px] text-[#121318] shadow-[0_18px_40px_rgba(18,19,24,0.08)]",
        className,
      )}
    >
      <h2 className="text-[14px] leading-[20px] font-[700]">Voice</h2>
      <div className="grid grid-cols-2 gap-[12px]">
        {voices.map((option) => {
          const selected = option.name === selectedVoiceName;

          return (
            <button
              className={cn(
                "flex h-[112px] flex-col items-start justify-end rounded-[12px] border p-[12px] text-left transition-colors",
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
                size={48}
              />
              <span className="mt-[8px] text-[16px] leading-[18px] font-[700]">
                {option.name}
              </span>
              <span className="text-[14px] leading-[18px] text-[#595a5d]">
                {option.description}
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
        <div className="flex min-w-0 items-center gap-[8px]">
          <MicSelector state="outlined" onClick={onToggleMicrophone} />
          <VoiceSelectorPill
            className="max-w-[160px] [&>span:nth-child(2)]:truncate"
            onClick={onOpenVoicePanel}
            voice={voice}
          />
        </div>
        <DesignSystemButton
          buttonType="primary"
          className="h-[36px] w-auto shrink-0 rounded-[12px] bg-[#050505] px-[16px] text-white"
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
        "flex h-[var(--ds-agent-control-bar-height)] w-[var(--ds-agent-control-bar-width)] flex-col justify-between rounded-[31px] border border-[#dcdcdc] bg-white px-[20px] py-[16px] shadow-[0_3px_12px_rgba(0,0,0,0.06)]",
        className,
      )}
      data-state={state}
    >
      <div className="flex h-[28px] items-center gap-[8px]">
        <input
          aria-label="Message"
          className="font-body min-w-0 flex-1 bg-transparent text-[14px] leading-[20px] font-[400] text-[#595a5d] outline-none placeholder:text-[#595a5d]"
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
        <div className="flex items-center gap-[4px]">
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
            <ArrowUp className="size-[20px]" />
          </button>
        ) : (
          <DesignSystemButton
            buttonType="primary"
            className="h-[36px] w-auto rounded-[12px] bg-[#050505] px-[16px] text-white"
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
          "font-body text-[16px] leading-[26px] font-[400] text-[#1e1f24]",
          (pending || message.isStreaming) && "ds-text-shimmer",
          isUser &&
            "max-w-[343px] rounded-[22px] bg-[#050505] px-[16px] py-[10px] text-white md:max-w-[404px]",
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
    <div className={cn("flex w-[477px] flex-col gap-[12px]", className)}>
      {resolvedMessages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
    </div>
  );
}
