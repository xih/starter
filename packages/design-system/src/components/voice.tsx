import {
  ArrowUp,
  ChevronDown,
  Mic,
  MicOff,
  Settings2,
  SlidersHorizontal,
  Square,
} from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "../utils";
import { DesignSystemButton } from "./primitives/button";

export type VoiceOption = {
  avatar?: string;
  description?: string;
  name: string;
};

export type MicSelectorProps = {
  className?: string;
  state?: "muted" | "listening" | "outlined";
};

export type VoiceSelectorProps = {
  className?: string;
  state?: "default" | "hovered" | "selected";
  voice?: VoiceOption;
};

export type AgentControlBarState =
  | "default"
  | "user-typing"
  | "agent-streaming";

export type AgentControlBarProps = {
  className?: string;
  inputValue?: string;
  state?: AgentControlBarState;
  voice?: VoiceOption;
};

export type ChatMessageData = {
  id: string;
  role: "system" | "user";
  text: string;
};

const defaultVoice: VoiceOption = {
  avatar: "/agent-sidebar/avatar-1.png",
  description: "Apple founder",
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
  state = "listening",
}: MicSelectorProps) {
  const muted = state === "muted";
  const outlined = state === "outlined";
  const Icon = muted ? MicOff : Mic;

  return (
    <button
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
  voice = defaultVoice,
}: {
  className?: string;
  voice?: VoiceOption;
}) {
  return (
    <button
      className={cn(
        "inline-flex h-[36px] items-center gap-[8px] rounded-full border border-[#e5e5e5] bg-white px-[15px] text-[#121318]",
        className,
      )}
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

export function VoiceParameterPanel({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "font-body flex h-[181px] w-[341px] flex-col gap-[14px] rounded-[12px] border border-[#e5e5e5] bg-white p-[16px] text-[#121318]",
        className,
      )}
    >
      {["Stability", "Similarity", "Style"].map((label, index) => (
        <label
          className="grid grid-cols-[86px_1fr_34px] items-center gap-[10px]"
          key={label}
        >
          <span className="text-[13px] leading-[18px] font-[600]">{label}</span>
          <span className="relative h-[4px] rounded-full bg-[#eeeeee]">
            <span
              className="absolute top-0 left-0 h-full rounded-full bg-[#121318]"
              style={{ width: `${[58, 72, 36][index]}%` }}
            />
          </span>
          <span className="text-right text-[12px] text-[#595a5d]">
            {[58, 72, 36][index]}
          </span>
        </label>
      ))}
    </div>
  );
}

export function AgentControlBar({
  className,
  inputValue,
  state = "default",
  voice = defaultVoice,
}: AgentControlBarProps) {
  const isTyping = state === "user-typing";
  const isStreaming = state === "agent-streaming";

  return (
    <div
      className={cn(
        "flex h-[108px] w-[448px] flex-col justify-between rounded-[31px] border border-[#dcdcdc] bg-white px-[20px] py-[16px] shadow-[0_3px_12px_rgba(0,0,0,0.06)]",
        className,
      )}
      data-state={state}
    >
      <div className="flex h-[28px] items-center gap-[8px]">
        <input
          aria-label="Message"
          className="font-body min-w-0 flex-1 bg-transparent text-[14px] leading-[20px] text-[#1e1f24] outline-none placeholder:text-[#595a5d]"
          placeholder="How are you feeling today?"
          readOnly
          value={inputValue ?? (isTyping ? "Bonjourno" : "")}
        />
        <Settings2 className="size-[18px] text-[#d0d0d1]" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-[4px]">
          <MicSelector />
          <button
            className="inline-flex size-[36px] items-center justify-center rounded-full border border-[#eeeeee] bg-white text-[#d0d0d1]"
            type="button"
          >
            <SlidersHorizontal className="size-[16px]" />
          </button>
          <VoiceSelectorPill voice={voice} />
        </div>
        {isStreaming ? (
          <button
            className="flex size-[36px] items-center justify-center rounded-full bg-[#121318] text-white"
            type="button"
          >
            <Square className="size-[14px] fill-current" />
          </button>
        ) : isTyping ? (
          <button
            className="flex size-[36px] items-center justify-center rounded-full bg-[#121318] text-white"
            type="button"
          >
            <ArrowUp className="size-[20px]" />
          </button>
        ) : (
          <DesignSystemButton
            buttonType="primary"
            className="h-[36px] w-auto rounded-[12px] bg-[#050505] px-[16px] text-white"
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

export function ChatMessage({ message }: { message: ChatMessageData }) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn("flex w-[477px]", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "font-body text-[16px] leading-[26px] font-[400] text-[#1e1f24]",
          isUser &&
            "max-w-[404px] rounded-[22px] bg-[#050505] px-[16px] py-[10px] text-white",
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
