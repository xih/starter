"use client";

import { MeshGradient } from "@paper-design/shaders-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AgentControlBar,
  LiveChat,
  PortfolioFooter,
} from "@starter/design-system";
import type { LiveChatMessage, VoiceOption } from "@starter/design-system";
import { type DialConfig, type ResolvedValues, useDialKit } from "dialkit";
import { motion } from "framer-motion";
import Link from "next/link";

import { AgentSideBar } from "~/components/AgentSideBar";
import { DialKitRoot } from "~/components/DialKitRoot";
import { PortfolioCardGrid } from "~/components/PortfolioCard";
import { SkeuomorphicClock } from "~/components/SkeuomorphicClock";
import { TestingSession } from "~/app/testing/testing-session";
import { toAskTransition, useAskPushTransition } from "./ask-transition";
import { AskRouteTransitionPreview } from "./transition-previews";

const DEFAULT_AGENT_NAME = "dennis-portfolio-agent";
const DEFAULT_TOKEN_ENDPOINT = "/api/livekit/guest-session";
const MOBILE_ASK_HISTORY_STATE_KEY = "__portfolioMobileAsk";
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
const MOBILE_LIVE_CHAT_MESSAGES: LiveChatMessage[] = [
  {
    avatarUrl: "https://unavatar.io/twitter/jina",
    handle: "@jina",
    id: "mobile-live-chat-jina",
    text: "motion timing is product voice",
  },
  {
    avatarUrl: "https://unavatar.io/twitter/brad_frost",
    handle: "@brad_frost",
    id: "mobile-live-chat-brad-frost",
    text: "the avatar stack feels alive",
  },
  {
    avatarUrl: "https://unavatar.io/twitter/lukeW",
    handle: "@lukeW",
    id: "mobile-live-chat-lukew",
    text: "fast enough to feel live",
  },
  {
    avatarUrl: "https://unavatar.io/twitter/rsms",
    handle: "@rsms",
    id: "mobile-live-chat-rsms",
    text: "caption type is the game",
  },
  {
    avatarUrl: "https://unavatar.io/twitter/maggieappleton",
    handle: "@maggie",
    id: "mobile-live-chat-maggie",
    text: "ambient, readable, warm",
  },
];

type MobileAskMode = "closed" | "pushing" | "open" | "returning" | "dismissed";

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

function PortfolioHeader({ className = "" }: { className?: string }) {
  return (
    <nav
      aria-label="Portfolio navigation"
      className={`absolute left-0 top-[2px] z-20 flex h-[44px] w-full items-center px-[20px] py-[12px] font-body text-[16px] font-[400] leading-[19.2px] text-white ${className}`}
    >
      <div className="flex w-full items-center justify-between">
        <Link
          className="whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          href="/"
        >
          DX
        </Link>
        <Link
          className="whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          href="/about"
        >
          About
        </Link>
      </div>
    </nav>
  );
}

function HeroCopy({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <h1 className="w-full max-w-[294px] font-title text-[36px] font-[400] leading-[40px] text-white md:max-w-[530px]">
        Dennis is a product designer based in SF
      </h1>
      <p className="mt-[12px] w-full max-w-[294px] font-body text-[16px] font-[400] leading-[19.2px] text-white md:max-w-[536px] md:text-[24px] md:leading-[40px]">
        Previously at Nell, AGI, Krea, and Skydio.
      </p>
    </div>
  );
}

function PortfolioLiveChat({ timing }: { timing: PortfolioLiveChatTimings }) {
  return (
    <>
      <LiveChat
        className="absolute bottom-[104px] left-[22px] right-[21px] z-10 h-[228px] w-auto max-w-none rounded-token-xxs md:hidden"
        fadeDurationMs={timing.mobile.fadeDurationMs}
        initialMessageCount={4}
        maxVisibleMessages={4}
        messages={MOBILE_LIVE_CHAT_MESSAGES}
        reserveFadingMessages={false}
        streamIntervalMs={timing.mobile.streamIntervalMs}
        visibleDurationMs={timing.mobile.visibleDurationMs}
      />
      <LiveChat
        className="absolute bottom-[9px] left-[36px] z-10 hidden h-[280px] w-[423px] max-w-none rounded-token-xxs md:flex"
        fadeDurationMs={timing.desktop.fadeDurationMs}
        initialMessageCount={5}
        maxVisibleMessages={5}
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
      className="relative size-full overflow-hidden bg-[#075970]"
      data-testid="portfolio-hero"
    >
      <PaperHeroShader speed={shaderSpeed} />
      <PortfolioHeader />
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
          Past Work
        </h2>
        <PortfolioCardGrid className="mt-[46px] max-w-[1497px] gap-y-[90px]" />
      </section>

      <section className="pb-[102px] pt-[27px] md:hidden">
        <h2 className="px-[20px] font-title text-[25px] font-[700] leading-[29px]">
          Past Work
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
            copyClassName="absolute left-[36px] right-[36px] top-[322px]"
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
          copyClassName="absolute left-[22px] right-[22px] top-[168px]"
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
  const [mobileAskMode, setMobileAskMode] = useState<MobileAskMode>("closed");
  const [roomName, setRoomName] = useState("portfolio_agent_pending");
  const mobileAskTimeoutRef = useRef<number | null>(null);
  const mobileReturnTimeoutRef = useRef<number | null>(null);
  const mobileAskHistoryRef = useRef(false);
  const liveChatTiming = {
    desktop: desktopLiveChat,
    mobile: mobileLiveChat,
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");

    const syncMobileAskWithViewport = () => {
      if (!sessionStarted) return;

      if (mediaQuery.matches) {
        if (mobileAskMode === "closed") {
          setMobileAskMode("open");
        }
        return;
      }

      if (mobileAskMode === "dismissed") return;

      if (mobileAskTimeoutRef.current) {
        window.clearTimeout(mobileAskTimeoutRef.current);
        mobileAskTimeoutRef.current = null;
      }
      if (mobileReturnTimeoutRef.current) {
        window.clearTimeout(mobileReturnTimeoutRef.current);
        mobileReturnTimeoutRef.current = null;
      }
      if (mobileAskHistoryRef.current) {
        mobileAskHistoryRef.current = false;
        window.history.back();
      }
      setMobileAskMode("closed");
    };

    syncMobileAskWithViewport();
    mediaQuery.addEventListener("change", syncMobileAskWithViewport);

    return () => {
      mediaQuery.removeEventListener("change", syncMobileAskWithViewport);
    };
  }, [mobileAskMode, sessionStarted]);

  useEffect(() => {
    return () => {
      if (mobileAskTimeoutRef.current) {
        window.clearTimeout(mobileAskTimeoutRef.current);
      }
      if (mobileReturnTimeoutRef.current) {
        window.clearTimeout(mobileReturnTimeoutRef.current);
      }
    };
  }, []);

  const clearMobileAskPushTimer = useCallback(() => {
    if (!mobileAskTimeoutRef.current) return;

    window.clearTimeout(mobileAskTimeoutRef.current);
    mobileAskTimeoutRef.current = null;
  }, []);

  const clearMobileAskReturnTimer = useCallback(() => {
    if (!mobileReturnTimeoutRef.current) return;

    window.clearTimeout(mobileReturnTimeoutRef.current);
    mobileReturnTimeoutRef.current = null;
  }, []);

  const pushMobileAskHistory = useCallback(() => {
    if (mobileAskHistoryRef.current) return;

    window.history.pushState(
      {
        ...(typeof window.history.state === "object" &&
        window.history.state !== null
          ? window.history.state
          : {}),
        [MOBILE_ASK_HISTORY_STATE_KEY]: true,
      },
      "",
      window.location.href,
    );
    mobileAskHistoryRef.current = true;
  }, []);

  const clearMobileAskHistory = useCallback(() => {
    if (!mobileAskHistoryRef.current) return;

    mobileAskHistoryRef.current = false;
    window.history.back();
  }, []);

  const beginMobileAskDismissal = useCallback(() => {
    if (mobileAskMode === "returning") return;

    clearMobileAskPushTimer();
    clearMobileAskReturnTimer();
    setMobileAskMode("returning");
    mobileReturnTimeoutRef.current = window.setTimeout(() => {
      mobileReturnTimeoutRef.current = null;
      setMobileAskMode("dismissed");
    }, askTransition.duration * 1000);
  }, [
    askTransition.duration,
    clearMobileAskPushTimer,
    clearMobileAskReturnTimer,
    mobileAskMode,
  ]);

  const resetMobileAskMode = () => {
    clearMobileAskPushTimer();
    clearMobileAskReturnTimer();
    clearMobileAskHistory();
    setMobileAskMode("closed");
  };

  const startSession = () => {
    setRoomName(createRoomName());
    resetMobileAskMode();
    setSessionStarted(true);
  };

  const startMobileAsk = () => {
    clearMobileAskPushTimer();
    clearMobileAskReturnTimer();
    pushMobileAskHistory();
    setRoomName(createRoomName());
    setSessionStarted(true);
    setMobileAskMode("pushing");
    mobileAskTimeoutRef.current = window.setTimeout(() => {
      mobileAskTimeoutRef.current = null;
      setMobileAskMode("open");
    }, askTransition.duration * 1000);
  };

  const dismissMobileAsk = () => {
    clearMobileAskHistory();
    beginMobileAskDismissal();
  };

  const isPushingMobile = mobileAskMode === "pushing";
  const isReturningMobile = mobileAskMode === "returning";
  const isMobileAskOpen = mobileAskMode === "open";
  const shouldLockMobileAskScroll =
    mobileAskMode === "pushing" ||
    mobileAskMode === "open" ||
    mobileAskMode === "returning";

  useEffect(() => {
    if (!isMobileAskOpen) return;

    pushMobileAskHistory();
  }, [isMobileAskOpen, pushMobileAskHistory]);

  useEffect(() => {
    const handlePopState = () => {
      if (!mobileAskHistoryRef.current) return;

      mobileAskHistoryRef.current = false;
      beginMobileAskDismissal();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [beginMobileAskDismissal]);

  useEffect(() => {
    if (!shouldLockMobileAskScroll) return;

    const scrollY = window.scrollY;
    const bodyPosition = document.body.style.position;
    const bodyTop = document.body.style.top;
    const bodyWidth = document.body.style.width;
    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    return () => {
      document.documentElement.style.overflow = htmlOverflow;
      document.body.style.overflow = bodyOverflow;
      document.body.style.position = bodyPosition;
      document.body.style.top = bodyTop;
      document.body.style.width = bodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [shouldLockMobileAskScroll]);

  return (
    <>
      <style>{`
        @media (max-width: 767px) {
          .dialkit-panel {
            display: none !important;
          }
        }
      `}</style>
      <DialKitRoot className="hidden md:block" mode="inline" theme="dark" />
      <motion.main className="min-h-screen overflow-x-hidden bg-white text-[#121318]">
        <section className="mx-auto w-full md:max-w-[1728px]">
          {sessionStarted ? (
            <TestingSession
              agentName={DEFAULT_AGENT_NAME}
              className="max-w-none gap-0 px-0 py-0 md:px-0 md:py-0"
              desktopHero={
                <div className="h-[928px]">
                  <HeroSurface
                    copyClassName="absolute left-[36px] right-[36px] top-[322px]"
                    liveChatTiming={liveChatTiming}
                    shaderSpeed={heroMeshGradient.speed}
                  />
                </div>
              }
              desktopSectionClassName="gap-0 border-b border-[var(--color-border-opaque)] md:grid-cols-[minmax(0,1300px)_428px]"
              desktopSidebarClassName="h-[928px]"
              mobileHero={
                <HeroSurface
                  copyClassName="absolute left-[22px] right-[22px] top-[168px]"
                  liveChatTiming={liveChatTiming}
                  shaderSpeed={heroMeshGradient.speed}
                />
              }
              onSessionEnded={() => {
                setSessionStarted(false);
                setRoomName("portfolio_agent_pending");
                resetMobileAskMode();
              }}
              mobileLayout={isMobileAskOpen ? "ask" : "portfolio"}
              onMobileBack={dismissMobileAsk}
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
      {isReturningMobile ? (
        <motion.div
          animate={{ x: `-${askTransition.offsetPercent}%` }}
          className="pointer-events-none fixed inset-0 z-50 bg-white md:hidden"
          initial={{ x: "0%" }}
          transition={toAskTransition(askTransition)}
        >
          <AskRouteTransitionPreview />
        </motion.div>
      ) : null}
    </>
  );
}
