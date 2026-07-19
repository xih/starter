"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SectionHeader } from "@starter/design-system";

import { TestingSession } from "~/app/testing/testing-session";
import { HeroSurface } from "../portfolio/portfolio-page";
import {
  ASK_TRANSITION_STORAGE_KEY,
  toAskTransition,
  useAskPushTransition,
} from "../portfolio/ask-transition";
import { PortfolioRouteTransitionPreview } from "../portfolio/transition-previews";

const DEFAULT_AGENT_NAME = "dennis-portfolio-agent";
const DEFAULT_TOKEN_ENDPOINT = "/api/livekit/guest-session";

function createBrowserSafeId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2, 15);
}

function createRoomName() {
  return `portfolio_ask_${createBrowserSafeId()}`;
}

export default function AskPage() {
  const router = useRouter();
  const askTransition = useAskPushTransition();
  const [enteredFromPortfolioPush] = useState(() => {
    if (typeof window === "undefined") return false;

    const didPush =
      window.sessionStorage.getItem(ASK_TRANSITION_STORAGE_KEY) === "push";
    window.sessionStorage.removeItem(ASK_TRANSITION_STORAGE_KEY);
    return didPush;
  });
  const [hasConversation, setHasConversation] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [endRequestKey, setEndRequestKey] = useState(0);
  const [roomName, setRoomName] = useState(createRoomName);
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  const isReturningRef = useRef(false);
  const returnTimeoutRef = useRef<number | null>(null);
  const isMobileChatExperience = isDesktop === false;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const updateViewportMode = () => setIsDesktop(mediaQuery.matches);

    updateViewportMode();
    mediaQuery.addEventListener("change", updateViewportMode);

    return () => {
      mediaQuery.removeEventListener("change", updateViewportMode);
      if (returnTimeoutRef.current) {
        window.clearTimeout(returnTimeoutRef.current);
      }
    };
  }, []);

  const returnToPortfolio = () => {
    if (isReturningRef.current) return;

    isReturningRef.current = true;
    setIsLeaving(true);
    returnTimeoutRef.current = window.setTimeout(() => {
      router.replace("/");
    }, askTransition.duration * 1000);
  };

  const requestEndAndReturn = () => {
    returnToPortfolio();
    setEndRequestKey((key) => key + 1);
  };

  return (
    <main className="min-h-screen bg-white text-[#121318]">
      {isDesktop === true ? (
        <TestingSession
          agentName={DEFAULT_AGENT_NAME}
          className="max-w-none gap-0 px-0 py-0 md:px-0 md:py-0"
          desktopHero={
            <div className="h-[928px]">
              <HeroSurface copyClassName="absolute left-[36px] top-[386px]" />
            </div>
          }
          desktopSectionClassName="gap-0 md:grid-cols-[minmax(0,1300px)_428px]"
          desktopSidebarClassName="h-[928px] border-0"
          onSessionEnded={() => {
            setRoomName(createRoomName());
            router.replace("/");
          }}
          persistMobileAskResume
          roomName={roomName}
          showDebugPanel={false}
          tokenEndpoint={DEFAULT_TOKEN_ENDPOINT}
        />
      ) : null}

      {isMobileChatExperience && isLeaving ? (
        <motion.div
          animate={{ x: "0%" }}
          className="fixed inset-0 z-0 md:hidden"
          initial={{ x: `-${askTransition.offsetPercent}%` }}
          transition={toAskTransition(askTransition)}
        >
          <PortfolioRouteTransitionPreview />
        </motion.div>
      ) : null}
      {isMobileChatExperience ? (
        <motion.section
          animate={{ x: isLeaving ? `${askTransition.offsetPercent}%` : "0%" }}
          className="relative z-10 min-h-svh bg-white md:hidden"
          data-testid="ask-mobile-route"
          initial={{
            x: enteredFromPortfolioPush
              ? "0%"
              : `${askTransition.offsetPercent}%`,
          }}
          transition={toAskTransition(askTransition)}
        >
          <SectionHeader
            className="absolute left-[20px] top-[24px] z-40 w-[calc(100%-40px)]"
            onBack={requestEndAndReturn}
            showBackButton
            subtext={
              hasConversation
                ? undefined
                : "This feature uses the memories of living people. It can make some mistakes"
            }
            title={hasConversation ? "" : "Hi, what would you like to ask?"}
          />
          <TestingSession
            agentName={DEFAULT_AGENT_NAME}
            className="max-w-none gap-0 px-0 py-0"
            endRequestKey={endRequestKey}
            mobileLayout="ask"
            onMobileBack={requestEndAndReturn}
            onMobileConversationChange={setHasConversation}
            onSessionEnded={() => {
              if (isReturningRef.current) {
                return;
              }

              setRoomName(createRoomName());
              returnToPortfolio();
            }}
            persistMobileAskResume
            roomName={roomName}
            showMobileBackButton={false}
            showMobileHeader={false}
            showDebugPanel={false}
            tokenEndpoint={DEFAULT_TOKEN_ENDPOINT}
          />
        </motion.section>
      ) : null}
    </main>
  );
}
