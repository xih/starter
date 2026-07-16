"use client";

import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import {
  fallbackPersonaVoiceOptions,
  PersonaVoiceSwitcher,
} from "~/components/PersonaVoiceSwitcher";

const meta = {
  title: "Voice Personas/Persona Voice Switcher",
  component: PersonaVoiceSwitcher,
  parameters: { layout: "centered" },
} satisfies Meta<typeof PersonaVoiceSwitcher>;

export default meta;
type Story = StoryObj<typeof meta>;

function StatefulSwitcher() {
  const [selectedPersonaId, setSelectedPersonaId] = useState("wife-e2e");

  return (
    <div className="w-[340px] bg-[var(--color-background-secondary)] p-6">
      <PersonaVoiceSwitcher
        onSelectPersona={setSelectedPersonaId}
        personas={fallbackPersonaVoiceOptions}
        selectedPersonaId={selectedPersonaId}
      />
      <p className="mt-4 text-sm text-[var(--color-text-secondary)]">
        Selected persona id:{" "}
        <span className="font-semibold text-[var(--color-text-primary)]">
          {selectedPersonaId}
        </span>
      </p>
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
