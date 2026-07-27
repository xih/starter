import { AskMobileExperience } from "@starter/design-system";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

const meta = {
  title: "Design System/Ask Mobile Experience",
  component: AskMobileExperience,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof AskMobileExperience>;

export default meta;
type Story = StoryObj<typeof meta>;
const longMessages = Array.from({ length: 14 }, (_, index) =>
  index % 2 === 0
    ? {
        id: `user-${index}`,
        role: "user" as const,
        text: `Message ${index + 1}: what is going on here`,
      }
    : {
        id: `system-${index}`,
        role: "system" as const,
        text: "I'm not sure what you mean by that. Can you please rephrase it so I can answer more clearly?",
      },
);

export const Initial: Story = {
  render: () => <AskMobileExperience />,
};

export const UserTyping: Story = {
  render: () => (
    <AskMobileExperience controlState="user-typing" inputValue="Bonjourno" />
  ),
};

export const Thinking: Story = {
  render: () => (
    <AskMobileExperience
      controlState="agent-streaming"
      messages={[{ id: "user-1", role: "user", text: "what's your name" }]}
      pending
    />
  ),
};

export const Finished: Story = {
  render: () => (
    <AskMobileExperience
      controlState="default"
      messages={[
        { id: "user-1", role: "user", text: "what's your name" },
        {
          id: "system-1",
          role: "system",
          text: "I'm ChatGPT - specifically GPT-5.5 Thinking.",
        },
      ]}
    />
  ),
};

export const SectionEight: Story = {
  render: () => (
    <div className="flex gap-[62px] bg-[#3f3f3f] p-[120px]">
      <AskMobileExperience />
      <AskMobileExperience controlState="user-typing" inputValue="Bonjourno" />
      <AskMobileExperience
        controlState="agent-streaming"
        messages={[{ id: "user-1", role: "user", text: "what's your name" }]}
        pending
      />
      <AskMobileExperience
        controlState="default"
        messages={[
          { id: "user-1", role: "user", text: "what's your name" },
          {
            id: "system-1",
            role: "system",
            text: "I'm ChatGPT - specifically GPT-5.5 Thinking.",
          },
        ]}
      />
    </div>
  ),
};

export const LongHistory: Story = {
  render: () => (
    <AskMobileExperience controlState="default" messages={longMessages} />
  ),
};
