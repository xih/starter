import {
  DESIGN_TWITTER_LIVE_CHAT_MESSAGES,
  LiveChat,
} from "@starter/design-system";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { type DialConfig, DialRoot, useDialKit } from "dialkit";

const LIVE_CHAT_CONTROLS = {
  variant: {
    type: "select",
    default: "desktop",
    options: [
      { value: "desktop", label: "Desktop" },
      { value: "mobile", label: "Mobile" },
    ],
  },
  streamIntervalMs: [640, 120, 5000, 40],
  desktopVisibleDurationMs: [3600, 400, 12000, 100],
  desktopFadeDurationMs: [600, 80, 5000, 40],
  mobileVisibleDurationMs: [2600, 400, 12000, 100],
  mobileFadeDurationMs: [560, 80, 5000, 40],
  previewHeight: [520, 92, 720, 4],
  maxVisibleMessages: [7, 1, 12, 1],
  initialMessageCount: [7, 0, 12, 1],
  isPaused: false,
} satisfies DialConfig;

function LiveChatTuner() {
  const controls = useDialKit("Live Chat", LIVE_CHAT_CONTROLS, {
    persist: {
      key: "live-chat-storybook",
      storage: "localStorage",
      presets: true,
    },
    shortcuts: {
      streamIntervalMs: { key: "s", mode: "coarse" },
      desktopVisibleDurationMs: { key: "v", mode: "coarse" },
      desktopFadeDurationMs: { key: "f", mode: "coarse" },
      maxVisibleMessages: { key: "m", mode: "coarse" },
    },
  });
  const isMobile = controls.variant === "mobile";
  const visibleDurationMs = isMobile
    ? controls.mobileVisibleDurationMs
    : controls.desktopVisibleDurationMs;
  const fadeDurationMs = isMobile
    ? controls.mobileFadeDurationMs
    : controls.desktopFadeDurationMs;

  return (
    <div className="relative flex min-h-[620px] w-full items-center justify-center bg-[linear-gradient(130deg,#1d9df1_0%,#7d92ef_34%,#d790d2_55%,#006079_100%)] p-token-32 font-body">
      <aside className="fixed right-token-16 top-token-16 z-50 h-[348px] w-[280px] overflow-hidden">
        <DialRoot defaultOpen mode="inline" theme="dark" productionEnabled />
      </aside>
      <div
        className={
          isMobile
            ? "w-[332px] rounded-token-xxs"
            : "w-[640px] rounded-token-xxs"
        }
      >
        <LiveChat
          className="max-w-none"
          fadeDurationMs={fadeDurationMs}
          height={controls.previewHeight}
          initialMessageCount={controls.initialMessageCount}
          isPaused={controls.isPaused}
          maxVisibleMessages={controls.maxVisibleMessages}
          messages={DESIGN_TWITTER_LIVE_CHAT_MESSAGES}
          streamIntervalMs={controls.streamIntervalMs}
          visibleDurationMs={visibleDurationMs}
        />
      </div>
    </div>
  );
}

const meta = {
  title: "Design System/Live Chat",
  component: LiveChat,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    fadeDurationMs: 600,
    height: 280,
    initialMessageCount: 4,
    isPaused: false,
    maxVisibleMessages: 4,
    messages: DESIGN_TWITTER_LIVE_CHAT_MESSAGES,
    streamIntervalMs: 640,
    visibleDurationMs: 3600,
  },
} satisfies Meta<typeof LiveChat>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DialKitTuning: Story = {
  render: () => <LiveChatTuner />,
};

export const Desktop: Story = {
  decorators: [
    (Story) => (
      <div className="w-[423px] bg-[linear-gradient(130deg,#1d9df1_0%,#7d92ef_34%,#d790d2_55%,#006079_100%)]">
        <Story />
      </div>
    ),
  ],
  parameters: { layout: "centered" },
};

export const Mobile: Story = {
  args: {
    fadeDurationMs: 560,
    height: 92,
    initialMessageCount: 2,
    maxVisibleMessages: 2,
    streamIntervalMs: 640,
    visibleDurationMs: 2600,
  },
  decorators: [
    (Story) => (
      <div className="w-[332px] bg-[linear-gradient(130deg,#1d9df1_0%,#7d92ef_34%,#d790d2_55%,#006079_100%)]">
        <Story />
      </div>
    ),
  ],
  parameters: { layout: "centered" },
};
