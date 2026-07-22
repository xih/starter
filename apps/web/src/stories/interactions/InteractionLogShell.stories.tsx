import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  archiveTimelinePattern,
  InteractionLogShell,
} from "~/components/interactions";

const meta = {
  title: "Interactions/Interaction Log Shell",
  component: InteractionLogShell,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/interactions/steve-jobs-archive-scroll-timeline",
      },
    },
  },
  args: {
    activePattern: archiveTimelinePattern,
    patterns: [archiveTimelinePattern],
  },
} satisfies Meta<typeof InteractionLogShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DefaultIndexedLog: Story = {};
