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
        className="absolute left-token-20 top-token-24 z-20 w-[calc(100%-40px)]"
        showBackButton
        subtext="This feature uses the memories of living people. It can make some mistakes"
        title="Hi, what would you like to ask?"
      />
      <OrbShader
        className="absolute bottom-[144px] left-1/2 -translate-x-1/2"
        size={66}
        state="loading"
      />
      <div className="absolute bottom-token-20 left-token-20 right-token-20 z-20">
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
        <nav
          aria-label="Portfolio navigation"
          className="absolute left-0 top-token-2 z-20 flex h-[44px] w-full items-center px-token-20 py-token-12 font-body text-cta font-regular leading-lhSubtext text-white"
        >
          <div className="flex w-full items-center justify-between">
            <span>DX</span>
            <span>About</span>
          </div>
        </nav>
        <div className="absolute left-[22px] right-[22px] top-[168px]">
          <h1 className="w-full max-w-[294px] font-title text-[36px] font-regular leading-[40px] text-white">
            Dennis is a product designer based in SF
          </h1>
          <p className="mt-token-12 w-full max-w-[294px] font-body text-cta font-regular leading-lhSubtext text-white">
            Previously at Nell, AGI, Krea, and Skydio.
          </p>
        </div>
        <div className="absolute bottom-[104px] left-[22px] right-[21px] z-10 grid h-[228px] content-end gap-token-8 overflow-hidden font-body text-[14px] font-[700] leading-lhBody text-white">
          {[
            ["@maggie", "ambient, readable, warm"],
            ["@jina", "motion timing is product voice"],
            ["@brad_frost", "the avatar stack feels alive"],
            ["@lukeW", "fast enough to feel live"],
          ].map(([handle, text]) => (
            <div className="grid grid-cols-[32px_1fr] gap-token-8" key={handle}>
              <div className="mt-token-4 size-token-24 rounded-full bg-white/80" />
              <div className="min-w-0">
                <p>{handle}</p>
                <p className="font-regular">{text}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="absolute bottom-token-24 left-token-20 right-token-20 z-10">
          <AgentControlBar
            className="w-full"
            state="pre-connected"
            voice={DEFAULT_VOICE}
          />
        </div>
      </section>
      <section className="pb-[102px] pt-[27px]">
        <h2 className="px-token-20 font-title text-[25px] font-[700] leading-[29px]">
          Past Work
        </h2>
        <div className="mt-[10px] grid gap-[14px] px-token-20">
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
