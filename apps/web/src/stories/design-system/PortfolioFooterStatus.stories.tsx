import { PortfolioFooterStatus } from "@starter/design-system";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

const meta = {
  title: "Design System/Portfolio Footer Status",
  component: PortfolioFooterStatus,
  parameters: {
    layout: "centered",
    backgrounds: { default: "dark" },
  },
  decorators: [
    (Story) => (
      <div className="bg-black p-[24px] text-white">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PortfolioFooterStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Large: Story = {
  decorators: [
    (Story) => (
      <div className="bg-black p-[24px] text-[32px] leading-none text-white">
        <Story />
      </div>
    ),
  ],
};
