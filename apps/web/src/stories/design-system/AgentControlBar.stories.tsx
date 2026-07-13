import { AgentControlBar } from "@starter/design-system";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

const meta = {
  title: "Design System/Agent Control Bar",
  component: AgentControlBar,
  parameters: { layout: "centered" },
  argTypes: {
    state: {
      control: "inline-radio",
      options: ["pre-connected", "default", "user-typing", "agent-streaming"],
    },
  },
  args: {
    state: "default",
  },
} satisfies Meta<typeof AgentControlBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const PreConnected: Story = {
  args: { state: "pre-connected" },
};

export const UserTyping: Story = {
  args: { state: "user-typing" },
};

export const AgentStreaming: Story = {
  args: { state: "agent-streaming" },
};

export const FigmaStates: Story = {
  render: () => (
    <div className="grid gap-[72px]">
      <AgentControlBar state="pre-connected" />
      <AgentControlBar state="default" />
      <AgentControlBar state="user-typing" />
      <AgentControlBar state="agent-streaming" />
    </div>
  ),
};
