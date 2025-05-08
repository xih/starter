import React from "react";
import { VoiceChatInput } from "~/components/VoiceChatInput";
import { PromptInputWithActions } from "~/components/PrompInputWithActions";
import { ResponseStreamFade } from "~/components/ResponseStreamFade";




export default function LibrarySlugpage() {
  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <div className="flex w-full max-w-lg flex-col gap-4">
        <ResponseStreamFade />
        <PromptInputWithActions />
        {/* <VoiceChatInput /> */}
      </div>
    </div>
  );
}
