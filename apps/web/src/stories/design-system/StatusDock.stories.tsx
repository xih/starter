import { StatusDock } from "@starter/design-system";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

const meta = {
  title: "Design System/Status Dock",
  component: StatusDock,
  parameters: { layout: "centered" },
  argTypes: {
    viewport: { control: "inline-radio", options: ["mobile", "desktop"] },
  },
  args: {
    viewport: "mobile",
  },
} satisfies Meta<typeof StatusDock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Mobile: Story = {};

export const Desktop: Story = {
  args: { viewport: "desktop" },
};

export const FigmaStates: Story = {
  render: () => (
    <div className="grid gap-[50px]">
      <StatusDock viewport="mobile" />
      <StatusDock viewport="desktop" />
    </div>
  ),
};
