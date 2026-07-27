import { PortfolioFooter } from "@starter/design-system";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { SkeuomorphicClock } from "~/components/SkeuomorphicClock";

function StoryClock() {
  return (
    <SkeuomorphicClock
      initialTime="14:16:05"
      running
      secondHandMotion="sweep"
      showControls={false}
      size={135}
    />
  );
}

const meta = {
  title: "Design System/Portfolio Footer",
  component: PortfolioFooter,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof PortfolioFooter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Desktop: Story = {
  render: () => (
    <div className="w-[1728px]">
      <PortfolioFooter clock={<StoryClock />} />
    </div>
  ),
};

export const Mobile: Story = {
  render: () => (
    <div className="w-[375px]">
      <PortfolioFooter clock={<StoryClock />} />
    </div>
  ),
};
