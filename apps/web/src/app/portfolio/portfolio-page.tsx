"use client";

import { MeshGradient } from "@paper-design/shaders-react";
import { useEffect, useRef, useState } from "react";
import { AgentControlBar, PortfolioFooter } from "@starter/design-system";
import type { VoiceOption } from "@starter/design-system";
import { type DialConfig, useDialKit } from "dialkit";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

import { DialKitRoot } from "~/components/DialKitRoot";
import { PortfolioCardGrid } from "~/components/PortfolioCard";
import { PortfolioHeader } from "~/components/PortfolioHeader";
import { SkeuomorphicClock } from "~/components/SkeuomorphicClock";
import {
  ASK_TRANSITION_STORAGE_KEY,
  toAskTransition,
  useAskPushTransition,
} from "./ask-transition";
import { hasActiveMobileAskResume } from "./mobile-ask-resume";
import { AskRouteTransitionPreview } from "./transition-previews";

const DEFAULT_VOICE: VoiceOption = {
  avatar: "/agent-sidebar/avatar-1.png",
  description: "Softbank founder",
  name: "Masa Son",
};

const HERO_MESH_GRADIENT_COLORS = [
  "#bcecf6",
  "#00aaff",
  "#00f7ff",
  "#ffd447",
] as const;
const HERO_MESH_GRADIENT_CONTROLS = {
  speed: [0.43, 0, 2, 0.01],
} satisfies DialConfig;

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
      <h1 className="w-full max-w-[294px] font-title text-[36px] font-[400] leading-[40px] text-white md:max-w-[530px]">
        Dennis is a product designer based in SF
      </h1>
      <p className="mt-[12px] w-full max-w-[294px] font-body text-[16px] font-[400] leading-[19.2px] text-white md:max-w-[536px] md:text-[24px] md:leading-[40px]">
        Previously at Nell, AGI, Krea, and Skydio.
      </p>
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
  shaderSpeed,
  onMobileStart,
}: {
  shaderSpeed: number;
  onMobileStart: () => void;
}) {
  return (
    <>
      <section className="hidden w-full border-b border-[var(--color-border-opaque)] md:block">
        <div className="h-[928px]">
          <HeroSurface
            copyClassName="absolute left-[36px] right-[36px] top-[322px]"
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
  const [isPushingMobile, setIsPushingMobile] = useState(false);
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

  const startMobileAsk = () => {
    window.sessionStorage.setItem(ASK_TRANSITION_STORAGE_KEY, "push");
    setIsPushingMobile(true);
    mobileAskTimeoutRef.current = window.setTimeout(() => {
      router.push("/ask");
    }, askTransition.duration * 1000);
  };

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
      <motion.main
        animate={{
          x: isPushingMobile ? `-${askTransition.offsetPercent}%` : "0%",
        }}
        className="min-h-screen overflow-x-hidden bg-white text-[#121318]"
        transition={toAskTransition(askTransition)}
      >
        <section className="mx-auto w-full md:max-w-[1728px]">
          <PortfolioLauncher
            shaderSpeed={heroMeshGradient.speed}
            onMobileStart={startMobileAsk}
          />

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
