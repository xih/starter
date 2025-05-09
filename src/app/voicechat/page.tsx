"use client";
import React, { useState } from "react";

import { VoiceChatInput } from "~/components/VoiceChatInput";
import { PromptInputWithActions } from "~/components/PrompInputWithActions";
import { ResponseStreamFade } from "~/components/ResponseStreamFade";
// import { VoiceChatInputv2 } from "~/components/VoiceChatInput/indexv2";
import { RainbowPromptInput } from "~/components/RainbowPromptInput";

export default function LibrarySlugpage() {
  const [rainbowActive, setRainbowActive] = useState(false);
  const [continuousRainbowActive, setContinuousRainbowActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isContinuousLoading, setIsContinuousLoading] = useState(false);
  const [rainbowColor, setRainbowColor] = useState("#3b82f6"); // Default blue
  const [borderWidth, setBorderWidth] = useState(2);

  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <div className="flex w-full max-w-lg flex-col gap-4">
        <RainbowPromptInput
          rainbowActive={rainbowActive}
          onRainbowToggle={setRainbowActive}
          rainbowColor={rainbowColor}
          // onSubmit={handleSubmit}
          placeholder="Type your message here..."
          className="w-full"
        />
        {/* <PromptInputWithActions /> */}
        {/* <ResponseStreamFade />

        {/* <VoiceChatInputv2 /> */}
        {/* <VoiceChatInput /> */}
      </div>
    </div>
  );
}
