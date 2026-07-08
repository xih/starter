import { AgentSideBar } from "@starter/design-system";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

const meta = {
  title: "Design System/Agent Side Bar",
  component: AgentSideBar,
  parameters: { layout: "centered" },
  argTypes: {
    state: {
      control: "inline-radio",
      options: [
        "intro",
        "loading",
        "begin",
        "agent-streaming",
        "idle",
        "user-typing",
        "error",
      ],
    },
  },
  args: {
    state: "intro",
  },
} satisfies Meta<typeof AgentSideBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Intro: Story = {};

export const Loading: Story = {
  args: { state: "loading" },
};

export const Begin: Story = {
  args: { state: "begin" },
};

export const AgentStreaming: Story = {
  args: { state: "agent-streaming" },
};

export const Idle: Story = {
  args: { state: "idle" },
};

export const UserTyping: Story = {
  args: { state: "user-typing" },
};

export const Error: Story = {
  args: { state: "error" },
};
