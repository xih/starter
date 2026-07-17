"use client";

import {
  AgentControlBar as DesignAgentControlBar,
  type VoiceOption,
} from "@starter/design-system";
import { Play, WifiOff } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";

import { AgentSideBar } from "~/components/AgentSideBar";
import {
  fallbackPersonaVoiceOptions,
  PersonaVoiceSwitcher,
  type PersonaVoiceOption,
} from "~/components/PersonaVoiceSwitcher";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import type { TestingSessionProps } from "./testing-session";

const DEFAULT_AGENT_NAME = "dennis-portfolio-agent";
const DEFAULT_TOKEN_ENDPOINT = "/api/livekit/guest-session";
const TOKEN_ENDPOINT_LABEL = "/api/livekit/token";
const GUEST_TOKEN_ENDPOINT_LABEL = "/api/livekit/guest-session";
const TOKEN_ERROR_ENDPOINT_LABEL = "/api/livekit/missing";
const DEFAULT_VOICE: VoiceOption = {
  avatar: "/agent-sidebar/avatar-1.png",
  description: "Softbank founder",
  name: "Masa Son",
};

type TestingSessionComponent = ComponentType<TestingSessionProps>;
type AllowedTestingTokenEndpoint =
  | typeof TOKEN_ENDPOINT_LABEL
  | typeof GUEST_TOKEN_ENDPOINT_LABEL
  | typeof TOKEN_ERROR_ENDPOINT_LABEL;

function createRoomName() {
  return `testing_agent_${crypto.randomUUID()}`;
}

function resolveAllowedTestingTokenEndpoint(
  endpoint: string | null,
): AllowedTestingTokenEndpoint {
  if (!endpoint) {
    return DEFAULT_TOKEN_ENDPOINT;
  }

  try {
    const url = new URL(endpoint, "http://local.invalid");
    if (url.origin !== "http://local.invalid" || url.search) {
      return DEFAULT_TOKEN_ENDPOINT;
    }

    switch (url.pathname) {
      case TOKEN_ENDPOINT_LABEL:
        return TOKEN_ENDPOINT_LABEL;
      case GUEST_TOKEN_ENDPOINT_LABEL:
        return GUEST_TOKEN_ENDPOINT_LABEL;
      case TOKEN_ERROR_ENDPOINT_LABEL:
        return TOKEN_ERROR_ENDPOINT_LABEL;
      default:
        return DEFAULT_TOKEN_ENDPOINT;
    }
  } catch {
    return DEFAULT_TOKEN_ENDPOINT;
  }
}

function personaToVoice(persona: PersonaVoiceOption | undefined): VoiceOption {
  if (!persona) {
    return DEFAULT_VOICE;
  }

  return {
    avatar: persona.avatar_url,
    description: persona.description,
    name: persona.display_name,
  };
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

function TestingLauncher({
  errorMessage,
  onStart,
  onSelectPersona,
  personas,
  selectedPersonaId,
}: {
  errorMessage?: string | null;
  onStart: () => void;
  onSelectPersona: (personaId: string) => void;
  personas: PersonaVoiceOption[];
  selectedPersonaId: string;
}) {
  const selectedPersona =
    personas.find((persona) => persona.id === selectedPersonaId) ?? personas[0];
  const voice = personaToVoice(selectedPersona);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 px-4 py-4 md:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-semibold tracking-normal">/testing</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live AgentSideBar on web, compact voice controls on mobile.
          </p>
        </div>
        <StatusPill tone={errorMessage ? "bad" : "neutral"}>
          <WifiOff className="size-3.5" />
          {errorMessage ? "failed" : "disconnected"}
        </StatusPill>
      </header>
      {errorMessage ? (
        <div className="rounded-[18px] border border-red-200 bg-white p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

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
            <PersonaVoiceSwitcher
              onSelectPersona={onSelectPersona}
              personas={personas}
              selectedPersonaId={selectedPersonaId}
            />
            <DesignAgentControlBar
              className="w-full"
              onOpenVoicePanel={() => undefined}
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
            onSelectPersona={onSelectPersona}
            onStart={onStart}
            personas={personas}
            selectedPersonaId={selectedPersonaId}
            state="intro"
            voiceName="Portfolio Agent"
          />
        </div>
      </section>
    </div>
  );
}

function TestingLauncherSkeleton({
  errorMessage,
}: {
  errorMessage?: string | null;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 px-4 py-4 md:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-semibold tracking-normal">/testing</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Loading voice session...
          </p>
        </div>
        <StatusPill tone={errorMessage ? "bad" : "warn"}>
          {errorMessage ? "failed" : "loading"}
        </StatusPill>
      </header>
      {errorMessage ? (
        <div className="rounded-[18px] border border-red-200 bg-white p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}
    </div>
  );
}

export function TestingClient() {
  const { setTheme } = useTheme();
  const [agentName, setAgentName] = useState(DEFAULT_AGENT_NAME);
  const [roomName, setRoomName] = useState("testing_agent_pending");
  const [SessionComponent, setSessionComponent] =
    useState<TestingSessionComponent | null>(null);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  const [personas, setPersonas] = useState<PersonaVoiceOption[]>(
    fallbackPersonaVoiceOptions,
  );
  const [selectedPersonaId, setSelectedPersonaId] = useState("portfolio-agent");
  const [sessionKey, setSessionKey] = useState(0);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [tokenEndpoint, setTokenEndpoint] = useState(DEFAULT_TOKEN_ENDPOINT);

  const restartSession = () => {
    setRoomName(createRoomName());
    setSessionKey((key) => key + 1);
    setSessionStarted(true);
  };

  const startSession = async () => {
    setLoadErrorMessage(null);
    restartSession();

    if (SessionComponent) return;

    try {
      const mod = await import("./testing-session");
      setSessionComponent(() => mod.TestingSession);
    } catch (error) {
      console.error("Failed to load testing session component", error);
      setLoadErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not load the testing session. Refresh and try again.",
      );
      setSessionStarted(false);
    }
  };

  useEffect(() => {
    setTheme("light");
    const params = new URLSearchParams(window.location.search);
    setAgentName(params.get("agentName") ?? DEFAULT_AGENT_NAME);
    setTokenEndpoint(
      resolveAllowedTestingTokenEndpoint(params.get("tokenEndpoint")),
    );
    setRoomName(params.get("roomName") ?? createRoomName());
  }, [setTheme]);

  useEffect(() => {
    let isActive = true;

    void fetch("/api/personas")
      .then(
        (response) =>
          response.json() as Promise<{ personas?: PersonaVoiceOption[] }>,
      )
      .then((payload) => {
        if (!isActive || !payload.personas?.length) return;

        setPersonas(payload.personas);
        setSelectedPersonaId((current) =>
          payload.personas?.some((persona) => persona.id === current)
            ? current
            : (payload.personas?.[0]?.id ?? "portfolio-agent"),
        );
      })
      .catch((error) => {
        console.error("Could not load testing personas", error);
      });

    return () => {
      isActive = false;
    };
  }, []);

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
            onRestartWithPersona={restartSession}
            onSelectPersona={setSelectedPersonaId}
            roomName={roomName}
            selectedPersonaId={selectedPersonaId}
            tokenEndpoint={tokenEndpoint}
          />
        ) : (
          <TestingLauncherSkeleton errorMessage={loadErrorMessage} />
        )
      ) : (
        <TestingLauncher
          errorMessage={loadErrorMessage}
          onSelectPersona={setSelectedPersonaId}
          onStart={() => {
            void startSession();
          }}
          personas={personas}
          selectedPersonaId={selectedPersonaId}
        />
      )}
    </main>
  );
}
