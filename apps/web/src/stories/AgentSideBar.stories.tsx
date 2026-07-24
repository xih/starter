"use client";

import {
  RoomAudioRenderer,
  SessionProvider,
  useAgent,
  useSession,
  useSessionMessages,
} from "@livekit/components-react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ConnectionState, TokenSource } from "livekit-client";
import { useMemo, useState } from "react";

import {
  AgentSideBar,
  ChatMessage,
  MicSelector,
  VoiceSelector,
  type AgentSideBarMessage,
  type AgentSideBarProps,
  type AgentSideBarState,
} from "~/components/AgentSideBar";
import { useInputControls } from "~/hooks/agents-ui/use-agent-control-bar";

type LiveStoryArgs = AgentSideBarProps & {
  agentName: string;
  tokenEndpoint: string;
};

const scenarioMessages: AgentSideBarMessage[] = [
  {
    id: "agent-1",
    role: "agent",
    text: "Hi. I am listening. Ask me anything.",
  },
  {
    id: "user-1",
    role: "user",
    text: "Can you help me review the portfolio voice flow?",
  },
  {
    id: "agent-2",
    role: "agent",
    text: "Yes. I will keep the response concise and spoken-friendly.",
  },
];

function StorySurface({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-start justify-center bg-[var(--color-bg-app)] p-token-24">
      {children}
    </div>
  );
}

function MobileSurface({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-bg-app)]">
      <div className="mx-auto flex min-h-screen max-w-[428px] items-stretch justify-center">
        {children}
      </div>
    </div>
  );
}

function StatefulMockStory(args: AgentSideBarProps) {
  const [inputValue, setInputValue] = useState(args.inputValue ?? "");
  const [isMicrophoneEnabled, setIsMicrophoneEnabled] = useState(
    args.isMicrophoneEnabled ?? true,
  );
  const [messages, setMessages] = useState(args.messages ?? []);
  const [state, setState] = useState(args.state ?? "intro");

  return (
    <StorySurface>
      <AgentSideBar
        {...args}
        inputValue={inputValue}
        isMicrophoneEnabled={isMicrophoneEnabled}
        messages={messages}
        onChangeInput={(value) => {
          setInputValue(value);
          if (value.trim().length > 0) {
            setState("user-typing");
          } else if (state === "user-typing") {
            setState(args.state ?? "idle");
          }
        }}
        onEnd={() => {
          setInputValue("");
          setMessages(args.messages ?? []);
          setState("intro");
        }}
        onSend={(message) => {
          setMessages((currentMessages) => [
            ...currentMessages,
            {
              id: `user-${Date.now()}`,
              role: "user",
              text: message,
            },
          ]);
          setInputValue("");
          setState("idle");
        }}
        onStart={() => setState("begin")}
        onStopResponse={() => setState("idle")}
        onToggleMicrophone={() => setIsMicrophoneEnabled((enabled) => !enabled)}
        state={state}
      />
    </StorySurface>
  );
}

function messageText(message: { message?: unknown; text?: unknown }) {
  const value = message.message ?? message.text;
  return typeof value === "string" ? value : "";
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

function stateFromAgent({
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
  if (hasInput) return "user-typing";
  if (manualState === "error") return "error";
  if (
    manualState === "intro" &&
    connectionState === ConnectionState.Disconnected
  ) {
    return "intro";
  }
  if (connectionState === ConnectionState.Connecting) {
    return "loading";
  }
  if (agentState === "speaking" || agentState === "thinking") {
    return "agent-streaming";
  }
  if (connectionState === ConnectionState.Connected && !hasMessages) {
    return "begin";
  }
  if (connectionState === ConnectionState.Connected) {
    return "idle";
  }

  return manualState;
}

function LiveAgentSideBar({
  args,
  session,
  setManualState,
}: {
  args: LiveStoryArgs;
  session: ReturnType<typeof useSession>;
  setManualState: (state: AgentSideBarState) => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const agent = useAgent(session);
  const sessionMessages = useSessionMessages(session);
  const { microphoneToggle } = useInputControls();
  const messages = sessionMessages.messages
    .map((message, index) =>
      toAgentSideBarMessage(
        message,
        session.room.localParticipant.identity,
        index,
      ),
    )
    .filter((message) => message.text.length > 0);
  const state = stateFromAgent({
    agentState: agent.state,
    connectionState: session.connectionState,
    hasInput: inputValue.trim().length > 0,
    hasMessages: messages.length > 0,
    manualState: args.state ?? "intro",
  });

  return (
    <AgentSideBar
      {...args}
      inputValue={inputValue}
      isMicrophoneEnabled={microphoneToggle.enabled}
      isSending={sessionMessages.isSending}
      messages={messages}
      onChangeInput={setInputValue}
      onEnd={() => {
        setInputValue("");
        setManualState("intro");
        void session.end();
      }}
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
      onStopResponse={args.onStopResponse}
      onToggleMicrophone={() => {
        void microphoneToggle.toggle(!microphoneToggle.enabled);
      }}
      state={state}
    />
  );
}

function LiveCloudSessionStory(args: LiveStoryArgs) {
  const [manualState, setManualState] = useState<AgentSideBarState>("intro");
  const roomName = useMemo(() => `storybook_agent_${crypto.randomUUID()}`, []);
  const tokenSource = useMemo(
    () => TokenSource.endpoint(args.tokenEndpoint),
    [args.tokenEndpoint],
  );
  const session = useSession(tokenSource, {
    agentName: args.agentName,
    participantName: "Storybook Guest",
    roomName,
  });

  if (!args.agentName || !args.tokenEndpoint) {
    return (
      <StorySurface>
        <AgentSideBar
          {...args}
          errorMessage="Live story needs NEXT_PUBLIC_LIVEKIT_AGENT_NAME and NEXT_PUBLIC_LIVEKIT_TOKEN_ENDPOINT."
          state="error"
        />
      </StorySurface>
    );
  }

  return (
    <StorySurface>
      <SessionProvider session={session}>
        <LiveAgentSideBar
          args={{ ...args, state: manualState }}
          session={session}
          setManualState={setManualState}
        />
        <RoomAudioRenderer />
      </SessionProvider>
    </StorySurface>
  );
}

const meta = {
  title: "Dennis Design System/Agent Side Bar",
  component: AgentSideBar,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Dennis Design System Agent Side Bar from Figma node 118:702. Mock stories cover all visual states. LiveCloudSession uses the existing LiveKit token endpoint, useAgent state, useSessionMessages chat, and microphone media controls.",
      },
    },
  },
  argTypes: {
    state: {
      control: "select",
      options: [
        "intro",
        "loading",
        "begin",
        "agent-streaming",
        "idle",
        "user-typing",
        "error",
      ],
    },
  },
  args: {
    agentName:
      process.env.NEXT_PUBLIC_LIVEKIT_AGENT_NAME ?? "dennis-portfolio-agent",
    inputValue: "",
    isMicrophoneEnabled: true,
    messages: scenarioMessages,
    state: "intro",
    tokenEndpoint:
      process.env.NEXT_PUBLIC_LIVEKIT_TOKEN_ENDPOINT ??
      "http://localhost:3000/api/livekit/token",
    voiceName: "Masa Son",
  },
} satisfies Meta<LiveStoryArgs>;

export default meta;

type Story = StoryObj<LiveStoryArgs>;

export const Intro: Story = {
  args: { messages: [], state: "intro" },
  render: (args) => <StatefulMockStory {...args} />,
};

export const Loading: Story = {
  args: { messages: [], state: "loading" },
  render: (args) => (
    <StorySurface>
      <AgentSideBar {...args} />
    </StorySurface>
  ),
};

export const Begin: Story = {
  args: { messages: [], state: "begin" },
  render: (args) => <StatefulMockStory {...args} />,
};

export const AgentStreaming: Story = {
  args: { state: "agent-streaming" },
  render: (args) => <StatefulMockStory {...args} />,
};

export const PendingReply: Story = {
  args: {
    messages: scenarioMessages,
    showThinkingMessage: true,
    state: "agent-streaming",
  },
  render: (args) => (
    <StorySurface>
      <AgentSideBar {...args} />
    </StorySurface>
  ),
};

export const Idle: Story = {
  args: { state: "idle" },
  render: (args) => <StatefulMockStory {...args} />,
};

export const UserTyping: Story = {
  args: {
    inputValue: "Bonjourno",
    state: "user-typing",
  },
  render: (args) => <StatefulMockStory {...args} />,
};

export const Error: Story = {
  args: {
    errorMessage:
      "LiveKit agent dispatch failed. Check the agent name and project.",
    state: "error",
  },
  render: (args) => <StatefulMockStory {...args} />,
};

export const MobileIntro: Story = {
  args: {
    messages: [],
    state: "intro",
  },
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
  },
  render: (args) => (
    <MobileSurface>
      <AgentSideBar {...args} className="h-[100dvh] w-full border-l-0" />
    </MobileSurface>
  ),
};

export const LiveCloudSession: Story = {
  args: {
    agentName:
      process.env.NEXT_PUBLIC_LIVEKIT_AGENT_NAME ?? "dennis-portfolio-agent",
    tokenEndpoint:
      process.env.NEXT_PUBLIC_LIVEKIT_TOKEN_ENDPOINT ??
      "http://localhost:3000/api/livekit/token",
  },
  render: (args) => <LiveCloudSessionStory {...args} />,
};

export const MicSelectorStates: StoryObj = {
  render: () => (
    <StorySurface>
      <div className="flex items-center gap-token-16 rounded-token-m bg-[var(--color-background-primary)] p-token-24">
        <MicSelector enabled />
        <MicSelector enabled={false} />
      </div>
    </StorySurface>
  ),
};

export const VoiceSelectorPanel: StoryObj = {
  render: () => (
    <StorySurface>
      <div className="rounded-token-m bg-[var(--color-background-primary)] p-token-24">
        <VoiceSelector
          avatar="/agent-sidebar/avatar-1.png"
          isOpen
          voiceName="Masa Son"
        />
      </div>
    </StorySurface>
  ),
};

export const ChatMessages: StoryObj = {
  render: () => (
    <StorySurface>
      <div className="w-[477px] rounded-token-m bg-[var(--color-background-primary)] p-token-24">
        <ChatMessage
          message={{
            id: "system",
            role: "agent",
            text: "I am listening. Ask me anything.",
          }}
        />
        <ChatMessage
          message={{
            id: "user",
            role: "user",
            text: "Can you help me review the portfolio voice flow?",
          }}
        />
      </div>
    </StorySurface>
  ),
};
