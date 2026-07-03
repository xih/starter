"use client";

import {
  RoomAudioRenderer,
  SessionProvider,
  useSession,
} from "@livekit/components-react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TokenSource } from "livekit-client";
import { useMemo, useState } from "react";

import {
  AgentSessionPanel,
  type AgentSessionPanelProps,
  type AgentSessionPanelState,
} from "~/components/AgentSessionPanel";

type LiveStoryArgs = AgentSessionPanelProps & {
  agentName: string;
  tokenEndpoint: string;
};

const scenarioMessages = [
  {
    id: "1",
    speaker: "agent" as const,
    text: "Hi, I am listening. Ask me anything.",
    time: "5:58 PM",
  },
  {
    id: "2",
    speaker: "user" as const,
    text: "Can you summarize the plan for today?",
    time: "5:59 PM",
  },
  {
    id: "3",
    speaker: "agent" as const,
    text: "Yes. I will keep the response concise and spoken-friendly.",
    time: "5:59 PM",
  },
];

function StorySurface({
  children,
  maxWidth = 1180,
}: {
  children: React.ReactNode;
  maxWidth?: number;
}) {
  return (
    <div className="min-h-screen bg-[#f4f4f5] p-nell-24">
      <div className="mx-auto" style={{ maxWidth }}>
        {children}
      </div>
    </div>
  );
}

function LiveCloudSessionStory(args: LiveStoryArgs) {
  const [manualState, setManualState] =
    useState<AgentSessionPanelState>("preconnect");
  const [mediaState, setMediaState] = useState({
    camera: false,
    microphone: false,
    screenShare: false,
  });
  const tokenSource = useMemo(
    () => TokenSource.endpoint(args.tokenEndpoint),
    [args.tokenEndpoint],
  );
  const roomName = useMemo(() => `storybook_agent_${crypto.randomUUID()}`, []);
  const session = useSession(tokenSource, {
    agentName: args.agentName,
    participantName: "Storybook Guest",
    roomName,
  });

  if (!args.agentName || !args.tokenEndpoint) {
    return (
      <StorySurface>
        <AgentSessionPanel
          {...args}
          messages={[]}
          preConnectMessage="Live story needs NEXT_PUBLIC_LIVEKIT_AGENT_NAME and NEXT_PUBLIC_LIVEKIT_TOKEN_ENDPOINT."
          state="error"
        />
      </StorySurface>
    );
  }

  const state: AgentSessionPanelState = session.isConnected
    ? "connected"
    : manualState;
  const syncMediaState = () => {
    const participant = session.room.localParticipant;
    setMediaState({
      camera: participant.isCameraEnabled,
      microphone: participant.isMicrophoneEnabled,
      screenShare: participant.isScreenShareEnabled,
    });
  };
  const toggleMicrophone = async () => {
    const participant = session.room.localParticipant;
    await participant.setMicrophoneEnabled(!participant.isMicrophoneEnabled);
    syncMediaState();
  };
  const toggleCamera = async () => {
    const participant = session.room.localParticipant;
    await participant.setCameraEnabled(!participant.isCameraEnabled);
    syncMediaState();
  };
  const toggleScreenShare = async () => {
    const participant = session.room.localParticipant;
    await participant.setScreenShareEnabled(!participant.isScreenShareEnabled);
    syncMediaState();
  };

  return (
    <StorySurface>
      <SessionProvider session={session}>
        <AgentSessionPanel
          {...args}
          isCameraEnabled={mediaState.camera}
          isLive
          isMicrophoneEnabled={mediaState.microphone}
          isScreenShareEnabled={mediaState.screenShare}
          onConnect={() => {
            setManualState("connecting");
            void session
              .start({
                tracks: {
                  microphone: { enabled: true },
                  camera: { enabled: false },
                  screenShare: { enabled: false },
                },
              })
              .then(syncMediaState)
              .catch(() => setManualState("error"));
          }}
          onDisconnect={() => {
            setManualState("ended");
            setMediaState({
              camera: false,
              microphone: false,
              screenShare: false,
            });
            void session.end();
          }}
          onToggleCamera={() => {
            void toggleCamera().catch(() => setManualState("error"));
          }}
          onToggleMicrophone={() => {
            void toggleMicrophone().catch(() => setManualState("error"));
          }}
          onToggleScreenShare={() => {
            void toggleScreenShare().catch(() => setManualState("error"));
          }}
          state={state}
        />
        <RoomAudioRenderer />
      </SessionProvider>
    </StorySurface>
  );
}

const meta = {
  title: "LiveKit/Agent Session Panel",
  component: AgentSessionPanel,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Storybook implementation spec for LiveKit Agent Session View 01. Mock stories are deterministic. The live story is guarded by LiveKit Cloud env vars and uses the local /api/livekit/token endpoint contract.",
      },
    },
  },
  argTypes: {
    state: {
      control: "select",
      options: [
        "preconnect",
        "connecting",
        "listening",
        "user-speaking",
        "thinking",
        "agent-speaking",
        "connected",
        "error",
        "ended",
      ],
    },
  },
  args: {
    agentName: "my-agent",
    preConnectMessage: "Agent is listening, ask it a question",
    supportsChatInput: true,
    supportsScreenShare: true,
    supportsVideoInput: true,
    themeMode: "dark",
  },
} satisfies Meta<typeof AgentSessionPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PreConnect: Story = {
  args: {
    messages: [],
    state: "preconnect",
    variant: "desktop",
  },
  render: (args) => (
    <StorySurface maxWidth={440}>
      <AgentSessionPanel {...args} />
    </StorySurface>
  ),
};

export const Listening: Story = {
  args: {
    messages: scenarioMessages,
    state: "listening",
    variant: "desktop",
  },
  render: (args) => (
    <StorySurface maxWidth={440}>
      <AgentSessionPanel {...args} />
    </StorySurface>
  ),
};

export const UserSpeaking: Story = {
  args: {
    messages: scenarioMessages,
    state: "user-speaking",
    variant: "desktop",
  },
  render: (args) => (
    <StorySurface maxWidth={440}>
      <AgentSessionPanel {...args} />
    </StorySurface>
  ),
};

export const AgentThinking: Story = {
  args: {
    messages: scenarioMessages,
    state: "thinking",
    variant: "desktop",
  },
  render: (args) => (
    <StorySurface maxWidth={440}>
      <AgentSessionPanel {...args} />
    </StorySurface>
  ),
};

export const AgentSpeaking: Story = {
  args: {
    messages: scenarioMessages,
    state: "agent-speaking",
    variant: "desktop",
  },
  render: (args) => (
    <StorySurface maxWidth={440}>
      <AgentSessionPanel {...args} />
    </StorySurface>
  ),
};

export const ChatOnly: Story = {
  args: {
    messages: scenarioMessages,
    state: "connected",
    supportsScreenShare: false,
    supportsVideoInput: false,
    variant: "desktop",
  },
  render: (args) => (
    <StorySurface maxWidth={440}>
      <AgentSessionPanel {...args} />
    </StorySurface>
  ),
};

export const VoiceOnly: Story = {
  args: {
    messages: scenarioMessages,
    state: "connected",
    supportsChatInput: false,
    supportsScreenShare: false,
    supportsVideoInput: false,
    variant: "desktop",
  },
  render: (args) => (
    <StorySurface maxWidth={440}>
      <AgentSessionPanel {...args} />
    </StorySurface>
  ),
};

export const ErrorState: Story = {
  args: {
    messages: [],
    preConnectMessage: "Could not connect to the LiveKit session.",
    state: "error",
    variant: "desktop",
  },
  render: (args) => (
    <StorySurface maxWidth={440}>
      <AgentSessionPanel {...args} />
    </StorySurface>
  ),
};

export const Mobile: Story = {
  args: {
    messages: scenarioMessages,
    state: "listening",
    variant: "mobile",
  },
  render: (args) => (
    <StorySurface maxWidth={402}>
      <AgentSessionPanel {...args} />
    </StorySurface>
  ),
};

export const Desktop: Story = {
  args: {
    messages: scenarioMessages,
    state: "connected",
    variant: "desktop",
  },
  render: (args) => (
    <StorySurface maxWidth={440}>
      <AgentSessionPanel {...args} />
    </StorySurface>
  ),
};

export const LiveCloudSession: StoryObj<LiveStoryArgs> = {
  args: {
    agentName:
      process.env.NEXT_PUBLIC_LIVEKIT_AGENT_NAME ?? "dennis-portfolio-agent",
    preConnectMessage: "Agent is listening, ask it a question",
    supportsChatInput: true,
    supportsScreenShare: true,
    supportsVideoInput: true,
    themeMode: "dark",
    tokenEndpoint:
      process.env.NEXT_PUBLIC_LIVEKIT_TOKEN_ENDPOINT ??
      "http://localhost:3000/api/livekit/token",
    variant: "desktop",
  },
  render: (args) => <LiveCloudSessionStory {...args} />,
};
