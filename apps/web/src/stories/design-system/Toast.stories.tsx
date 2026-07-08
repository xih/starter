import { Toast } from "@starter/design-system";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

const meta = {
  title: "Design System/Toast",
  component: Toast,
  parameters: { layout: "centered" },
  argTypes: {
    state: {
      control: "inline-radio",
      options: ["neutral", "error", "success"],
    },
  },
  args: {
    children: "Toast Message",
    state: "neutral",
  },
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = {};

export const Error: Story = {
  args: { state: "error" },
};

export const Success: Story = {
  args: { state: "success" },
};

export const FigmaStates: Story = {
  render: () => (
    <div className="grid gap-[22px]">
      <Toast state="neutral" />
      <Toast state="error" />
      <Toast state="success" />
    </div>
  ),
};
