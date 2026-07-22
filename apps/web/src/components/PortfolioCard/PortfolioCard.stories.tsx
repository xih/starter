import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { PortfolioCard, PortfolioCardGrid, portfolioProjects } from ".";

const meta = {
  title: "Portfolio/Portfolio Card",
  component: PortfolioCard,
  parameters: {
    layout: "centered",
  },
  args: portfolioProjects[0]!,
} satisfies Meta<typeof PortfolioCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="w-[730px] max-w-[calc(100vw-32px)] bg-white p-token-24">
      <PortfolioCard {...args} />
    </div>
  ),
};

export const DesktopGrid: Story = {
  parameters: {
    layout: "fullscreen",
  },
  render: () => (
    <main className="min-h-screen bg-white px-token-24 py-token-48 text-text-primary md:px-[116px] md:py-token-64">
      <section className="grid gap-token-24">
        <h2 className="font-title text-title text-text-primary">
          Case Studies
        </h2>
        <PortfolioCardGrid className="max-w-[1497px]" />
      </section>
    </main>
  ),
};

export const MobileStack: Story = {
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
  },
  render: () => (
    <main className="w-[390px] max-w-full bg-white px-token-16 py-token-32 text-text-primary">
      <section className="grid gap-token-20">
        <h2 className="font-title text-title text-text-primary">
          Case Studies
        </h2>
        <PortfolioCardGrid className="gap-y-token-40" />
      </section>
    </main>
  ),
};

export const WithoutLinks: Story = {
  render: () => (
    <div className="w-[730px] max-w-[calc(100vw-32px)] bg-white p-token-24">
      <PortfolioCard {...portfolioProjects[2]!} links={[]} />
    </div>
  ),
};
