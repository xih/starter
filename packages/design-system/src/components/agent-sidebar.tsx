import { cn } from "../utils";
import { Toast } from "./primitives/toast";
import { AgentControlBar, ChatConversation, MultipleHosts } from "./voice";

export type AgentSideBarState =
  | "intro"
  | "loading"
  | "begin"
  | "agent-streaming"
  | "idle"
  | "user-typing"
  | "error";

export type AgentSideBarProps = {
  className?: string;
  inputValue?: string;
  isMicrophoneEnabled?: boolean;
  onChangeInput?: (value: string) => void;
  onEnd?: () => void;
  onOpenVoicePanel?: () => void;
  onSend?: (value: string) => void | Promise<void>;
  onStart?: () => void;
  onStopResponse?: () => void | Promise<void>;
  onToggleMicrophone?: () => void | Promise<void>;
  onUseVoice?: () => void;
  state?: AgentSideBarState;
};

export function AgentSideBar({
  className,
  inputValue,
  isMicrophoneEnabled,
  onChangeInput,
  onEnd,
  onOpenVoicePanel,
  onSend,
  onStart,
  onStopResponse,
  onToggleMicrophone,
  onUseVoice,
  state = "intro",
}: AgentSideBarProps) {
  const showConversation =
    state === "agent-streaming" ||
    state === "idle" ||
    state === "user-typing" ||
    state === "error";

  return (
    <div
      className={cn(
        "pt-token-24 relative flex h-[1117px] w-[428px] flex-col overflow-hidden border border-[#eeeeee] bg-white px-[36px] pb-[26px] text-[#121318]",
        className,
      )}
      data-state={state}
    >
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        {state === "intro" ? (
          <>
            <MultipleHosts />
            <h2 className="font-title mt-token-8 max-w-[360px] text-[26px] font-[700] leading-[31px]">
              Chat with Masa Son, Sam Altman, Elon Musk
            </h2>
            <button
              className="font-body mt-token-16 h-token-32 rounded-token-xs bg-[#121318] px-[14px] text-[14px] font-[700] text-white"
              onClick={onStart}
              type="button"
            >
              Chat
            </button>
          </>
        ) : state === "loading" ? (
          <>
            <img
              alt=""
              className="h-[140px] w-[228px] object-cover"
              src="/agent-sidebar/cloud.png"
            />
            <p className="font-body mt-token-12 max-w-[228px] text-[12px] font-[700] leading-[15px]">
              Watch the clouds move while we connect you to their consciousness
            </p>
          </>
        ) : state === "begin" ? (
          <h2 className="font-title text-[24px] font-[700] leading-[31px]">
            Ask a question
          </h2>
        ) : showConversation ? (
          <div className="pt-token-40 w-full self-stretch text-left">
            <ChatConversation className="w-full" />
          </div>
        ) : null}
      </div>
      {state === "error" ? (
        <Toast className="mb-token-12 w-full" state="error">
          Error message here
        </Toast>
      ) : null}
      <AgentControlBar
        className="w-full"
        inputValue={inputValue}
        isMicrophoneEnabled={isMicrophoneEnabled}
        onChangeInput={onChangeInput}
        onEnd={onEnd}
        onOpenVoicePanel={onOpenVoicePanel}
        onSend={onSend}
        onStopResponse={onStopResponse}
        onToggleMicrophone={onToggleMicrophone}
        onUseVoice={onUseVoice}
        state={
          state === "user-typing"
            ? "user-typing"
            : state === "agent-streaming" ||
                state === "begin" ||
                state === "error"
              ? "agent-streaming"
              : "default"
        }
      />
    </div>
  );
}
