"use client";

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

function WaveGradientShader() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const context = canvas.getContext("2d");
    if (!context) return undefined;

    let frame = 0;
    let animationFrame = 0;

    const resize = () => {
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * scale));
      canvas.height = Math.max(1, Math.floor(rect.height * scale));
      context.setTransform(scale, 0, 0, scale, 0, 0);
    };

    const render = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const time = frame * 0.012;
      const wave = Math.sin(time) * 0.08;
      const gradient = context.createLinearGradient(
        width * (0.02 + wave),
        0,
        width * (1.05 + wave),
        height * 0.56,
      );

      gradient.addColorStop(0, "#1d9df1");
      gradient.addColorStop(0.28, "#6f93ef");
      gradient.addColorStop(0.52, "#d790d2");
      gradient.addColorStop(0.72, "#9d9bec");
      gradient.addColorStop(1, "#006079");

      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);

      const bandY = height * (0.38 + Math.sin(time * 0.8) * 0.05);
      const darkBand = context.createLinearGradient(
        0,
        bandY - 160,
        width,
        bandY + 220,
      );
      darkBand.addColorStop(0, "rgba(3, 94, 120, 0)");
      darkBand.addColorStop(0.44, "rgba(2, 52, 62, 0.7)");
      darkBand.addColorStop(0.72, "rgba(2, 76, 91, 0.95)");
      darkBand.addColorStop(1, "rgba(2, 92, 110, 0)");

      context.save();
      context.translate(width / 2, bandY);
      context.rotate(-0.12 + Math.sin(time * 0.6) * 0.04);
      context.fillStyle = darkBand;
      context.filter = "blur(34px)";
      context.fillRect(-width * 0.8, -160, width * 1.6, 350);
      context.restore();

      const glow = context.createRadialGradient(
        width * (0.78 + Math.sin(time * 0.7) * 0.08),
        height * 0.08,
        0,
        width * 0.72,
        height * 0.08,
        width * 0.62,
      );
      glow.addColorStop(0, "rgba(255, 152, 181, 0.72)");
      glow.addColorStop(0.38, "rgba(194, 154, 235, 0.44)");
      glow.addColorStop(1, "rgba(255, 255, 255, 0)");
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);

      frame += 1;
      animationFrame = window.requestAnimationFrame(render);
    };

    resize();
    render();
    window.addEventListener("resize", resize);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 size-full"
      data-testid="portfolio-gradient-shader"
    />
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
      <WaveGradientShader />
      <HeroCopy className={copyClassName} />
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
      <section className="hidden w-full md:block">
        <div className="grid h-[928px] grid-cols-[minmax(0,1300px)_428px]">
          <HeroSurface copyClassName="absolute left-[116px] top-[339px]" />
          <AgentSideBar
            className="h-[928px] border-0"
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
              desktopSectionClassName="gap-0 md:grid-cols-[minmax(0,1300px)_428px]"
              desktopSidebarClassName="h-[928px] border-0"
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
