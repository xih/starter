"use client";

import {
  AgentControlBar as DesignAgentControlBar,
  VoiceParameterPanel,
  type VoiceOption,
} from "@starter/design-system";
import { AnimatePresence, motion } from "framer-motion";
import { Play, WifiOff } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";

import { AgentSideBar } from "~/components/AgentSideBar";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import type { TestingSessionProps } from "./testing-session";

const DEFAULT_AGENT_NAME = "dennis-portfolio-agent";
const DEFAULT_TOKEN_ENDPOINT = "/api/livekit/guest-session";
const DEFAULT_VOICE: VoiceOption = {
  avatar: "/agent-sidebar/avatar-1.png",
  description: "Softbank founder",
  name: "Masa Son",
};
type TestingSessionComponent = ComponentType<TestingSessionProps>;

function createRoomName() {
  return `testing_agent_${crypto.randomUUID()}`;
}

function StatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-medium",
        tone === "neutral" && "border-border bg-background text-foreground",
        tone === "good" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        tone === "warn" && "border-amber-200 bg-amber-50 text-amber-800",
        tone === "bad" && "border-red-200 bg-red-50 text-red-700",
      )}
    >
      {children}
    </span>
  );
}

function TestingLauncher({ onStart }: { onStart: () => void }) {
  const [isVoicePanelOpen, setIsVoicePanelOpen] = useState(false);
  const [voice, setVoice] = useState<VoiceOption>(DEFAULT_VOICE);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 px-4 py-4 md:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-semibold tracking-normal">/testing</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live AgentSideBar on web, compact voice controls on mobile.
          </p>
        </div>
        <StatusPill>
          <WifiOff className="size-3.5" />
          disconnected
        </StatusPill>
      </header>

      <section className="grid gap-4 md:grid-cols-[minmax(0,1fr)_402px]">
        <div className="hidden min-h-[420px] flex-col justify-center border border-border bg-background p-4 md:flex">
          <div className="mx-auto flex max-w-sm flex-col items-center gap-4 text-center">
            <div className="flex size-40 items-center justify-center rounded-full border border-border bg-muted">
              <div>
                <p className="text-sm font-medium">not started</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ready to connect.
                </p>
              </div>
            </div>
            <Button type="button" onClick={onStart}>
              <Play />
              Start
            </Button>
          </div>
        </div>

        <div className="flex min-h-[681px] flex-col justify-end md:hidden">
          <div className="flex w-full flex-col gap-[8px]">
            <AnimatePresence initial={false}>
              {isVoicePanelOpen ? (
                <motion.div
                  animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
                  exit={{ filter: "blur(4px)", opacity: 0, y: 8 }}
                  initial={{ filter: "blur(4px)", opacity: 0, y: 8 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                >
                  <VoiceParameterPanel
                    className="w-full"
                    onSelectVoice={(nextVoice) => {
                      setVoice(nextVoice);
                      setIsVoicePanelOpen(false);
                    }}
                    selectedVoiceName={voice.name}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
            <DesignAgentControlBar
              className="w-full"
              onOpenVoicePanel={() => {
                setIsVoicePanelOpen((open) => !open);
              }}
              onUseVoice={onStart}
              state="pre-connected"
              voice={voice}
            />
          </div>
        </div>

        <div className="hidden md:block">
          <AgentSideBar
            isMicrophoneEnabled={false}
            messages={[]}
            onStart={onStart}
            state="intro"
            voiceName="Portfolio Agent"
          />
        </div>
      </section>
    </div>
  );
}

function TestingLauncherSkeleton() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 px-4 py-4 md:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-semibold tracking-normal">/testing</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Loading voice session...
          </p>
        </div>
        <StatusPill tone="warn">loading</StatusPill>
      </header>
    </div>
  );
}

export function TestingClient() {
  const { setTheme } = useTheme();
  const [agentName, setAgentName] = useState(DEFAULT_AGENT_NAME);
  const [roomName, setRoomName] = useState("testing_agent_pending");
  const [SessionComponent, setSessionComponent] =
    useState<TestingSessionComponent | null>(null);
  const [sessionKey, setSessionKey] = useState(0);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [tokenEndpoint, setTokenEndpoint] = useState(DEFAULT_TOKEN_ENDPOINT);

  const startSession = async () => {
    setSessionKey((key) => key + 1);
    setSessionStarted(true);

    if (SessionComponent) return;
    const mod = await import("./testing-session");
    setSessionComponent(() => mod.TestingSession);
  };

  useEffect(() => {
    setTheme("light");
    const params = new URLSearchParams(window.location.search);
    setAgentName(params.get("agentName") ?? DEFAULT_AGENT_NAME);
    setTokenEndpoint(params.get("tokenEndpoint") ?? DEFAULT_TOKEN_ENDPOINT);
    setRoomName(params.get("roomName") ?? createRoomName());
  }, [setTheme]);

  return (
    <main className="light min-h-screen bg-[var(--color-background-secondary)] text-foreground">
      {sessionStarted ? (
        SessionComponent ? (
          <SessionComponent
            key={sessionKey}
            agentName={agentName}
            onSessionEnded={() => {
              setSessionStarted(false);
              setRoomName(createRoomName());
            }}
            roomName={roomName}
            tokenEndpoint={tokenEndpoint}
          />
        ) : (
          <TestingLauncherSkeleton />
        )
      ) : (
        <TestingLauncher
          onStart={() => {
            void startSession();
          }}
        />
      )}
    </main>
  );
}
