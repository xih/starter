"use client";

import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import {
  fallbackPersonaVoiceOptions,
  PersonaVoiceSwitcher,
} from "~/components/PersonaVoiceSwitcher";
import {
  usePersonaSwitchRpc,
  type PersonaSwitchRpcCall,
  type PersonaSwitchRpcParticipant,
} from "~/components/persona-switch-rpc";

const meta = {
  title: "Voice Personas/Persona Voice Switcher",
  component: PersonaVoiceSwitcher,
  parameters: { layout: "centered" },
} satisfies Meta<typeof PersonaVoiceSwitcher>;

export default meta;
type Story = StoryObj<typeof meta>;

function StatefulSwitcher() {
  const [lastRpcCall, setLastRpcCall] = useState<PersonaSwitchRpcCall | null>(
    null,
  );
  const [selectedPersonaId, setSelectedPersonaId] = useState("wife-e2e");
  const participant: PersonaSwitchRpcParticipant = {
    performRpc: async (call) => {
      setLastRpcCall(call);
      return JSON.stringify({
        ok: true,
        persona_id: JSON.parse(call.payload).persona_id,
        tts_model: "cartesia/sonic-3.5",
        tts_voice_id: "storybook-cartesia-voice-id",
      });
    },
  };
  const switchPersona = usePersonaSwitchRpc({
    agentIdentity: "agent-storybook",
    localParticipant: participant,
    roomName: "storybook-room",
    userId: "storybook-user",
  });

  return (
    <div className="w-[340px] bg-[var(--color-background-secondary)] p-6">
      <PersonaVoiceSwitcher
        onSelectPersona={(personaId) => {
          void switchPersona({
            personaId,
            voice: true,
          }).then(() => setSelectedPersonaId(personaId));
        }}
        personas={fallbackPersonaVoiceOptions}
        selectedPersonaId={selectedPersonaId}
      />
      <p className="mt-4 text-sm text-[var(--color-text-secondary)]">
        Selected persona id:{" "}
        <span className="font-semibold text-[var(--color-text-primary)]">
          {selectedPersonaId}
        </span>
      </p>
      {lastRpcCall ? (
        <pre className="mt-4 max-h-[180px] overflow-auto rounded-[8px] bg-white p-3 text-xs text-[var(--color-text-secondary)]">
          {JSON.stringify(
            {
              ...lastRpcCall,
              payload: JSON.parse(lastRpcCall.payload),
            },
            null,
            2,
          )}
        </pre>
      ) : null}
    </div>
  );
}

export const WifeE2ESelected: Story = {
  args: {
    onSelectPersona: () => undefined,
  },
  render: () => <StatefulSwitcher />,
};

export const PortfolioSelected: Story = {
  args: {
    onSelectPersona: () => undefined,
    personas: fallbackPersonaVoiceOptions,
    selectedPersonaId: "portfolio-agent",
  },
};
