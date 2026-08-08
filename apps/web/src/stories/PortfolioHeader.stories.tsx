import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { PortfolioHeader } from "~/components/PortfolioHeader";

const meta = {
  title: "Portfolio/Portfolio Header",
  component: PortfolioHeader,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    activePage: "home",
    brandLabel: "Dennis Xing",
    tone: "light",
  },
} satisfies Meta<typeof PortfolioHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const OnHero: Story = {
  render: (args) => (
    <div className="relative h-[220px] bg-[#075970]">
      <PortfolioHeader {...args} />
    </div>
  ),
};

export const OnAbout: Story = {
  args: {
    activePage: "about",
    tone: "dark",
  },
  render: (args) => (
    <div className="relative h-[220px] bg-white">
      <PortfolioHeader {...args} />
    </div>
  ),
};
