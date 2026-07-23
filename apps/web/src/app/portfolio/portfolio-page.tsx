"use client";

import { MeshGradient } from "@paper-design/shaders-react";
import { useEffect, useRef, useState } from "react";
import {
  AgentControlBar,
  LiveChat,
  PortfolioFooter,
} from "@starter/design-system";
import type { VoiceOption } from "@starter/design-system";
import { type DialConfig, type ResolvedValues, useDialKit } from "dialkit";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

import { AgentSideBar } from "~/components/AgentSideBar";
import { DialKitRoot } from "~/components/DialKitRoot";
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
type PortfolioLiveChatControls = DialConfig & {
  fadeDurationMs: [number, number, number, number];
  streamIntervalMs: [number, number, number, number];
  visibleDurationMs: [number, number, number, number];
};

const DESKTOP_PORTFOLIO_LIVE_CHAT_CONTROLS = {
  streamIntervalMs: [640, 120, 5000, 40],
  visibleDurationMs: [3600, 400, 12000, 100],
  fadeDurationMs: [600, 80, 5000, 40],
} satisfies PortfolioLiveChatControls;
const MOBILE_PORTFOLIO_LIVE_CHAT_CONTROLS = {
  streamIntervalMs: [640, 120, 5000, 40],
  visibleDurationMs: [2600, 400, 12000, 100],
  fadeDurationMs: [560, 80, 5000, 40],
} satisfies PortfolioLiveChatControls;

type PortfolioLiveChatTiming = {
  fadeDurationMs: number;
  streamIntervalMs: number;
  visibleDurationMs: number;
};

type PortfolioLiveChatTimings = {
  desktop: PortfolioLiveChatTiming;
  mobile: PortfolioLiveChatTiming;
};
const DEFAULT_PORTFOLIO_LIVE_CHAT_TIMINGS: PortfolioLiveChatTimings = {
  desktop: {
    fadeDurationMs: DESKTOP_PORTFOLIO_LIVE_CHAT_CONTROLS.fadeDurationMs[0],
    streamIntervalMs: DESKTOP_PORTFOLIO_LIVE_CHAT_CONTROLS.streamIntervalMs[0],
    visibleDurationMs:
      DESKTOP_PORTFOLIO_LIVE_CHAT_CONTROLS.visibleDurationMs[0],
  },
  mobile: {
    fadeDurationMs: MOBILE_PORTFOLIO_LIVE_CHAT_CONTROLS.fadeDurationMs[0],
    streamIntervalMs: MOBILE_PORTFOLIO_LIVE_CHAT_CONTROLS.streamIntervalMs[0],
    visibleDurationMs: MOBILE_PORTFOLIO_LIVE_CHAT_CONTROLS.visibleDurationMs[0],
  },
};
const PORTFOLIO_LIVE_CHAT_SHORTCUTS = {
  streamIntervalMs: { key: "c", mode: "coarse" },
  visibleDurationMs: { key: "x", mode: "coarse" },
  fadeDurationMs: { key: "z", mode: "coarse" },
} as const;

function usePortfolioLiveChatTiming({
  controls,
  name,
  persistKey,
}: {
  controls: PortfolioLiveChatControls;
  name: string;
  persistKey: string;
}): ResolvedValues<PortfolioLiveChatControls> {
  return useDialKit(name, controls, {
    persist: {
      key: persistKey,
      storage: "localStorage",
      presets: true,
    },
    shortcuts: PORTFOLIO_LIVE_CHAT_SHORTCUTS,
  });
}

const HERO_MESH_GRADIENT_COLORS = [
  "#bcecf6",
  "#00aaff",
  "#00f7ff",
  "#ffd447",
] as const;
const HERO_MESH_GRADIENT_CONTROLS = {
  speed: [0.22, 0, 2, 0.01],
} satisfies DialConfig;

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

function PaperHeroShader({ speed }: { speed: number }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      data-testid="portfolio-paper-shader"
    >
      <MeshGradient
        className="absolute inset-0 size-full"
        colors={[...HERO_MESH_GRADIENT_COLORS]}
        distortion={0.8}
        fit="cover"
        grainMixer={0}
        grainOverlay={0}
        height="100%"
        offsetX={0}
        offsetY={0}
        rotation={0}
        scale={1}
        speed={speed}
        swirl={0.35}
        width="100%"
      />
      <div className="absolute inset-0 bg-[linear-gradient(175deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.02)_28%,rgba(0,98,126,0.44)_58%,rgba(0,60,78,0.12)_100%)]" />
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

function PortfolioLiveChat({ timing }: { timing: PortfolioLiveChatTimings }) {
  return (
    <>
      <LiveChat
        className="absolute bottom-[118px] left-[20px] right-[20px] z-10 h-[294px] w-auto max-w-none rounded-token-xxs md:hidden"
        fadeDurationMs={timing.mobile.fadeDurationMs}
        initialMessageCount={5}
        maxVisibleMessages={5}
        streamIntervalMs={timing.mobile.streamIntervalMs}
        visibleDurationMs={timing.mobile.visibleDurationMs}
      />
      <LiveChat
        className="absolute bottom-[9px] left-[26px] z-10 hidden h-[500px] w-[423px] max-w-none rounded-token-xxs md:flex"
        fadeDurationMs={timing.desktop.fadeDurationMs}
        initialMessageCount={8}
        maxVisibleMessages={8}
        streamIntervalMs={timing.desktop.streamIntervalMs}
        visibleDurationMs={timing.desktop.visibleDurationMs}
      />
    </>
  );
}

export function HeroSurface({
  copyClassName,
  liveChatTiming = DEFAULT_PORTFOLIO_LIVE_CHAT_TIMINGS,
  shaderSpeed,
}: {
  copyClassName: string;
  liveChatTiming?: PortfolioLiveChatTimings;
  shaderSpeed: number;
}) {
  return (
    <div
      className="relative size-full overflow-hidden bg-[#bcecf6]"
      data-testid="portfolio-hero"
    >
      <PaperHeroShader speed={shaderSpeed} />
      <HeroCopy className={`z-10 ${copyClassName}`} />
      <PortfolioLiveChat timing={liveChatTiming} />
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
  liveChatTiming,
  shaderSpeed,
  onMobileStart,
  onStart,
}: {
  liveChatTiming: PortfolioLiveChatTimings;
  shaderSpeed: number;
  onMobileStart: () => void;
  onStart: () => void;
}) {
  return (
    <>
      <section className="hidden w-full border-b border-[var(--color-border-opaque)] md:block">
        <div className="grid h-[928px] grid-cols-[minmax(0,1300px)_428px]">
          <HeroSurface
            copyClassName="absolute left-[116px] top-[339px]"
            liveChatTiming={liveChatTiming}
            shaderSpeed={shaderSpeed}
          />
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
        <HeroSurface
          copyClassName="absolute left-[22px] top-[94px]"
          liveChatTiming={liveChatTiming}
          shaderSpeed={shaderSpeed}
        />
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
  const heroMeshGradient = useDialKit(
    "Portfolio mesh gradient",
    HERO_MESH_GRADIENT_CONTROLS,
    {
      id: "portfolio-hero-mesh-gradient",
      persist: {
        key: "portfolio-hero-mesh-gradient",
        storage: "localStorage",
        presets: true,
      },
      shortcuts: {
        speed: { key: "m", mode: "fine" },
      },
    },
  );
  const askTransition = useAskPushTransition();
  const desktopLiveChat = usePortfolioLiveChatTiming({
    controls: DESKTOP_PORTFOLIO_LIVE_CHAT_CONTROLS,
    name: "Portfolio live chat desktop",
    persistKey: "portfolio-live-chat-desktop-v1",
  });
  const mobileLiveChat = usePortfolioLiveChatTiming({
    controls: MOBILE_PORTFOLIO_LIVE_CHAT_CONTROLS,
    name: "Portfolio live chat mobile",
    persistKey: "portfolio-live-chat-mobile-v1",
  });
  const [sessionStarted, setSessionStarted] = useState(false);
  const [isPushingMobile, setIsPushingMobile] = useState(false);
  const [roomName, setRoomName] = useState("portfolio_agent_pending");
  const mobileAskTimeoutRef = useRef<number | null>(null);
  const liveChatTiming = {
    desktop: desktopLiveChat,
    mobile: mobileLiveChat,
  };

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
      <DialKitRoot className="hidden md:block" mode="inline" theme="dark" />
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
                  <HeroSurface
                    copyClassName="absolute left-[116px] top-[339px]"
                    liveChatTiming={liveChatTiming}
                    shaderSpeed={heroMeshGradient.speed}
                  />
                </div>
              }
              desktopSectionClassName="gap-0 border-b border-[var(--color-border-opaque)] md:grid-cols-[minmax(0,1300px)_428px]"
              desktopSidebarClassName="h-[928px]"
              mobileHero={
                <HeroSurface
                  copyClassName="absolute left-[22px] top-[94px]"
                  liveChatTiming={liveChatTiming}
                  shaderSpeed={heroMeshGradient.speed}
                />
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
              liveChatTiming={liveChatTiming}
              shaderSpeed={heroMeshGradient.speed}
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
