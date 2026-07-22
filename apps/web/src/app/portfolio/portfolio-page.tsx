"use client";

import { MeshGradient, PaperTexture } from "@paper-design/shaders-react";
import { useEffect, useRef, useState } from "react";
import { AgentControlBar, PortfolioFooter } from "@starter/design-system";
import type { VoiceOption } from "@starter/design-system";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

import { AgentSideBar } from "~/components/AgentSideBar";
import { PortfolioCardGrid } from "~/components/PortfolioCard";
import { SkeuomorphicClock } from "~/components/SkeuomorphicClock";
import { TestingSession } from "~/app/testing/testing-session";
import {
  ASK_TRANSITION_STORAGE_KEY,
  toAskTransition,
  useAskPushTransition,
} from "./ask-transition";
import { hasActiveMobileAskResume } from "./mobile-ask-resume";
import { AskRouteTransitionPreview } from "./transition-previews";

const DEFAULT_AGENT_NAME = "dennis-portfolio-agent";
const DEFAULT_TOKEN_ENDPOINT = "/api/livekit/guest-session";
const DEFAULT_VOICE: VoiceOption = {
  avatar: "/agent-sidebar/avatar-1.png",
  description: "Softbank founder",
  name: "Masa Son",
};

function createBrowserSafeId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
      "",
    );
  }

  throw new Error("Secure browser randomness is required to start voice chat.");
}

function createRoomName() {
  return `portfolio_agent_${createBrowserSafeId()}`;
}

function PaperHeroShader() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      data-testid="portfolio-paper-shader"
    >
      <MeshGradient
        className="absolute inset-0 size-full"
        colors={["#0b9bf2", "#89a2f3", "#f19ab7", "#074b63", "#002f3d"]}
        distortion={0.58}
        fit="cover"
        grainMixer={0.4}
        grainOverlay={0.12}
        height="100%"
        scale={1.22}
        speed={0.18}
        swirl={0.28}
        width="100%"
      />
      <PaperTexture
        className="absolute inset-0 size-full opacity-[0.34] mix-blend-soft-light"
        colorBack="#083b4d"
        colorFront="#f7edf2"
        contrast={0.62}
        crumples={0.22}
        fade={0.32}
        fiber={0.48}
        fiberSize={0.72}
        fit="cover"
        height="100%"
        roughness={0.64}
        scale={1.8}
        speed={0}
        width="100%"
      />
      <div className="absolute inset-0 bg-[linear-gradient(175deg,rgba(255,170,190,0.20)_0%,rgba(255,255,255,0.02)_28%,rgba(0,55,70,0.72)_53%,rgba(0,92,118,0.20)_100%)]" />
    </div>
  );
}

function HeroCopy({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <h1 className="max-w-[340px] font-title text-[42px] font-[700] leading-[44px] text-white md:max-w-[294px] md:text-[32px] md:leading-[34px]">
        Dennis is a product designer based in SF
      </h1>
      <p className="mt-[16px] font-body text-[16px] font-[700] leading-[21px] text-white md:mt-[8px] md:text-[11px] md:leading-[14px]">
        Previously at Nell, AGI, Krea, and Skydio.
      </p>
    </div>
  );
}

export function HeroSurface({ copyClassName }: { copyClassName: string }) {
  return (
    <div
      className="relative size-full overflow-hidden bg-[#075970]"
      data-testid="portfolio-hero"
    >
      <PaperHeroShader />
      <HeroCopy className={`z-10 ${copyClassName}`} />
    </div>
  );
}

function FooterWithClock() {
  return (
    <PortfolioFooter
      clock={
        <SkeuomorphicClock
          initialTime="14:16:05"
          running
          secondHandMotion="sweep"
          showControls={false}
          size={135}
        />
      }
    />
  );
}

function CaseStudies() {
  return (
    <>
      <section className="hidden px-[116px] pb-[243px] pt-[69px] md:block">
        <h2 className="font-title text-[34px] font-[700] leading-[38px]">
          Case Studies
        </h2>
        <PortfolioCardGrid className="mt-[46px] max-w-[1497px] gap-y-[90px]" />
      </section>

      <section className="pb-[102px] pt-[27px] md:hidden">
        <h2 className="px-[20px] font-title text-[25px] font-[700] leading-[29px]">
          Case Studies
        </h2>
        <PortfolioCardGrid className="mt-[10px] gap-y-[40px] px-[20px]" />
      </section>
    </>
  );
}

function PortfolioLauncher({
  onMobileStart,
  onStart,
}: {
  onMobileStart: () => void;
  onStart: () => void;
}) {
  return (
    <>
      <section className="hidden w-full border-b border-[var(--color-border-opaque)] md:block">
        <div className="grid h-[928px] grid-cols-[minmax(0,1300px)_428px]">
          <HeroSurface copyClassName="absolute left-[116px] top-[339px]" />
          <AgentSideBar
            className="h-[928px]"
            isMicrophoneEnabled={false}
            messages={[]}
            onStart={onStart}
            state="intro"
            voiceName="Portfolio Agent"
          />
        </div>
      </section>

      <section className="relative h-[672px] w-full overflow-hidden md:hidden">
        <HeroSurface copyClassName="absolute left-[22px] top-[94px]" />
        <div className="absolute bottom-[24px] left-[20px] right-[20px] z-10">
          <AgentControlBar
            className="w-full"
            onUseVoice={onMobileStart}
            state="pre-connected"
            voice={DEFAULT_VOICE}
          />
        </div>
      </section>
    </>
  );
}

export function PortfolioPage() {
  const router = useRouter();
  const askTransition = useAskPushTransition();
  const [sessionStarted, setSessionStarted] = useState(false);
  const [isPushingMobile, setIsPushingMobile] = useState(false);
  const [roomName, setRoomName] = useState("portfolio_agent_pending");
  const mobileAskTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");

    const resumeAskIfMobile = () => {
      if (!mediaQuery.matches) return;
      if (!hasActiveMobileAskResume()) return;

      window.sessionStorage.setItem(ASK_TRANSITION_STORAGE_KEY, "push");
      router.replace("/ask");
    };

    resumeAskIfMobile();
    mediaQuery.addEventListener("change", resumeAskIfMobile);

    return () => {
      mediaQuery.removeEventListener("change", resumeAskIfMobile);
      if (mobileAskTimeoutRef.current) {
        window.clearTimeout(mobileAskTimeoutRef.current);
      }
    };
  }, [router]);

  const startSession = () => {
    setRoomName(createRoomName());
    setSessionStarted(true);
  };

  const startMobileAsk = () => {
    window.sessionStorage.setItem(ASK_TRANSITION_STORAGE_KEY, "push");
    setIsPushingMobile(true);
    mobileAskTimeoutRef.current = window.setTimeout(() => {
      router.push("/ask");
    }, askTransition.duration * 1000);
  };

  return (
    <>
      <motion.main
        animate={{
          x: isPushingMobile ? `-${askTransition.offsetPercent}%` : "0%",
        }}
        className="min-h-screen overflow-x-hidden bg-white text-[#121318]"
        transition={toAskTransition(askTransition)}
      >
        <section className="mx-auto w-full md:max-w-[1728px]">
          {sessionStarted ? (
            <TestingSession
              agentName={DEFAULT_AGENT_NAME}
              className="max-w-none gap-0 px-0 py-0 md:px-0 md:py-0"
              desktopHero={
                <div className="h-[928px]">
                  <HeroSurface copyClassName="absolute left-[116px] top-[339px]" />
                </div>
              }
              desktopSectionClassName="gap-0 border-b border-[var(--color-border-opaque)] md:grid-cols-[minmax(0,1300px)_428px]"
              desktopSidebarClassName="h-[928px]"
              mobileHero={
                <HeroSurface copyClassName="absolute left-[22px] top-[94px]" />
              }
              onSessionEnded={() => {
                setSessionStarted(false);
                setRoomName("portfolio_agent_pending");
              }}
              persistMobileAskResume
              roomName={roomName}
              showDebugPanel={false}
              tokenEndpoint={DEFAULT_TOKEN_ENDPOINT}
            />
          ) : (
            <PortfolioLauncher
              onMobileStart={startMobileAsk}
              onStart={startSession}
            />
          )}

          <CaseStudies />
          <FooterWithClock />
        </section>
      </motion.main>
      {isPushingMobile ? (
        <motion.div
          animate={{ x: "0%" }}
          className="pointer-events-none fixed inset-0 z-50 bg-white md:hidden"
          initial={{ x: `${askTransition.offsetPercent}%` }}
          transition={toAskTransition(askTransition)}
        >
          <AskRouteTransitionPreview />
        </motion.div>
      ) : null}
    </>
  );
}
