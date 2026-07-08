import {
  MicSelector,
  VoiceParameterPanel,
  VoiceSelector,
  VoiceSelectorPill,
} from "@starter/design-system";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

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
      <div className="grid gap-[48px]">
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
          <VoiceParameterPanel />
        </div>
      </div>
    );
  },
};
