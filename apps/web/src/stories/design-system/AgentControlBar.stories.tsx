import { AgentControlBar, agentControlBarLayout } from "@starter/design-system";
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

export const MobileLayoutTokens: Story = {
  render: () => (
    <div className="flex w-[var(--ds-agent-control-bar-width)] max-w-full flex-col gap-token-16 rounded-token-m border border-[var(--color-border-opaque)] bg-[var(--color-background-primary)] p-token-16 font-body text-[length:var(--font-font-size-subtext)] leading-[var(--font-line-height-lh-subtext)] text-[var(--color-text-primary)]">
      <AgentControlBar state="agent-streaming" />
      <dl className="grid grid-cols-[1fr_auto] gap-x-token-16 gap-y-token-8">
        <dt>Control bar height</dt>
        <dd>var(--ds-agent-control-bar-height)</dd>
        <dt>Control bar width</dt>
        <dd>var(--ds-agent-control-bar-width)</dd>
        <dt>Voice panel height</dt>
        <dd>var(--ds-agent-control-voice-panel-height)</dd>
        <dt>Open stack height</dt>
        <dd>var(--ds-agent-control-mobile-open-stack-height)</dd>
        <dt>Orb gap</dt>
        <dd>var(--ds-agent-mobile-orb-gap)</dd>
        <dt>Default orb size</dt>
        <dd>{agentControlBarLayout.mobileOrbSize}</dd>
        <dt>Connecting orb size</dt>
        <dd>{agentControlBarLayout.mobileConnectingOrbSize}</dd>
      </dl>
    </div>
  ),
};
