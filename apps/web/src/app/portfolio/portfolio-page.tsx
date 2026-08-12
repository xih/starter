"use client";

import { MeshGradient } from "@paper-design/shaders-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PortfolioFooter } from "@starter/design-system";
import { type DialConfig, useDialKit } from "dialkit";
import { motion } from "framer-motion";

import { DialKitRoot } from "~/components/DialKitRoot";
import { PortfolioCardGrid } from "~/components/PortfolioCard";
import { PortfolioHeader } from "~/components/PortfolioHeader";
import { SkeuomorphicClock } from "~/components/SkeuomorphicClock";
import { TestingSession } from "~/app/testing/testing-session";
import { toAskTransition, useAskPushTransition } from "./ask-transition";
import {
  PORTFOLIO_HERO_HEADLINE,
  PORTFOLIO_HERO_PARAGRAPHS,
} from "./portfolio-copy";
import { AskRouteTransitionPreview } from "./transition-previews";

const DEFAULT_AGENT_NAME = "dennis-portfolio-agent";
const DEFAULT_TOKEN_ENDPOINT = "/api/livekit/guest-session";
const MOBILE_ASK_HISTORY_STATE_KEY = "__portfolioMobileAsk";
const HERO_MESH_GRADIENT_COLORS = [
  "#bcecf6",
  "#00aaff",
  "#00f7ff",
  "#ffd447",
] as const;
const HERO_MESH_GRADIENT_CONTROLS = {
  speed: [0.43, 0, 2, 0.01],
} satisfies DialConfig;

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

function HeroCopy({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <h1 className="w-full max-w-[294px] font-title text-[36px] font-[400] leading-[40px] text-white md:max-w-[720px]">
        {PORTFOLIO_HERO_HEADLINE}
      </h1>
      <div className="mt-[32px] w-full max-w-[294px] space-y-[24px] font-body text-[16px] font-[400] leading-[24px] text-white md:max-w-[811px] md:text-[24px] md:leading-[40px]">
        {PORTFOLIO_HERO_PARAGRAPHS.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </div>
  );
}

export function HeroSurface({
  copyClassName,
  shaderSpeed,
}: {
  copyClassName: string;
  shaderSpeed: number;
}) {
  return (
    <div
      className="relative size-full overflow-hidden bg-[#075970]"
      data-testid="portfolio-hero"
    >
      <PaperHeroShader speed={shaderSpeed} />
      <PortfolioHeader activePage="home" />
      <HeroCopy className={`z-10 ${copyClassName}`} />
      {/* Live chat is disabled on both mobile and desktop. */}
    </div>
  );
}

function FooterWithClock() {
  return (
    <PortfolioFooter
      clock={
        <SkeuomorphicClock
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
          Selected Work
        </h2>
        <PortfolioCardGrid className="mt-[46px] max-w-[1497px] gap-y-[90px]" />
      </section>

      <section className="pb-[102px] pt-[27px] md:hidden">
        <h2 className="px-[20px] font-title text-[25px] font-[700] leading-[29px]">
          Selected Work
        </h2>
        <PortfolioCardGrid className="mt-[10px] gap-y-[40px] px-[20px]" />
      </section>
    </>
  );
}

function PortfolioLauncher({
  shaderSpeed,
  onMobileStart: _onMobileStart,
}: {
  shaderSpeed: number;
  onMobileStart: () => void;
}) {
  return (
    <>
      <section className="hidden w-full border-b border-[var(--color-border-opaque)] md:block">
        <div className="h-[928px]">
          <HeroSurface
            copyClassName="absolute left-[116px] right-[116px] top-[428px]"
            shaderSpeed={shaderSpeed}
          />
          {/* Chat with Masa Son sidebar is disabled on desktop. */}
        </div>
      </section>

      <section className="relative h-[672px] w-full overflow-hidden md:hidden">
        <HeroSurface
          copyClassName="absolute left-[22px] right-[22px] top-[168px]"
          shaderSpeed={shaderSpeed}
        />
        {/* Mobile voice control bar disabled. */}
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
  const [sessionStarted, setSessionStarted] = useState(false);
  const [mobileAskMode, setMobileAskMode] = useState<MobileAskMode>("closed");
  const [roomName, setRoomName] = useState("portfolio_agent_pending");
  const mobileAskTimeoutRef = useRef<number | null>(null);
  const mobileReturnTimeoutRef = useRef<number | null>(null);
  const mobileAskHistoryRef = useRef(false);

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
                    copyClassName="absolute left-[116px] right-[116px] top-[428px]"
                    shaderSpeed={heroMeshGradient.speed}
                  />
                </div>
              }
              desktopSectionClassName="gap-0 border-b border-[var(--color-border-opaque)] md:grid-cols-1"
              desktopSidebarClassName="h-[928px]"
              mobileHero={
                <HeroSurface
                  copyClassName="absolute left-[22px] right-[22px] top-[168px]"
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
              showDesktopSidebar={false}
              tokenEndpoint={DEFAULT_TOKEN_ENDPOINT}
            />
          ) : (
            <PortfolioLauncher
              shaderSpeed={heroMeshGradient.speed}
              onMobileStart={startMobileAsk}
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
