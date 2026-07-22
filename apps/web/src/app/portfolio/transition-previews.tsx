"use client";

import {
  AgentControlBar,
  SectionHeader,
  type VoiceOption,
} from "@starter/design-system";

import { OrbShader } from "~/components/OrbShader";

const DEFAULT_VOICE: VoiceOption = {
  avatar: "/agent-sidebar/avatar-1.png",
  description: "Softbank founder",
  name: "Masa Son",
};

export function AskRouteTransitionPreview() {
  return (
    <div className="relative min-h-svh overflow-hidden bg-white text-[#121318] md:hidden">
      <SectionHeader
        className="absolute left-[20px] top-[24px] z-20 w-[calc(100%-40px)]"
        showBackButton
        subtext="This feature uses the memories of living people. It can make some mistakes"
        title="Hi, what would you like to ask?"
      />
      <OrbShader
        className="absolute bottom-[144px] left-1/2 -translate-x-1/2"
        size={66}
        state="loading"
      />
      <div className="absolute bottom-[20px] left-[20px] right-[20px] z-20">
        <AgentControlBar
          className="w-full"
          idleAction="send"
          isMicrophoneEnabled
          state="default"
          voice={DEFAULT_VOICE}
        />
      </div>
    </div>
  );
}

export function PortfolioRouteTransitionPreview() {
  return (
    <div className="min-h-screen overflow-hidden bg-white text-[#121318] md:hidden">
      <section className="relative h-[672px] w-full overflow-hidden bg-[#075970]">
        <div className="absolute inset-0 bg-[linear-gradient(130deg,#1d9df1_0%,#7d92ef_34%,#d790d2_55%,#006079_100%)]" />
        <div className="absolute inset-x-0 top-[240px] h-[260px] rotate-[-7deg] bg-[#033840]/80 blur-[34px]" />
        <div className="absolute left-[22px] top-[94px]">
          <h1 className="max-w-[340px] font-title text-[42px] font-[700] leading-[44px] text-white">
            Dennis is a product designer based in SF
          </h1>
          <p className="mt-[16px] font-body text-[16px] font-[700] leading-[21px] text-white">
            Previously at Nell, AGI, Krea, and Skydio.
          </p>
        </div>
        <div className="absolute bottom-[24px] left-[20px] right-[20px] z-10">
          <AgentControlBar
            className="w-full"
            state="pre-connected"
            voice={DEFAULT_VOICE}
          />
        </div>
      </section>
      <section className="pb-[102px] pt-[27px]">
        <h2 className="px-[20px] font-title text-[25px] font-[700] leading-[29px]">
          Case Studies
        </h2>
        <div className="mt-[10px] grid gap-[14px] px-[20px]">
          {["Nell", "AGI", "Krea", "Skydio"].map((project) => (
            <div
              className="flex h-[380px] items-center justify-center bg-[#ef2200] font-body text-[14px] font-[700] text-black"
              key={project}
            >
              {project}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
