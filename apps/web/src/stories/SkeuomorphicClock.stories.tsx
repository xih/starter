import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { SkeuomorphicClock } from "~/components/SkeuomorphicClock";

const meta = {
  title: "Dennis Design System/Skeuomorphic Clock",
  component: SkeuomorphicClock,
  decorators: [
    (Story) => (
      <div className="grid min-h-screen place-items-center bg-white p-10">
        <Story />
      </div>
    ),
  ],
  parameters: {
    backgrounds: {
      default: "white",
    },
    layout: "fullscreen",
  },
  argTypes: {
    initialTime: {
      control: "text",
      description: "Initial time in HH:MM:SS format.",
    },
    running: {
      control: "boolean",
    },
    secondHandMotion: {
      control: "inline-radio",
      options: ["tick", "sweep"],
    },
    showControls: {
      control: "boolean",
    },
    size: {
      control: { type: "range", min: 160, max: 320, step: 1 },
    },
  },
  args: {
    initialTime: "08:50:30",
    running: true,
    secondHandMotion: "tick",
    showControls: true,
    size: 216,
  },
} satisfies Meta<typeof SkeuomorphicClock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Ticking: Story = {
  args: {
    secondHandMotion: "tick",
  },
};

export const Sweeping: Story = {
  args: {
    secondHandMotion: "sweep",
  },
};

export const ClockOnly: Story = {
  args: {
    showControls: false,
  },
};
