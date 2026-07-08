import { ChatConversation, ChatMessage } from "@starter/design-system";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

const meta = {
  title: "Design System/Chat Message",
  component: ChatMessage,
  parameters: { layout: "centered" },
  args: {
    message: {
      id: "user",
      role: "user",
      text: "what's your name",
    },
  },
} satisfies Meta<typeof ChatMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const User: Story = {};

export const System: Story = {
  args: {
    message: {
      id: "system",
      role: "system",
      text: "I'm ChatGPT - specifically GPT-5.5 Thinking.",
    },
  },
};

export const Conversation: Story = {
  render: () => <ChatConversation />,
};
