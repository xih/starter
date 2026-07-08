"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
} from "react";
import { useChat } from "@livekit/components-react";
import { Track } from "livekit-client";
import { Loader, MessageSquareTextIcon, SendHorizontal } from "lucide-react";
import { motion, type MotionProps } from "motion/react";

import { AgentDisconnectButton } from "~/components/agents-ui/agent-disconnect-button";
import { AgentTrackControl } from "~/components/agents-ui/agent-track-control";
import {
  AgentTrackToggle,
  agentTrackToggleVariants,
} from "~/components/agents-ui/agent-track-toggle";
import { Button } from "~/components/ui/button";
import { Toggle } from "~/components/ui/toggle";
import {
  type UseInputControlsProps,
  useInputControls,
  usePublishPermissions,
} from "~/hooks/agents-ui/use-agent-control-bar";
import { cn } from "~/lib/utils";

const LK_TOGGLE_VARIANT_1 = [
  "data-[state=off]:bg-accent data-[state=off]:hover:bg-foreground/10",
  "data-[state=off]:[&_~_button]:bg-accent data-[state=off]:[&_~_button]:hover:bg-foreground/10",
  "data-[state=off]:border-border data-[state=off]:hover:border-foreground/12",
  "data-[state=off]:[&_~_button]:border-border data-[state=off]:[&_~_button]:hover:border-foreground/12",
  "data-[state=off]:text-destructive data-[state=off]:hover:text-destructive data-[state=off]:focus:text-destructive",
  "data-[state=off]:focus-visible:ring-foreground/12 data-[state=off]:focus-visible:border-ring",
  "dark:data-[state=off]:[&_~_button]:bg-accent dark:data-[state=off]:[&_~_button]:hover:bg-foreground/10",
];

const LK_TOGGLE_VARIANT_2 = [
  "data-[state=off]:bg-accent data-[state=off]:hover:bg-foreground/10",
  "data-[state=off]:border-border data-[state=off]:hover:border-foreground/12",
  "data-[state=off]:focus-visible:border-ring data-[state=off]:focus-visible:ring-foreground/12",
  "data-[state=off]:text-foreground data-[state=off]:hover:text-foreground data-[state=off]:focus:text-foreground",
  "data-[state=on]:bg-blue-500/20 data-[state=on]:hover:bg-blue-500/30",
  "data-[state=on]:border-blue-700/10 data-[state=on]:text-blue-700 data-[state=on]:ring-blue-700/30",
  "data-[state=on]:focus-visible:border-blue-700/50",
  "dark:data-[state=on]:bg-blue-500/20 dark:data-[state=on]:text-blue-300",
];

const MOTION_PROPS: MotionProps = {
  variants: {
    hidden: {
      height: 0,
      opacity: 0,
      marginBottom: 0,
    },
    visible: {
      height: "auto",
      opacity: 1,
      marginBottom: 12,
    },
  },
  initial: "hidden",
  transition: {
    duration: 0.3,
    ease: "easeOut",
  },
};

interface AgentChatInputProps {
  chatOpen: boolean;
  onSend?: (message: string) => void | Promise<void>;
  className?: string;
}

function AgentChatInput({
  chatOpen,
  onSend = () => undefined,
  className,
}: AgentChatInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState("");
  const isDisabled = isSending || message.trim().length === 0;

  const handleSend = async () => {
    if (isDisabled) {
      return;
    }

    try {
      setIsSending(true);
      await onSend(message.trim());
      setMessage("");
    } catch (error) {
      console.error(error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = async (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      await handleSend();
    }
  };

  const handleButtonClick = async () => {
    if (isDisabled) return;
    await handleSend();
  };

  useEffect(() => {
    if (!chatOpen) return;
    inputRef.current?.focus();
  }, [chatOpen]);

  return (
    <div
      className={cn(
        "mb-3 flex grow items-end gap-2 rounded-md pl-1 text-sm",
        className,
      )}
    >
      <textarea
        autoFocus
        ref={inputRef}
        value={message}
        disabled={!chatOpen || isSending}
        placeholder="Type something..."
        onKeyDown={handleKeyDown}
        onChange={(event) => setMessage(event.target.value)}
        className="field-sizing-content max-h-16 min-h-8 flex-1 resize-none py-2 [scrollbar-width:thin] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      />
      <Button
        size="icon"
        type="button"
        disabled={isDisabled}
        variant={isDisabled ? "secondary" : "default"}
        title={isSending ? "Sending..." : "Send"}
        onClick={() => {
          void handleButtonClick();
        }}
        className="self-end disabled:cursor-not-allowed"
      >
        {isSending ? <Loader className="animate-spin" /> : <SendHorizontal />}
      </Button>
    </div>
  );
}

export interface AgentControlBarControls {
  leave?: boolean;
  camera?: boolean;
  microphone?: boolean;
  screenShare?: boolean;
  chat?: boolean;
}

export interface AgentControlBarProps extends UseInputControlsProps {
  variant?: "default" | "outline" | "livekit";
  controls?: AgentControlBarControls;
  saveUserChoices?: boolean;
  isConnected?: boolean;
  isChatOpen?: boolean;
  onDisconnect?: () => void;
  onIsChatOpenChange?: (open: boolean) => void;
  onDeviceError?: (error: { source: Track.Source; error: Error }) => void;
}

export function AgentControlBar({
  variant = "default",
  controls,
  isChatOpen = false,
  isConnected = false,
  saveUserChoices = true,
  onDisconnect,
  onDeviceError,
  onIsChatOpenChange,
  className,
  ...props
}: AgentControlBarProps & ComponentProps<"div">) {
  const { send } = useChat();
  const publishPermissions = usePublishPermissions();
  const [isChatOpenUncontrolled, setIsChatOpenUncontrolled] =
    useState(isChatOpen);
  const isChatOpenControlled = onIsChatOpenChange !== undefined;
  const resolvedIsChatOpen = isChatOpenControlled
    ? isChatOpen
    : isChatOpenUncontrolled;
  const {
    cameraToggle,
    handleAudioDeviceChange,
    handleCameraDeviceSelectError,
    handleMicrophoneDeviceSelectError,
    handleVideoDeviceChange,
    microphoneToggle,
    microphoneTrack,
    screenShareToggle,
  } = useInputControls({ onDeviceError, saveUserChoices });

  const handleSendMessage = async (message: string) => {
    await send(message);
  };

  useEffect(() => {
    if (isConnected || isChatOpenControlled) {
      return;
    }

    setIsChatOpenUncontrolled(false);
  }, [isChatOpenControlled, isConnected]);

  const visibleControls = {
    leave: controls?.leave ?? true,
    microphone: controls?.microphone ?? publishPermissions.microphone,
    screenShare: controls?.screenShare ?? publishPermissions.screenShare,
    camera: controls?.camera ?? publishPermissions.camera,
    chat: controls?.chat ?? publishPermissions.data,
  };

  const isEmpty = Object.values(visibleControls).every((value) => !value);

  if (isEmpty) {
    console.warn(
      "AgentControlBar: `visibleControls` contains only false values.",
    );
    return null;
  }

  return (
    <div
      aria-label="Voice assistant controls"
      className={cn(
        "border-input/50 drop-shadow-md/3 flex flex-col border bg-background p-3 dark:border-muted",
        variant === "livekit" ? "rounded-[31px]" : "rounded-lg",
        className,
      )}
      {...props}
    >
      <motion.div
        {...MOTION_PROPS}
        inert={!resolvedIsChatOpen}
        animate={resolvedIsChatOpen ? "visible" : "hidden"}
        className="border-input/50 flex w-full items-start overflow-hidden border-b"
      >
        <AgentChatInput
          chatOpen={resolvedIsChatOpen}
          onSend={handleSendMessage}
          className={cn(variant === "livekit" && "[&_button]:rounded-full")}
        />
      </motion.div>

      <div className="flex gap-1">
        <div className="flex grow gap-1">
          {visibleControls.microphone && (
            <AgentTrackControl
              variant={variant === "outline" ? "outline" : "default"}
              kind="audioinput"
              aria-label="Toggle microphone"
              source={Track.Source.Microphone}
              pressed={microphoneToggle.enabled}
              disabled={microphoneToggle.pending}
              audioTrack={microphoneTrack}
              onPressedChange={microphoneToggle.toggle}
              onActiveDeviceChange={handleAudioDeviceChange}
              onMediaDeviceError={handleMicrophoneDeviceSelectError}
              className={cn(
                variant === "livekit" && [
                  LK_TOGGLE_VARIANT_1,
                  "rounded-full [&_button:first-child]:rounded-l-full [&_button:last-child]:rounded-r-full",
                ],
              )}
            />
          )}

          {visibleControls.camera && (
            <AgentTrackControl
              variant={variant === "outline" ? "outline" : "default"}
              kind="videoinput"
              aria-label="Toggle camera"
              source={Track.Source.Camera}
              pressed={cameraToggle.enabled}
              pending={cameraToggle.pending}
              disabled={cameraToggle.pending}
              onPressedChange={cameraToggle.toggle}
              onMediaDeviceError={handleCameraDeviceSelectError}
              onActiveDeviceChange={handleVideoDeviceChange}
              className={cn(
                variant === "livekit" && [
                  LK_TOGGLE_VARIANT_1,
                  "rounded-full [&_button:first-child]:rounded-l-full [&_button:last-child]:rounded-r-full",
                ],
              )}
            />
          )}

          {visibleControls.screenShare && (
            <AgentTrackToggle
              variant={variant === "outline" ? "outline" : "default"}
              aria-label="Toggle screen share"
              source={Track.Source.ScreenShare}
              pressed={screenShareToggle.enabled}
              disabled={screenShareToggle.pending}
              onPressedChange={screenShareToggle.toggle}
              className={cn(
                variant === "livekit" && [LK_TOGGLE_VARIANT_2, "rounded-full"],
              )}
            />
          )}

          {visibleControls.chat && (
            <Toggle
              variant={variant === "outline" ? "outline" : "default"}
              pressed={resolvedIsChatOpen}
              aria-label="Toggle transcript"
              onPressedChange={(state) => {
                if (isChatOpenControlled) {
                  onIsChatOpenChange(state);
                } else {
                  setIsChatOpenUncontrolled(state);
                }
              }}
              className={agentTrackToggleVariants({
                variant: variant === "outline" ? "outline" : "default",
                className: cn(
                  variant === "livekit" && [
                    LK_TOGGLE_VARIANT_2,
                    "rounded-full",
                  ],
                ),
              })}
            >
              <MessageSquareTextIcon />
            </Toggle>
          )}
        </div>

        {visibleControls.leave && (
          <AgentDisconnectButton
            onClick={onDisconnect}
            disabled={!isConnected}
            className={cn(
              variant === "livekit" &&
                "bg-destructive/10 hover:bg-destructive/20 focus:bg-destructive/20 focus-visible:ring-destructive/20 dark:bg-destructive/10 dark:hover:bg-destructive/20 dark:focus-visible:ring-destructive/4 rounded-full font-mono text-xs font-bold tracking-wider text-destructive",
            )}
          >
            <span className="hidden md:inline">END CALL</span>
            <span className="inline md:hidden">END</span>
          </AgentDisconnectButton>
        )}
      </div>
    </div>
  );
}
