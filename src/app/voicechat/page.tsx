"use client";
import React, {
  useState,
  useRef,
  useTransition,
  useActionState,
  startTransition,
} from "react";

import { VoiceChatInput } from "~/components/VoiceChatInput";
import { PromptInputWithActions } from "~/components/PrompInputWithActions";
import { ResponseStreamFade } from "~/components/ResponseStreamFade";
// import { VoiceChatInputv2 } from "~/components/VoiceChatInput/indexv2";
import { RainbowPromptInput } from "~/components/RainbowPromptInput";
import { useMicVAD, utils } from "@ricky0123/vad-react";
import { usePlayer } from "~/lib/usePlayer";
import {
  Message,
  MessageContent,
  MessageAvatar,
} from "~/components/ui/message";
import { ScrollButton } from "~/components/ui/scroll-button";
import { Loader } from "~/components/ui/loader";
import { ChatContainer } from "~/components/ui/chat-container";
import { Markdown } from "~/components/ui/markdown";

import { toast } from "sonner";

import { track } from "@vercel/analytics";

type Message = {
  role: "user" | "assistant";
  content: string; // plain text
  latency?: number; // ms from request to first TTS byte
};

export default function LibrarySlugpage() {
  const [rainbowActive, setRainbowActive] = useState(false);
  const [continuousRainbowActive, setContinuousRainbowActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isContinuousLoading, setIsContinuousLoading] = useState(false);
  const [rainbowColor, setRainbowColor] = useState("#3b82f6"); // Default blue
  const [borderWidth, setBorderWidth] = useState(2);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const player = usePlayer();

  const vad = useMicVAD({
    startOnLoad: true,
    onSpeechEnd: (audio) => {
      player.stop();
      const wav = utils.encodeWAV(audio);
      const blob = new Blob([wav], { type: "audio/wav" });
      console.log(blob, "blob");
      // startTransition(() => submit(blob));
      const isFirefox = navigator.userAgent.includes("Firefox");
      if (isFirefox) vad.pause();
    },
    positiveSpeechThreshold: 0.6,
    minSpeechFrames: 4,
  });

  const [messages, submit, isPending] = useActionState<
    Array<Message>,
    string | Blob
  >(async (prevMessages, data) => {
    const formData = new FormData();

    if (typeof data === "string") {
      formData.append("input", data);
      track("Text input");
    } else {
      formData.append("input", data, "audio.wav");
      track("Speech input");
    }

    for (const message of prevMessages) {
      formData.append("message", JSON.stringify(message));
    }

    const submittedAt = Date.now();

    const response = await fetch("/api/voice", {
      method: "POST",
      body: formData,
    });

    console.log(response, "response");

    const transcript = decodeURIComponent(
      response.headers.get("X-Transcript") ?? "",
    );
    const text = decodeURIComponent(response.headers.get("X-Response") ?? "");

    if (!response.ok || !transcript || !text || !response.body) {
      if (response.status === 429) {
        toast.error("Too many requests. Please try again later.");
      } else {
        toast.error((await response.text()) || "An error occurred.");
      }

      return prevMessages;
    }

    const latency = Date.now() - submittedAt;
    void player.play(response.body, () => {
      const isFirefox = navigator.userAgent.includes("Firefox");
      if (isFirefox) vad.start();
    });
    setInput(transcript);

    return [
      ...prevMessages,
      {
        role: "user",
        content: transcript,
      },
      {
        role: "assistant",
        content: text,
        latency,
      },
    ];
  }, []);

  function handleFormSubmit(value: string, files?: File[]) {
    // kick off whatever async work you normally do
    startTransition(() => submit(value)); // adapt `submit` if needed
  }

  console.log(messages, "messages");

  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <div className="flex w-full max-w-lg flex-col gap-4">
        <ChatContainer ref={chatContainerRef} className="px-6 py-4">
          {messages.map((message, id) => {
            const isAssistant = message.role === "assistant";

            return (
              <Message
                key={id}
                className={
                  message.role === "user" ? "justify-end" : "justify-start"
                }
              >
                {isAssistant && (
                  <MessageAvatar
                    src="/avatars/ai.png"
                    alt="AI Assistant"
                    fallback="AI"
                  />
                )}
                <div className="max-w-[85%] flex-1 sm:max-w-[75%]">
                  {isAssistant ? (
                    <div className="prose rounded-lg bg-secondary p-2 text-foreground">
                      <Markdown>{message.content}</Markdown>
                    </div>
                  ) : (
                    <MessageContent className="bg-primary text-primary-foreground">
                      {message.content}
                    </MessageContent>
                  )}
                </div>
              </Message>
            );
          })}

          {/* streaming placeholder / loader */}
          {isPending && (
            <div className="flex justify-start">
              <Loader variant="typing" size="sm" />
            </div>
          )}

          {/* dummy bottom marker for ScrollButton */}
          <div ref={bottomRef} />
        </ChatContainer>
        <ResponseStreamFade text={messages.at(-1)?.content ?? ""} />
        <RainbowPromptInput
          rainbowActive={rainbowActive}
          onRainbowToggle={setRainbowActive}
          rainbowColor={rainbowColor}
          onSubmit={handleFormSubmit}
          placeholder="Type your message here..."
          className="w-full"
        />
        {/* <PromptInputWithActions /> */}
        {/* 
        {/* <VoiceChatInputv2 /> */}
        {/* <VoiceChatInput /> */}
      </div>
    </div>
  );
}
