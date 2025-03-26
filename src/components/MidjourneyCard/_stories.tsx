import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import MidjourneyCard from "./index";

const meta = {
  title: "Components/MidjourneyCard",
  component: MidjourneyCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof MidjourneyCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    entityId: "3e3b3653618115",
    threatLevel: "HIGH",
    status: "ACTIVE",
    location: "UNKNOWN",
    age: "UNKNOWN",
    height: "250cm",
    weight: "300kg",
    videoSrc: "/placeholder-video.mp4",
    imageSrc: "https://picsum.photos/400/400",
    ref: "3e3b3653618115_CEPHALON",
  },
};

export const HoveredState: Story = {
  args: {
    ...Default.args,
  },
  render: (args) => {
    // Force the component into hover state for demo purposes
    return (
      <div data-force-hover="true" className="hover">
        <MidjourneyCard {...args} />
      </div>
    );
  },
};
