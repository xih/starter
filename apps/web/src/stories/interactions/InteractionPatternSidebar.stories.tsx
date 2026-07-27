import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  archiveTimelinePattern,
  InteractionPatternSidebar,
} from "~/components/interactions";

const meta = {
  title: "Interactions/Interaction Pattern Sidebar",
  component: InteractionPatternSidebar,
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
    activeSlug: archiveTimelinePattern.slug,
    patterns: [archiveTimelinePattern],
  },
} satisfies Meta<typeof InteractionPatternSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const EmptySearchSurface: Story = {
  args: {
    patterns: [],
  },
};
