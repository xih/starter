import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  archiveTimelinePattern,
  InteractionPatternDetail,
} from "~/components/interactions";

const meta = {
  title: "Interactions/Interaction Pattern Detail",
  component: InteractionPatternDetail,
  parameters: { layout: "fullscreen" },
  args: {
    pattern: archiveTimelinePattern,
  },
} satisfies Meta<typeof InteractionPatternDetail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
