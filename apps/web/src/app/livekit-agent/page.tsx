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
  useCallback,
  useReducer,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AgentSideBar,
  type AgentSideBarPersona,
  type AgentSideBarMessage,
  type AgentSideBarState,
} from "~/components/AgentSideBar";
import {
  getPersonaSwitchRpcIdentity,
  usePersonaSwitchRpc,
} from "~/components/persona-switch-rpc";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Toggle } from "~/components/ui/toggle";
import { env } from "~/env";
import { useInputControls } from "~/hooks/agents-ui/use-agent-control-bar";
import { cn } from "~/lib/utils";
import {
  registerToolCallStatusRpc,
  ToolCallStatusPanel,
  type ToolCallStatus,
  toolCallStatusReducer,
} from "./tool-call-status";

const DEFAULT_AGENT_NAME =
  env.NEXT_PUBLIC_LIVEKIT_AGENT_NAME ?? "dennis-portfolio-agent";
const DEFAULT_TOKEN_ENDPOINT =
  env.NEXT_PUBLIC_LIVEKIT_TOKEN_ENDPOINT ?? "/api/livekit/token";
const STORYBOOK_ORIGIN = env.NEXT_PUBLIC_STORYBOOK_ORIGIN ?? "/storybook/";
const STORYBOOK_URL = STORYBOOK_ORIGIN.replace(/\/?$/, "/");
const TOKEN_ENDPOINT_LABEL = "/api/livekit/token";
const GUEST_TOKEN_ENDPOINT_LABEL = "/api/livekit/guest-session";
const TOKEN_ERROR_ENDPOINT_LABEL = "/api/livekit/missing";

type AllowedTokenEndpoint =
  | typeof TOKEN_ENDPOINT_LABEL
  | typeof GUEST_TOKEN_ENDPOINT_LABEL
  | typeof TOKEN_ERROR_ENDPOINT_LABEL;

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

type TokenEndpointPayload = {
  code?: string;
  error?: string;
  participant_token?: string;
  server_url?: string;
  signup_url?: string;
};

type PersonaListPayload = {
  personas?: AgentSideBarPersona[];
};

function messageText(message: { message?: unknown; text?: unknown }) {
  const value = message.message ?? message.text;
  return typeof value === "string" ? value : "";
}

function createLocalAgentRoomName() {
  return `local_agent_${crypto.randomUUID()}`;
}

function getCompletedSources(toolCallStatus: ToolCallStatus | null) {
  return toolCallStatus?.state === "completed"
    ? (toolCallStatus.sources ?? [])
    : [];
}

function getVisibleToolCallStatus(toolCallStatus: ToolCallStatus | null) {
  return toolCallStatus?.state === "completed" ? null : toolCallStatus;
}

function resolveAllowedTokenEndpoint(
  endpoint: string,
): AllowedTokenEndpoint | null {
  try {
    const url = new URL(endpoint, "http://local.invalid");
    if (url.origin !== "http://local.invalid" || url.search) {
      return null;
    }

    switch (url.pathname) {
      case TOKEN_ENDPOINT_LABEL:
        return TOKEN_ENDPOINT_LABEL;
      case GUEST_TOKEN_ENDPOINT_LABEL:
        return GUEST_TOKEN_ENDPOINT_LABEL;
      case TOKEN_ERROR_ENDPOINT_LABEL:
        return TOKEN_ERROR_ENDPOINT_LABEL;
      default:
        return null;
    }
  } catch {
    return null;
  }
}

function fetchAllowedTokenEndpoint(
  endpoint: AllowedTokenEndpoint,
  init: RequestInit,
) {
  switch (endpoint) {
    case TOKEN_ENDPOINT_LABEL:
      return fetch(TOKEN_ENDPOINT_LABEL, init);
    case GUEST_TOKEN_ENDPOINT_LABEL:
      return fetch(GUEST_TOKEN_ENDPOINT_LABEL, init);
    case TOKEN_ERROR_ENDPOINT_LABEL:
      return fetch(TOKEN_ERROR_ENDPOINT_LABEL, init);
  }
}

function statusLabel(statusCode: number) {
  switch (statusCode) {
    case 200:
      return "OK";
    case 201:
      return "Created";
    case 204:
      return "No Content";
    case 401:
      return "Unauthorized";
    case 403:
      return "Forbidden";
    case 404:
      return "Not Found";
    case 409:
      return "Conflict";
    case 429:
      return "Too Many Requests";
    case 500:
      return "Server Error";
    default:
      return statusCode >= 200 && statusCode < 300 ? "Success" : "Error";
  }
}

function humanizeTokenEndpointResult({
  endpoint,
  payload,
  statusCode,
}: {
  endpoint: AllowedTokenEndpoint;
  payload: TokenEndpointPayload | null;
  statusCode: number;
}) {
  const engineerDetail = `Engineer detail: ${endpoint} returned HTTP ${statusCode} ${statusLabel(statusCode)}${
    payload?.code ? ` with code "${payload.code}"` : ""
  }${payload?.error ? ` and message "${payload.error}"` : ""}.`;

  if (statusCode === 200 && endpoint === GUEST_TOKEN_ENDPOINT_LABEL) {
    return `Guest session token reused successfully. LiveKit can now reconnect to the existing active room. ${engineerDetail}`;
  }

  if (statusCode === 201) {
    return `Token issued successfully. LiveKit can now attempt to connect with the returned server URL and participant token. ${engineerDetail}`;
  }

  if (statusCode === 204 && endpoint === GUEST_TOKEN_ENDPOINT_LABEL) {
    return `Guest endpoint is reachable and this origin is allowed. This probe did not create a guest session; use Start voice session to request the actual token. ${engineerDetail}`;
  }

  if (statusCode === 401) {
    return `The token route rejected the request because endpoint auth is missing or incorrect. Paste the QA/admin secret only when testing /api/livekit/token. ${engineerDetail}`;
  }

  if (statusCode === 403) {
    return `This browser origin is not allowed to request LiveKit tokens. In production, confirm the current site origin is part of the shared LiveKit route policy; in non-production, add it to LIVEKIT_ALLOWED_ORIGINS and restart or redeploy the app. ${engineerDetail}`;
  }

  if (statusCode === 404) {
    return `The configured token endpoint does not exist. Check the tokenEndpoint query string and route registration. ${engineerDetail}`;
  }

  if (statusCode === 409 || payload?.code === "active_session_exists") {
    return `A guest voice session is already active for this browser or IP. End the current session or wait for the 30-second QStash cleanup before starting another one. ${engineerDetail}`;
  }

  if (statusCode === 429 || payload?.code === "guest_trial_used") {
    return `The guest trial cooldown blocked this request. In dev, clear the livekit:guest Redis keys or turn off the guest cooldown flag; in prod, send the user to signup. ${engineerDetail}`;
  }

  if (statusCode >= 500) {
    return `The server failed while issuing the LiveKit token. Check Vercel/local logs for LiveKit, Upstash Redis, QStash, and environment-variable configuration. ${engineerDetail}`;
  }

  if (payload?.participant_token && payload.server_url) {
    return `Token endpoint responded with the expected LiveKit token payload. ${engineerDetail}`;
  }

  if (statusCode >= 200 && statusCode < 300) {
    return `The endpoint returned success, but the LiveKit token payload was incomplete. ${engineerDetail}`;
  }

  return `${payload?.error ?? "Token endpoint returned an error."} ${engineerDetail}`;
}

function humanizeLiveKitStartError(error: unknown, endpoint: string) {
  const message = error instanceof Error ? error.message : String(error);
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("active_session_exists") ||
    message.includes("409")
  ) {
    return `Could not start voice because a guest session is already active. Wait for the 30-second cleanup or end the current room, then try again. Engineer detail: ${endpoint} returned active_session_exists/HTTP 409 during LiveKit start.`;
  }

  if (lowerMessage.includes("guest_trial_used") || message.includes("429")) {
    return `Could not start voice because the guest trial cooldown blocked the request. Engineer detail: ${endpoint} returned guest_trial_used/HTTP 429 during LiveKit start.`;
  }

  if (message.includes("401")) {
    return `Could not start voice because the token endpoint rejected auth. Engineer detail: ${endpoint} returned HTTP 401 during LiveKit start.`;
  }

  if (message.includes("403")) {
    return `Could not start voice because this origin is not allowed. Engineer detail: ${endpoint} returned HTTP 403 during LiveKit start.`;
  }

  return `Could not start voice session. Run the token probe and check browser/server logs for the exact endpoint status. Engineer detail: ${message}`;
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
  if (
    manualState === "switching" &&
    connectionState !== ConnectionState.Connected
  ) {
    return "switching";
  }
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
  onSelectPersona,
  personas,
  roomName,
  selectedPersonaId,
  setManualState,
  startRequestId,
  tokenEndpoint,
}: {
  agentName: string;
  endpointAuth: string;
  manualState: AgentSideBarState;
  onSessionEnded: () => void;
  onSelectPersona: (personaId: string) => void;
  personas: AgentSideBarPersona[];
  roomName: string;
  selectedPersonaId: string;
  setManualState: (state: AgentSideBarState) => void;
  startRequestId: number;
  tokenEndpoint: string;
}) {
  const [inputValue, setInputValue] = useState("");
  const tokenSource = useMemo(
    () =>
      TokenSource.endpoint(tokenEndpoint, {
        headers: {
          ...(endpointAuth ? { Authorization: `Bearer ${endpointAuth}` } : {}),
        },
      }),
    [endpointAuth, tokenEndpoint],
  );
  const session = useSession(tokenSource, {
    agentName,
    agentMetadata: JSON.stringify({
      persona_id: selectedPersonaId,
      session_id: roomName,
      user_id: "local-qa",
    }),
    participantName: "Local QA",
    roomName,
  });

  return (
    <SessionProvider session={session}>
      <LiveAgentSession
        agentName={agentName}
        inputValue={inputValue}
        manualState={manualState}
        onSelectPersona={onSelectPersona}
        onSessionEnded={onSessionEnded}
        personas={personas}
        selectedPersonaId={selectedPersonaId}
        session={session}
        setInputValue={setInputValue}
        setManualState={setManualState}
        startRequestId={startRequestId}
        tokenEndpoint={tokenEndpoint}
      />
      <RoomAudioRenderer />
    </SessionProvider>
  );
}

function LiveAgentSession({
  agentName,
  inputValue,
  manualState,
  onSelectPersona,
  onSessionEnded,
  personas,
  selectedPersonaId,
  session,
  setInputValue,
  setManualState,
  startRequestId,
  tokenEndpoint,
}: {
  agentName: string;
  inputValue: string;
  manualState: AgentSideBarState;
  onSelectPersona: (personaId: string) => void;
  onSessionEnded: () => void;
  personas: AgentSideBarPersona[];
  selectedPersonaId: string;
  session: ReturnType<typeof useSession>;
  setInputValue: (value: string) => void;
  setManualState: (state: AgentSideBarState) => void;
  startRequestId: number;
  tokenEndpoint: string;
}) {
  const agent = useAgent(session);
  const sessionMessages = useSessionMessages(session);
  const { microphoneToggle } = useInputControls();
  const switchPersonaTts = usePersonaSwitchRpc({
    agentIdentity: getPersonaSwitchRpcIdentity(agent),
    localParticipant: session.room.localParticipant,
    roomName: session.room.name,
    userId: "local-qa",
  });
  const [toolCallStatus, dispatchToolCallStatus] = useReducer(
    toolCallStatusReducer,
    null,
  );
  const completedSources = getCompletedSources(toolCallStatus);
  const visibleToolCallStatus = getVisibleToolCallStatus(toolCallStatus);
  const [sessionErrorMessage, setSessionErrorMessage] = useState(
    "Could not start voice session. Run the token probe and share the endpoint status with engineering.",
  );
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
  const latestUserMessageId =
    messages.filter((message) => message.role === "user").at(-1)?.id ?? null;
  const latestUserMessageIdRef = useRef<string | null>(latestUserMessageId);
  const state = stateFromSession({
    agentState: agent.state,
    connectionState: session.connectionState,
    hasInput: inputValue.trim().length > 0,
    hasMessages: messages.length > 0,
    manualState,
  });
  const endSession = () => {
    setInputValue("");
    dispatchToolCallStatus({ type: "reset" });
    setManualState("intro");
    setSessionErrorMessage(
      "Could not start voice session. Run the token probe and share the endpoint status with engineering.",
    );
    void session.end().finally(onSessionEnded);
  };
  const selectPersona = (personaId: string) => {
    if (personaId === selectedPersonaId) {
      return;
    }

    onSelectPersona(personaId);

    if (session.connectionState !== ConnectionState.Connected) {
      return;
    }

    void switchPersonaTts({ personaId }).catch((error) => {
      console.error("LiveKit persona TTS switch failed", error);
    });
  };
  const startSession = useCallback(() => {
    setSessionErrorMessage(
      "Connecting to LiveKit. If this fails, the endpoint status will be shown here.",
    );
    if (manualState !== "switching") {
      setManualState("loading");
    }
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
        setSessionErrorMessage(humanizeLiveKitStartError(error, tokenEndpoint));
        setManualState("error");
      });
  }, [manualState, session, setManualState, tokenEndpoint]);

  useEffect(() => {
    if (startRequestId <= 0 || startedRequestRef.current === startRequestId) {
      return;
    }

    startedRequestRef.current = startRequestId;
    startSession();
  }, [startRequestId, startSession]);

  useEffect(() => {
    return registerToolCallStatusRpc(session.room, dispatchToolCallStatus);
  }, [session.room, session.room.localParticipant]);

  useEffect(() => {
    if (latestUserMessageIdRef.current === latestUserMessageId) {
      return;
    }

    latestUserMessageIdRef.current = latestUserMessageId;
    dispatchToolCallStatus({ type: "reset" });
  }, [latestUserMessageId]);

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

        <ToolCallStatusPanel className="mt-4" status={visibleToolCallStatus} />

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={() => {
              startedRequestRef.current = 0;
              startSession();
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
                dispatchToolCallStatus({ type: "reset" });
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
        errorMessage={sessionErrorMessage}
        inputValue={inputValue}
        isMicrophoneEnabled={microphoneToggle.enabled}
        isSending={sessionMessages.isSending}
        latestSearchSources={completedSources}
        messages={messages}
        onChangeInput={setInputValue}
        onEnd={endSession}
        onSend={async (message) => {
          dispatchToolCallStatus({ type: "reset" });
          await sessionMessages.send(message);
          setInputValue("");
        }}
        onSelectPersona={selectPersona}
        onStart={() => {
          startSession();
        }}
        onToggleMicrophone={() => {
          void microphoneToggle.toggle(!microphoneToggle.enabled);
        }}
        state={state}
        personas={personas}
        selectedPersonaId={selectedPersonaId}
        showThinkingMessage={
          agent.state === "thinking" && messages.at(-1)?.role !== "agent"
        }
        voiceName={
          personas.find((persona) => persona.id === selectedPersonaId)
            ?.display_name ?? "Portfolio Agent"
        }
      />
    </div>
  );
}

function LiveAgentLauncher({
  manualState,
  onStart,
  onSelectPersona,
  personas,
  selectedPersonaId,
}: {
  manualState: AgentSideBarState;
  onStart: () => void;
  onSelectPersona: (personaId: string) => void;
  personas: AgentSideBarPersona[];
  selectedPersonaId: string;
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
        onSelectPersona={onSelectPersona}
        onStart={onStart}
        personas={personas}
        selectedPersonaId={selectedPersonaId}
        state="intro"
        voiceName={
          personas.find((persona) => persona.id === selectedPersonaId)
            ?.display_name ?? "Portfolio Agent"
        }
      />
    </div>
  );
}

export default function LiveKitAgentPage() {
  const [agentName, setAgentName] = useState(DEFAULT_AGENT_NAME);
  const [endpointAuth, setEndpointAuth] = useState("");
  const [manualState, setManualState] = useState<AgentSideBarState>("intro");
  const [personas, setPersonas] = useState<AgentSideBarPersona[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState("portfolio-agent");
  const [roomName, setRoomName] = useState(createLocalAgentRoomName);
  const [sessionStartRequestId, setSessionStartRequestId] = useState(0);
  const [tokenEndpoint, setTokenEndpoint] = useState(DEFAULT_TOKEN_ENDPOINT);
  const [probe, setProbe] = useState<TokenProbeState>({
    status: "idle",
    detail: "Run a token probe before starting the room.",
  });
  const [isMobilePreset, setIsMobilePreset] = useState(false);
  const resolvedTokenEndpoint = useMemo(
    () => resolveAllowedTokenEndpoint(tokenEndpoint),
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

  useEffect(() => {
    let isActive = true;

    void fetch("/api/personas")
      .then((response) => response.json() as Promise<PersonaListPayload>)
      .then((payload) => {
        if (!isActive || !payload.personas?.length) {
          return;
        }

        setPersonas(payload.personas);
        setSelectedPersonaId((current) =>
          payload.personas?.some((persona) => persona.id === current)
            ? current
            : (payload.personas?.[0]?.id ?? "portfolio-agent"),
        );
      })
      .catch((error) => {
        console.error("Could not load personas", error);
      });

    return () => {
      isActive = false;
    };
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
      if (resolvedTokenEndpoint === GUEST_TOKEN_ENDPOINT_LABEL) {
        const response = await fetchAllowedTokenEndpoint(
          resolvedTokenEndpoint,
          {
            method: "OPTIONS",
          },
        );

        if (!response.ok) {
          const payload = (await response
            .json()
            .catch(() => null)) as TokenEndpointPayload | null;

          setProbe({
            status: "error",
            statusCode: response.status,
            detail: humanizeTokenEndpointResult({
              endpoint: resolvedTokenEndpoint,
              payload,
              statusCode: response.status,
            }),
          });
          return;
        }

        setProbe({
          status: "success",
          statusCode: response.status,
          detail: humanizeTokenEndpointResult({
            endpoint: resolvedTokenEndpoint,
            payload: null,
            statusCode: response.status,
          }),
        });
        return;
      }

      const response = await fetchAllowedTokenEndpoint(resolvedTokenEndpoint, {
        body: JSON.stringify({
          dispatch_agent: false,
          persona_id: selectedPersonaId,
          participant_name: "Local QA",
          room_config: {
            agents: [{ agentName }],
          },
          room_name: roomName,
        }),
        headers: {
          "Content-Type": "application/json",
          ...(resolvedTokenEndpoint === TOKEN_ENDPOINT_LABEL && endpointAuth
            ? { Authorization: `Bearer ${endpointAuth}` }
            : {}),
        },
        method: "POST",
      });
      const payload = (await response
        .json()
        .catch(() => null)) as TokenEndpointPayload | null;

      if (!response.ok) {
        setProbe({
          status: "error",
          statusCode: response.status,
          detail: humanizeTokenEndpointResult({
            endpoint: resolvedTokenEndpoint,
            payload,
            statusCode: response.status,
          }),
        });
        return;
      }

      setProbe({
        status: "success",
        statusCode: response.status,
        detail: humanizeTokenEndpointResult({
          endpoint: resolvedTokenEndpoint,
          payload,
          statusCode: response.status,
        }),
      });
    } catch (error) {
      setProbe({
        status: "error",
        detail: `The browser could not reach the token endpoint. Check that the local server and ngrok tunnel are running, then share this with engineering. Engineer detail: ${
          error instanceof Error ? error.message : "Token probe failed."
        }`,
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
    setManualState("intro");
    setRoomName(createLocalAgentRoomName());
  };
  const resolvedPersonas =
    personas.length > 0
      ? personas
      : [
          {
            avatar_url: "/agent-sidebar/avatar-4.png",
            description: "Warm, concise portfolio voice agent",
            display_name: "Portfolio Agent",
            id: "portfolio-agent",
          },
        ];

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
              <Link href="/docs/api">
                API docs
                <ExternalLink />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <a href={STORYBOOK_URL} target="_blank" rel="noreferrer">
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
                  setRoomName(createLocalAgentRoomName());
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
                    Use /api/livekit/token, /api/livekit/guest-session, or
                    /api/livekit/missing.
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
                  placeholder="Only used by /api/livekit/token diagnostics"
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
                  href={`/livekit-agent?tokenEndpoint=${TOKEN_ERROR_ENDPOINT_LABEL}`}
                >
                  Token error path
                </a>
                <a
                  className="text-[var(--color-text-accent)] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  href={`/livekit-agent?tokenEndpoint=${GUEST_TOKEN_ENDPOINT_LABEL}`}
                >
                  Guest 30-second trial path
                </a>
                <a
                  className="text-[var(--color-text-accent)] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  href={`${STORYBOOK_URL}?path=/story/livekit-agent-session-panel--live-cloud-session`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Storybook AgentSessionPanel live story
                </a>
                <a
                  className="text-[var(--color-text-accent)] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  href={`${STORYBOOK_URL}?path=/story/dennis-design-system-agent-side-bar--live-cloud-session`}
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
                onSelectPersona={setSelectedPersonaId}
                onSessionEnded={endLiveSession}
                personas={resolvedPersonas}
                roomName={roomName}
                selectedPersonaId={selectedPersonaId}
                setManualState={setManualState}
                startRequestId={sessionStartRequestId}
                tokenEndpoint={resolvedTokenEndpoint}
              />
            ) : (
              <LiveAgentLauncher
                manualState={manualState}
                onStart={startLiveSession}
                onSelectPersona={setSelectedPersonaId}
                personas={resolvedPersonas}
                selectedPersonaId={selectedPersonaId}
              />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
