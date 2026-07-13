import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { OrbShader } from "~/components/OrbShader";

const meta = {
  title: "Dennis Design System/Orb Shader",
  component: OrbShader,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    state: {
      control: "inline-radio",
      options: ["idle", "loading", "thinking"],
    },
    size: {
      control: "number",
    },
  },
  args: {
    size: 162,
    state: "loading",
  },
} satisfies Meta<typeof OrbShader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {};

export const Thinking: Story = {
  args: {
    size: 66,
    state: "thinking",
  },
};

export const States: Story = {
  render: () => (
    <div className="flex items-end gap-token-32 bg-white p-token-24">
      <OrbShader size={162} state="loading" />
      <OrbShader size={66} state="thinking" />
      <OrbShader size={66} state="idle" />
    </div>
  ),
};
