import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { MobilePortfolioVoiceSession } from "~/app/testing/mobile-portfolio-voice-session";
import {
  fallbackPersonaVoiceOptions,
  type PersonaVoiceOption,
} from "~/components/PersonaVoiceSwitcher";

const meta = {
  title: "Voice Agent/Mobile Portfolio Voice Session",
  component: MobilePortfolioVoiceSession,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof MobilePortfolioVoiceSession>;

export default meta;
type Story = StoryObj<Record<string, never>>;

function personaToVoice(persona: PersonaVoiceOption | undefined) {
  return {
    avatar: persona?.avatar_url,
    description: persona?.description,
    id: persona?.id,
    name: persona?.display_name ?? "Portfolio Agent",
  };
}

function MobilePortfolioVoiceSessionStory() {
  const [selectedPersonaId, setSelectedPersonaId] = useState("portfolio-agent");
  const selectedPersona =
    fallbackPersonaVoiceOptions.find(
      (persona) => persona.id === selectedPersonaId,
    ) ?? fallbackPersonaVoiceOptions[0];

  return (
    <div className="h-svh bg-white">
      <MobilePortfolioVoiceSession
        chatMessages={[
          {
            id: "agent-1",
            role: "system",
            text: "Hello! How can I help you today?",
          },
          {
            id: "user-1",
            role: "user",
            text: "How's your day going?",
          },
          {
            id: "agent-2",
            role: "system",
            text: "Ready to help. Pick any voice and the selector updates immediately.",
          },
        ]}
        controlState="default"
        isMicrophoneEnabled
        onSelectVoice={(voice) => {
          if (voice.id) {
            setSelectedPersonaId(voice.id);
          }
        }}
        voice={personaToVoice(selectedPersona)}
        voiceOptions={fallbackPersonaVoiceOptions.map(personaToVoice)}
      />
    </div>
  );
}

export const InstantVoiceSelection: Story = {
  render: () => <MobilePortfolioVoiceSessionStory />,
};
