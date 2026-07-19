import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  ArchiveScrollTimelineDemo,
  archiveTimelinePattern,
} from "~/components/interactions";

const meta = {
  title: "Interactions/Archive Scroll Timeline Demo",
  component: ArchiveScrollTimelineDemo,
  parameters: { layout: "fullscreen" },
  args: {
    pattern: archiveTimelinePattern,
    showDialKit: false,
  },
} satisfies Meta<typeof ArchiveScrollTimelineDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const HoverVisibleRail: Story = {
  args: {
    forcedHover: true,
    forcedProgress: 0.45,
  },
};

export const ZoomedOutTraveling: Story = {
  args: {
    forcedPhase: "traveling",
    forcedProgress: 0.58,
  },
};

export const ReducedMotion: Story = {
  args: {
    reducedMotionOverride: true,
  },
};
