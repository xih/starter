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
        "relative flex h-[1117px] w-[428px] flex-col overflow-hidden border border-[#eeeeee] bg-white px-[36px] pt-[24px] pb-[26px] text-[#121318]",
        className,
      )}
      data-state={state}
    >
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        {state === "intro" ? (
          <>
            <MultipleHosts />
            <h2 className="font-title mt-[8px] max-w-[360px] text-[26px] leading-[31px] font-[700]">
              Chat with Masa Son, Sam Altman, Elon Musk
            </h2>
            <button
              className="font-body mt-[16px] h-[32px] rounded-[8px] bg-[#121318] px-[14px] text-[14px] font-[700] text-white"
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
            <p className="font-body mt-[12px] max-w-[228px] text-[12px] leading-[15px] font-[700]">
              Watch the clouds move while we connect you to their consciousness
            </p>
          </>
        ) : state === "begin" ? (
          <h2 className="font-title text-[24px] leading-[31px] font-[700]">
            Ask a question
          </h2>
        ) : showConversation ? (
          <div className="w-full self-stretch pt-[40px] text-left">
            <ChatConversation className="w-full" />
          </div>
        ) : null}
      </div>
      {state === "error" ? (
        <Toast className="mb-[12px] w-full" state="error">
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
