import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ReactNode } from "react";

import {
  DEFAULT_STATUS_DOCK_DATA,
  StatusDock,
  type StatusDockData,
} from "~/components/StatusDock";

const designTime = new Date("2026-06-24T14:16:05-07:00");

const figmaData: StatusDockData = {
  ...DEFAULT_STATUS_DOCK_DATA,
  now: designTime,
};

const rainyTokyoData: StatusDockData = {
  visitors: 8,
  now: new Date("2026-06-24T06:02:44+09:00"),
  location: {
    city: "Tokyo",
    latitude: 35.6762,
    longitude: 139.6503,
    timezone: "Asia/Tokyo",
  },
  weather: {
    condition: "Rain",
    temperatureF: 81,
    windInchesPerSecond: 24.6,
    precipitationLabel: "Rain",
  },
};

function StorySurface({
  children,
  width,
}: {
  children: ReactNode;
  width: number;
}) {
  return (
    <div className="min-h-screen bg-[var(--color-bg-app)] p-token-24">
      <div
        className="overflow-auto border border-dashed border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] p-token-16"
        style={{ width }}
      >
        {children}
      </div>
    </div>
  );
}

const meta = {
  title: "Design System/Status Dock",
  component: StatusDock,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Status dock implementation for Figma node 37:66. Uses design tokens for color, spacing, radius, and typography. Live mode uses browser time, ipapi.co for IP location, and Open-Meteo for current weather.",
      },
    },
  },
  argTypes: {
    viewport: {
      control: "inline-radio",
      options: ["mobile", "desktop"],
    },
    live: {
      control: "boolean",
    },
  },
} satisfies Meta<typeof StatusDock>;

export default meta;

type Story = StoryObj<typeof meta>;

export const MobileFigmaSpec: Story = {
  args: {
    data: figmaData,
    live: false,
    viewport: "mobile",
  },
  render: (args) => (
    <StorySurface width={450}>
      <StatusDock {...args} />
    </StorySurface>
  ),
};

export const DesktopFigmaSpec: Story = {
  args: {
    data: figmaData,
    live: false,
    viewport: "desktop",
  },
  render: (args) => (
    <StorySurface width={1800}>
      <StatusDock {...args} />
    </StorySurface>
  ),
};

export const MobileRainyTokyo: Story = {
  args: {
    data: rainyTokyoData,
    live: false,
    viewport: "mobile",
  },
  render: (args) => (
    <StorySurface width={450}>
      <StatusDock {...args} />
    </StorySurface>
  ),
};

export const DesktopRainyTokyo: Story = {
  args: {
    data: rainyTokyoData,
    live: false,
    viewport: "desktop",
  },
  render: (args) => (
    <StorySurface width={1800}>
      <StatusDock {...args} />
    </StorySurface>
  ),
};

export const LiveIpLocationAndWeather: Story = {
  args: {
    data: figmaData,
    live: true,
    viewport: "desktop",
  },
  parameters: {
    chromatic: {
      disableSnapshot: true,
    },
  },
  render: (args) => (
    <StorySurface width={1800}>
      <StatusDock {...args} />
    </StorySurface>
  ),
};
