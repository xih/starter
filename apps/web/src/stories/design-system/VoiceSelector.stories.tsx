import {
  MicSelector,
  VoiceParameterPanel,
  VoiceSelector,
  VoiceSelectorPill,
} from "@starter/design-system";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

const storybookVoices = [
  {
    avatar: "/agent-sidebar/avatar-4.png",
    description: "Warm, concise portfolio voice agent",
    name: "Portfolio Agent",
  },
  {
    avatar: "/agent-sidebar/avatar-1.png",
    description: "Warm reflective confidence-focused persona",
    name: "Wife E2E",
  },
  {
    avatar: "/design-system/steve-jobs-avatar.png",
    description: "Focused product critique voice",
    name: "Steve Jobs",
  },
  {
    avatar: "/agent-sidebar/avatar-2.png",
    description: "Direct Cartesia Sonic voice",
    name: "Cartesia Voice",
  },
];
const defaultStorybookVoice = storybookVoices[0]!;

const meta = {
  title: "Design System/Voice Selector",
  component: VoiceSelector,
  parameters: { layout: "centered" },
  args: {
    state: "default",
    voice: {
      avatar: "/design-system/steve-jobs-avatar.png",
      description: "Apple founder",
      name: "Steve Jobs",
    },
  },
  argTypes: {
    state: {
      control: "inline-radio",
      options: ["default", "hovered", "selected"],
    },
  },
} satisfies Meta<typeof VoiceSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const FigmaStates: Story = {
  render: () => {
    const voice = {
      avatar: "/design-system/steve-jobs-avatar.png",
      description: "Apple founder",
      name: "Steve Jobs",
    };

    return (
      <div className="grid gap-token-48">
        <div className="flex gap-[19px]">
          <VoiceSelector state="default" voice={voice} />
          <VoiceSelector state="hovered" voice={voice} />
          <VoiceSelector state="selected" voice={voice} />
        </div>
        <div className="flex items-start gap-[30px]">
          <div className="grid gap-[11px]">
            <MicSelector state="muted" />
            <MicSelector state="listening" />
            <MicSelector state="outlined" />
          </div>
          <VoiceSelectorPill voice={{ ...voice, name: "Masa Son" }} />
          <VoiceParameterPanel voices={storybookVoices} />
        </div>
      </div>
    );
  },
};

function PromptVoiceInteractionStory() {
  const [selectedVoiceName, setSelectedVoiceName] = useState(
    defaultStorybookVoice.name,
  );

  return (
    <div className="flex items-end gap-token-16">
      <VoiceParameterPanel
        onSelectVoice={(voice) => setSelectedVoiceName(voice.name)}
        selectedVoiceName={selectedVoiceName}
        voices={storybookVoices}
      />
      <VoiceSelectorPill
        voice={storybookVoices.find(
          (voice) => voice.name === selectedVoiceName,
        )}
      />
    </div>
  );
}

export const PromptVoiceInteraction: Story = {
  render: () => <PromptVoiceInteractionStory />,
};
