import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { WritingPostList, type WritingPost } from ".";

export const WritingPostFixtures: WritingPost[] = [
  {
    title:
      "Tuning Into the Hacker Mindset: OSINT Video Agents, Man-In-The-Malware, Flipper Zero Recon, and Social Engineering - Lessons from DEFCON33",
    href: "https://systeminterface.substack.com/p/tuning-into-the-hacker-mindset-osint",
    description:
      "Real-world lessons from DEFCON33 on how hackers use tools, tricks, and mindset to peel away the abstractions of systems",
    publishedAt: "2026-08-16T00:00:00.000Z",
  },
  {
    title:
      "Tuning Into the Hacker Mindset: OSINT Video Agents, Man-In-The-Malware, Flipper Zero Recon, and Social Engineering - Lessons from DEFCON33",
    href: "https://systeminterface.substack.com/p/tuning-into-the-hacker-mindset-osint?story=2",
    description:
      "Real-world lessons from DEFCON33 on how hackers use tools, tricks, and mindset to peel away the abstractions of systems",
    publishedAt: "2026-08-16T00:00:00.000Z",
  },
  {
    title:
      "Tuning Into the Hacker Mindset: OSINT Video Agents, Man-In-The-Malware, Flipper Zero Recon, and Social Engineering - Lessons from DEFCON33",
    href: "https://systeminterface.substack.com/p/tuning-into-the-hacker-mindset-osint?story=3",
    description:
      "Real-world lessons from DEFCON33 on how hackers use tools, tricks, and mindset to peel away the abstractions of systems",
    publishedAt: "2026-08-16T00:00:00.000Z",
  },
  {
    title:
      "Tuning Into the Hacker Mindset: OSINT Video Agents, Man-In-The-Malware, Flipper Zero Recon, and Social Engineering - Lessons from DEFCON33",
    href: "https://systeminterface.substack.com/p/tuning-into-the-hacker-mindset-osint?story=4",
    description:
      "Real-world lessons from DEFCON33 on how hackers use tools, tricks, and mindset to peel away the abstractions of systems",
    publishedAt: "2026-08-16T00:00:00.000Z",
  },
];

const meta = {
  title: "Portfolio/Writing Posts",
  component: WritingPostList,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    posts: WritingPostFixtures,
  },
} satisfies Meta<typeof WritingPostList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Desktop: Story = {
  render: (args) => (
    <div className="min-h-screen w-[1728px] bg-white px-[116px] pt-[123px]">
      <WritingPostList {...args} />
    </div>
  ),
};

export const Mobile: Story = {
  args: {
    posts: WritingPostFixtures.slice(0, 1),
  },
  render: (args) => (
    <div className="min-h-screen w-[375px] bg-white px-[20px] pt-[167px]">
      <WritingPostList {...args} />
    </div>
  ),
};
