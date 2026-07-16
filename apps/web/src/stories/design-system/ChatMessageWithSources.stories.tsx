import {
  ChatMessageWithSources,
  type SourceData,
} from "@starter/design-system";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

const sources: SourceData[] = [
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
];

const meta = {
  title: "Design System/Chat Message With Sources",
  component: ChatMessageWithSources,
  parameters: { layout: "centered" },
  args: {
    message: {
      id: "agent-match-result",
      role: "system",
      text: "Argentina beat England 2-1 today. The confirmed scorers were Lionel Messi and Lautaro Martinez for Argentina, with Jude Bellingham scoring for England.",
    },
    sources,
  },
} satisfies Meta<typeof ChatMessageWithSources>;

export default meta;
type Story = StoryObj<typeof meta>;

export const System: Story = {};

export const LongSourceRail: Story = {
  args: {
    sources: [
      ...sources,
      {
        description: "Minute-by-minute live blog from the knockout round.",
        provider: "parallel",
        publishedAt: "2026-07-15",
        title: "Argentina edge England after late winner",
        url: "https://www.theguardian.com/football",
      },
      {
        description: "Tournament hub with match center and player stats.",
        provider: "exa",
        publishedAt: "2026-07-15",
        title: "World Cup match center: Argentina vs England",
        url: "https://www.fifa.com/",
      },
    ],
  },
};
