import {
  SourcesChip,
  SourcesRail,
  type SourceData,
} from "@starter/design-system";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

const matchSources: SourceData[] = [
  {
    description:
      "Argentina completed a comeback against England with second-half goals.",
    provider: "parallel",
    publishedAt: "2026-07-15",
    title:
      "Messi's Argentina stun England in comeback to reach World Cup final - Sport - DAWN.COM",
    url: "https://www.dawn.com/sport",
  },
  {
    description: "Live match report with scorers, cards, and final score.",
    provider: "exa",
    publishedAt: "2026-07-15",
    title: "Argentina 2-1 England: World Cup match report",
    url: "https://www.bbc.com/sport/football",
  },
  {
    description: "Post-match recap and verified scoring timeline.",
    provider: "perplexity",
    publishedAt: "2026-07-15",
    title: "Argentina vs England result, scorers, highlights",
    url: "https://www.espn.com/soccer/",
  },
  {
    description: "Minute-by-minute live blog from the knockout round.",
    provider: "parallel",
    publishedAt: "2026-07-15",
    title: "Argentina edge England after late winner",
    url: "https://www.theguardian.com/football",
  },
];

const meta = {
  title: "Design System/Sources Chip",
  component: SourcesChip,
  parameters: { layout: "centered" },
  args: {
    index: 0,
    source: matchSources[0],
  },
} satisfies Meta<typeof SourcesChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SourceRail: Story = {
  render: () => (
    <div className="w-[454px]">
      <SourcesRail sources={matchSources} />
    </div>
  ),
};

export const NarrowScroll: Story = {
  render: () => (
    <div className="w-[260px] border border-[var(--color-border-subtle)] p-token-12">
      <SourcesRail sources={matchSources} />
    </div>
  ),
};
