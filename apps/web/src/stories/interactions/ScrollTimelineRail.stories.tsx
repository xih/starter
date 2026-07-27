import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  archiveTimelinePattern,
  ScrollTimelineRail,
} from "~/components/interactions";

const meta = {
  title: "Interactions/Scroll Timeline Rail",
  component: ScrollTimelineRail,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="relative h-screen bg-white">
        <Story />
      </div>
    ),
  ],
  args: {
    activeSectionId: "era-one",
    forceVisible: true,
    indicatorBlue: archiveTimelinePattern.timingDefaults.indicatorBlue,
    labelActiveScale: archiveTimelinePattern.timingDefaults.labelActiveScale,
    labelPressedScale: archiveTimelinePattern.timingDefaults.labelPressedScale,
    phase: "idle",
    progress: 0.45,
    sections: archiveTimelinePattern.sections,
  },
} satisfies Meta<typeof ScrollTimelineRail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Progress0: Story = {
  args: { activeSectionId: "intro", progress: 0 },
};

export const Progress45: Story = {};

export const Progress100: Story = {
  args: { activeSectionId: "credits", progress: 1 },
};

export const Traveling: Story = {
  args: { activeSectionId: "era-two", phase: "traveling", progress: 0.58 },
};
