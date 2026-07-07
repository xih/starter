"use client";

import {
  RoomAudioRenderer,
  SessionProvider,
  useAgent,
  useSession,
  useSessionMessages,
} from "@livekit/components-react";
import { ConnectionState, TokenSource } from "livekit-client";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  Mic,
  Play,
  RefreshCw,
  Square,
  Wifi,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import {
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AgentSideBar,
  type AgentSideBarMessage,
  type AgentSideBarState,
} from "~/components/AgentSideBar";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Toggle } from "~/components/ui/toggle";
import { env } from "~/env";
import { useInputControls } from "~/hooks/agents-ui/use-agent-control-bar";
import { cn } from "~/lib/utils";

const DEFAULT_AGENT_NAME =
  env.NEXT_PUBLIC_LIVEKIT_AGENT_NAME ?? "dennis-portfolio-agent";
const DEFAULT_TOKEN_ENDPOINT =
  env.NEXT_PUBLIC_LIVEKIT_TOKEN_ENDPOINT ?? "/api/livekit/token";
const STORYBOOK_ORIGIN =
  env.NEXT_PUBLIC_STORYBOOK_ORIGIN ?? "http://localhost:6006";

const lightModeTokenStyle = {
  "--background": "var(--color-background-primary)",
  "--foreground": "var(--color-text-primary)",
  "--card": "var(--color-background-primary)",
  "--card-foreground": "var(--color-text-primary)",
  "--popover": "var(--color-background-primary)",
  "--popover-foreground": "var(--color-text-primary)",
  "--primary": "var(--color-core-primary-a)",
  "--primary-foreground": "var(--color-text-inverse-primary)",
  "--secondary": "var(--color-background-secondary)",
  "--secondary-foreground": "var(--color-text-primary)",
  "--muted": "var(--color-background-secondary)",
  "--muted-foreground": "var(--color-text-secondary)",
  "--accent": "var(--color-background-hovered)",
  "--accent-foreground": "var(--color-text-primary)",
  "--destructive": "var(--color-core-negative)",
  "--destructive-foreground": "var(--color-text-inverse-primary)",
  "--border": "var(--color-border-opaque)",
  "--input": "var(--color-border-opaque)",
  "--ring": "var(--color-border-selected)",
} as CSSProperties;

type TokenProbeState =
  | { status: "idle"; detail: string }
  | { status: "checking"; detail: string }
  | { status: "success"; detail: string; statusCode: number }
  | { status: "error"; detail: string; statusCode?: number };

function messageText(message: { message?: unknown; text?: unknown }) {
  const value = message.message ?? message.text;
  return typeof value === "string" ? value : "";
}

function resolveSameOriginPath(endpoint: string) {
  const fallbackOrigin =
    typeof window === "undefined" ? "http://localhost" : window.location.origin;

  try {
    const url = new URL(endpoint, fallbackOrigin);
    if (url.origin !== fallbackOrigin) {
      return null;
    }

    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

function toAgentSideBarMessage(
  message: {
    from?: { identity?: string };
    id?: string;
    message?: unknown;
    text?: unknown;
    timestamp?: number;
    type?: string;
  },
  localIdentity: string,
  index: number,
): AgentSideBarMessage {
  const isUser =
    message.type === "userTranscript" ||
    message.from?.identity === localIdentity;

  return {
    id: message.id ?? `${message.timestamp ?? "message"}-${index}`,
    role: isUser ? "user" : "agent",
    text: messageText(message),
  };
}

function stateFromSession({
  agentState,
  connectionState,
  hasInput,
  hasMessages,
  manualState,
}: {
  agentState: string;
  connectionState: ConnectionState;
  hasInput: boolean;
  hasMessages: boolean;
  manualState: AgentSideBarState;
}): AgentSideBarState {
  if (manualState === "error") return "error";
  if (hasInput) return "user-typing";
  if (connectionState === ConnectionState.Connecting) return "loading";
  if (agentState === "speaking" || agentState === "thinking") {
    return "agent-streaming";
  }
  if (connectionState === ConnectionState.Connected && !hasMessages) {
    return "begin";
  }
  if (connectionState === ConnectionState.Connected) return "idle";
  return manualState;
}

function StatusPill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
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

function DiagnosticRow({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <StatusPill tone={tone}>{value}</StatusPill>
    </div>
  );
}

function LiveAgentConsole({
  agentName,
  endpointAuth,
  manualState,
  onSessionEnded,
  roomName,
  setManualState,
  startRequestId,
  tokenEndpoint,
}: {
  agentName: string;
  endpointAuth: string;
  manualState: AgentSideBarState;
  onSessionEnded: () => void;
  roomName: string;
  setManualState: (state: AgentSideBarState) => void;
  startRequestId: number;
  tokenEndpoint: string;
}) {
  const [inputValue, setInputValue] = useState("");
  const tokenSource = useMemo(
    () =>
      TokenSource.endpoint(
        tokenEndpoint,
        endpointAuth
          ? {
              headers: {
                Authorization: `Bearer ${endpointAuth}`,
              },
            }
          : undefined,
      ),
    [endpointAuth, tokenEndpoint],
  );
  const session = useSession(tokenSource, {
    agentName,
    participantName: "Local QA",
    roomName,
  });

  return (
    <SessionProvider session={session}>
      <LiveAgentSession
        agentName={agentName}
        inputValue={inputValue}
        manualState={manualState}
        onSessionEnded={onSessionEnded}
        session={session}
        setInputValue={setInputValue}
        setManualState={setManualState}
        startRequestId={startRequestId}
      />
      <RoomAudioRenderer />
    </SessionProvider>
  );
}

function LiveAgentSession({
  agentName,
  inputValue,
  manualState,
  onSessionEnded,
  session,
  setInputValue,
  setManualState,
  startRequestId,
}: {
  agentName: string;
  inputValue: string;
  manualState: AgentSideBarState;
  onSessionEnded: () => void;
  session: ReturnType<typeof useSession>;
  setInputValue: (value: string) => void;
  setManualState: (state: AgentSideBarState) => void;
  startRequestId: number;
}) {
  const agent = useAgent(session);
  const sessionMessages = useSessionMessages(session);
  const { microphoneToggle } = useInputControls();
  const startedRequestRef = useRef(0);
  const messages = sessionMessages.messages
    .map((message, index) =>
      toAgentSideBarMessage(
        message,
        session.room.localParticipant.identity,
        index,
      ),
    )
    .filter((message) => message.text.length > 0);
  const state = stateFromSession({
    agentState: agent.state,
    connectionState: session.connectionState,
    hasInput: inputValue.trim().length > 0,
    hasMessages: messages.length > 0,
    manualState,
  });
  const endSession = () => {
    setInputValue("");
    setManualState("intro");
    void session.end().finally(onSessionEnded);
  };

  useEffect(() => {
    if (startRequestId <= 0 || startedRequestRef.current === startRequestId) {
      return;
    }

    startedRequestRef.current = startRequestId;
    setManualState("loading");
    void session
      .start({
        tracks: {
          camera: { enabled: false },
          microphone: { enabled: true },
          screenShare: { enabled: false },
        },
      })
      .catch((error) => {
        console.error("LiveKit session start failed", error);
        setManualState("error");
      });
  }, [session, setManualState, startRequestId]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_402px]">
      <section className="border border-border bg-background p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Live session state</h2>
            <p className="text-sm text-muted-foreground">
              Uses the same LiveKit session hooks as the Storybook live stories.
            </p>
          </div>
          <StatusPill
            tone={
              session.connectionState === ConnectionState.Connected
                ? "good"
                : session.connectionState === ConnectionState.Connecting
                  ? "warn"
                  : "neutral"
            }
          >
            {session.connectionState === ConnectionState.Connected ? (
              <Wifi className="size-3.5" />
            ) : (
              <WifiOff className="size-3.5" />
            )}
            {session.connectionState}
          </StatusPill>
        </div>

        <div className="mt-4 grid gap-0 border-y border-border md:grid-cols-2">
          <DiagnosticRow label="Agent name" value={agentName} />
          <DiagnosticRow label="Agent state" value={agent.state} />
          <DiagnosticRow
            label="Local participant"
            value={session.room.localParticipant.identity || "pending"}
          />
          <DiagnosticRow
            label="Messages"
            value={String(messages.length)}
            tone={messages.length > 0 ? "good" : "neutral"}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={() => {
              startedRequestRef.current = 0;
              setManualState("loading");
              void session
                .start({
                  tracks: {
                    camera: { enabled: false },
                    microphone: { enabled: true },
                    screenShare: { enabled: false },
                  },
                })
                .catch((error) => {
                  console.error("LiveKit session start failed", error);
                  setManualState("error");
                });
            }}
            disabled={session.connectionState !== ConnectionState.Disconnected}
          >
            <Play />
            Start voice session
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={endSession}
            disabled={session.connectionState === ConnectionState.Disconnected}
          >
            <Square />
            End session
          </Button>
          <Toggle
            pressed={microphoneToggle.enabled}
            aria-label="Toggle microphone"
            onPressedChange={(enabled) => {
              void microphoneToggle.toggle(enabled);
            }}
          >
            <Mic />
            {microphoneToggle.enabled ? "Mic on" : "Mic off"}
          </Toggle>
        </div>

        <div className="mt-5">
          <Label htmlFor="livekit-message">Send a text message</Label>
          <div className="mt-2 flex gap-2">
            <Input
              id="livekit-message"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder="Ask the agent to introduce itself"
              disabled={session.connectionState !== ConnectionState.Connected}
            />
            <Button
              type="button"
              disabled={
                session.connectionState !== ConnectionState.Connected ||
                inputValue.trim().length === 0 ||
                sessionMessages.isSending
              }
              onClick={() => {
                const message = inputValue.trim();
                if (!message) return;
                void sessionMessages
                  .send(message)
                  .then(() => setInputValue(""));
              }}
            >
              {sessionMessages.isSending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Copy />
              )}
              Send
            </Button>
          </div>
        </div>
      </section>

      <AgentSideBar
        inputValue={inputValue}
        isMicrophoneEnabled={microphoneToggle.enabled}
        isSending={sessionMessages.isSending}
        messages={messages}
        onChangeInput={setInputValue}
        onEnd={endSession}
        onSend={async (message) => {
          await sessionMessages.send(message);
          setInputValue("");
        }}
        onStart={() => {
          setManualState("loading");
          void session
            .start({
              tracks: {
                camera: { enabled: false },
                microphone: { enabled: true },
                screenShare: { enabled: false },
              },
            })
            .catch((error) => {
              console.error("LiveKit session start failed", error);
              setManualState("error");
            });
        }}
        onToggleMicrophone={() => {
          void microphoneToggle.toggle(!microphoneToggle.enabled);
        }}
        state={state}
        voiceName="Portfolio Agent"
      />
    </div>
  );
}

function LiveAgentLauncher({
  manualState,
  onStart,
}: {
  manualState: AgentSideBarState;
  onStart: () => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_402px]">
      <section className="border border-border bg-background p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Live session state</h2>
            <p className="text-sm text-muted-foreground">
              The LiveKit session hook stays idle until you intentionally start
              a voice session.
            </p>
          </div>
          <StatusPill>
            <WifiOff className="size-3.5" />
            disconnected
          </StatusPill>
        </div>

        <div className="mt-4 grid gap-0 border-y border-border md:grid-cols-2">
          <DiagnosticRow label="Agent state" value="not mounted" />
          <DiagnosticRow label="Manual state" value={manualState} />
          <DiagnosticRow label="Local participant" value="pending" />
          <DiagnosticRow label="Messages" value="0" />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button type="button" onClick={onStart}>
            <Play />
            Start voice session
          </Button>
          <Button type="button" variant="outline" disabled>
            <Square />
            End session
          </Button>
          <Toggle pressed={false} aria-label="Toggle microphone" disabled>
            <Mic />
            Mic off
          </Toggle>
        </div>

        <div className="mt-5">
          <Label htmlFor="livekit-message-disabled">Send a text message</Label>
          <div className="mt-2 flex gap-2">
            <Input
              id="livekit-message-disabled"
              placeholder="Ask the agent to introduce itself"
              disabled
            />
            <Button type="button" disabled>
              <Copy />
              Send
            </Button>
          </div>
        </div>
      </section>

      <AgentSideBar
        isMicrophoneEnabled={false}
        messages={[]}
        onStart={onStart}
        state="intro"
        voiceName="Portfolio Agent"
      />
    </div>
  );
}

export default function LiveKitAgentPage() {
  const [agentName, setAgentName] = useState(DEFAULT_AGENT_NAME);
  const [endpointAuth, setEndpointAuth] = useState("");
  const [manualState, setManualState] = useState<AgentSideBarState>("intro");
  const [roomName, setRoomName] = useState(
    () => `local_agent_${crypto.randomUUID()}`,
  );
  const [sessionStartRequestId, setSessionStartRequestId] = useState(0);
  const [tokenEndpoint, setTokenEndpoint] = useState(DEFAULT_TOKEN_ENDPOINT);
  const [probe, setProbe] = useState<TokenProbeState>({
    status: "idle",
    detail: "Run a token probe before starting the room.",
  });
  const [isMobilePreset, setIsMobilePreset] = useState(false);
  const resolvedTokenEndpoint = useMemo(
    () => resolveSameOriginPath(tokenEndpoint),
    [tokenEndpoint],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextAgentName = params.get("agentName");
    const nextTokenEndpoint = params.get("tokenEndpoint");
    const nextViewport = params.get("viewport");

    if (nextAgentName) setAgentName(nextAgentName);
    if (nextTokenEndpoint) setTokenEndpoint(nextTokenEndpoint);
    setIsMobilePreset(nextViewport === "mobile");
  }, []);

  const probeTone =
    probe.status === "success"
      ? "good"
      : probe.status === "error"
        ? "bad"
        : probe.status === "checking"
          ? "warn"
          : "neutral";

  const runTokenProbe = async () => {
    setProbe({ status: "checking", detail: "Requesting LiveKit token..." });

    if (!resolvedTokenEndpoint) {
      setProbe({
        status: "error",
        detail: "Token endpoint must be a same-origin path.",
      });
      return;
    }

    try {
      const response = await fetch(resolvedTokenEndpoint, {
        body: JSON.stringify({
          dispatch_agent: false,
          participant_name: "Local QA",
          room_config: {
            agents: [{ agentName }],
          },
          room_name: roomName,
        }),
        headers: {
          "Content-Type": "application/json",
          ...(endpointAuth ? { Authorization: `Bearer ${endpointAuth}` } : {}),
        },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        participant_token?: string;
        server_url?: string;
      } | null;

      if (!response.ok) {
        setProbe({
          status: "error",
          statusCode: response.status,
          detail: payload?.error ?? "Token endpoint returned an error.",
        });
        return;
      }

      setProbe({
        status: "success",
        statusCode: response.status,
        detail:
          payload?.participant_token && payload.server_url
            ? "Token issued and LiveKit server URL returned."
            : "Endpoint responded, but token payload was incomplete.",
      });
    } catch (error) {
      setProbe({
        status: "error",
        detail: error instanceof Error ? error.message : "Token probe failed.",
      });
    }
  };
  const startLiveSession = () => {
    if (!resolvedTokenEndpoint) {
      setProbe({
        status: "error",
        detail: "Token endpoint must be a same-origin path.",
      });
      return;
    }

    setManualState("loading");
    setSessionStartRequestId((requestId) => requestId + 1);
  };
  const endLiveSession = () => {
    setSessionStartRequestId(0);
  };

  return (
    <main
      className="min-h-screen bg-[var(--color-background-secondary)] text-foreground"
      style={lightModeTokenStyle}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 md:px-6">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">
              LiveKit Agent Local QA
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Validate token issuance, browser connection, microphone publish,
              agent dispatch, chat messages, and clean disconnect from one page.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/api/livekit/token">
                Token route
                <ExternalLink />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <a href={STORYBOOK_ORIGIN} target="_blank" rel="noreferrer">
                Storybook
                <ExternalLink />
              </a>
            </Button>
          </div>
        </header>

        <section
          className={cn(
            "grid gap-4",
            isMobilePreset
              ? "mx-auto max-w-[428px] lg:grid-cols-1"
              : "lg:grid-cols-[minmax(280px,360px)_1fr]",
          )}
        >
          <div className="border border-border bg-background p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">Connection setup</h2>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setRoomName(`local_agent_${crypto.randomUUID()}`);
                  setManualState("intro");
                  setSessionStartRequestId(0);
                }}
              >
                <RefreshCw />
                New room
              </Button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="token-endpoint">Token endpoint</Label>
                <Input
                  id="token-endpoint"
                  value={tokenEndpoint}
                  onChange={(event) => setTokenEndpoint(event.target.value)}
                  aria-invalid={!resolvedTokenEndpoint}
                />
                {!resolvedTokenEndpoint ? (
                  <p className="text-xs text-[var(--color-text-negative)]">
                    Use a same-origin path, for example /api/livekit/token.
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="agent-name">Agent name</Label>
                <Input
                  id="agent-name"
                  value={agentName}
                  onChange={(event) => setAgentName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="room-name">Room name</Label>
                <Input
                  id="room-name"
                  value={roomName}
                  onChange={(event) => setRoomName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endpoint-auth">Optional endpoint auth</Label>
                <Input
                  id="endpoint-auth"
                  value={endpointAuth}
                  type="password"
                  onChange={(event) => setEndpointAuth(event.target.value)}
                  placeholder="Only for local/prod token endpoint diagnostics"
                />
              </div>
            </div>

            <div className="mt-5 border-y border-border">
              <DiagnosticRow
                label="Token probe"
                value={probe.status}
                tone={probeTone}
              />
              <DiagnosticRow
                label="Manual state"
                value={manualState}
                tone={manualState === "error" ? "bad" : "neutral"}
              />
            </div>

            <div className="bg-muted/30 mt-4 rounded-md border border-border p-3 text-sm text-muted-foreground">
              <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                {probe.status === "success" ? (
                  <CheckCircle2 className="size-4 text-emerald-600" />
                ) : probe.status === "error" ? (
                  <AlertCircle className="size-4 text-red-600" />
                ) : (
                  <AlertCircle className="size-4" />
                )}
                Latest probe
              </div>
              <p>{probe.detail}</p>
              {"statusCode" in probe && probe.statusCode ? (
                <p className="mt-1">HTTP {probe.statusCode}</p>
              ) : null}
            </div>

            <Button
              className="mt-4 w-full"
              type="button"
              onClick={() => {
                void runTokenProbe();
              }}
              disabled={probe.status === "checking"}
            >
              {probe.status === "checking" ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Wifi />
              )}
              Probe token endpoint
            </Button>
          </div>

          <div className="space-y-4">
            <section className="border border-border bg-background p-4">
              <h2 className="text-base font-semibold">Scenario links</h2>
              <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                <a
                  className="text-[var(--color-text-accent)] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  href="/livekit-agent"
                >
                  Local happy path
                </a>
                <a
                  className="text-[var(--color-text-accent)] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  href="/livekit-agent?viewport=mobile"
                >
                  Mobile-width manual check
                </a>
                <a
                  className="text-[var(--color-text-accent)] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  href="/livekit-agent?tokenEndpoint=/api/livekit/missing"
                >
                  Token error path
                </a>
                <a
                  className="text-[var(--color-text-accent)] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  href={`${STORYBOOK_ORIGIN}/?path=/story/livekit-agent-session-panel--live-cloud-session`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Storybook AgentSessionPanel live story
                </a>
                <a
                  className="text-[var(--color-text-accent)] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  href={`${STORYBOOK_ORIGIN}/?path=/story/dennis-design-system-agent-side-bar--live-cloud-session`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Storybook AgentSideBar live story
                </a>
              </div>
            </section>

            {sessionStartRequestId > 0 && resolvedTokenEndpoint ? (
              <LiveAgentConsole
                agentName={agentName}
                endpointAuth={endpointAuth}
                manualState={manualState}
                onSessionEnded={endLiveSession}
                roomName={roomName}
                setManualState={setManualState}
                startRequestId={sessionStartRequestId}
                tokenEndpoint={resolvedTokenEndpoint}
              />
            ) : (
              <LiveAgentLauncher
                manualState={manualState}
                onStart={startLiveSession}
              />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
