import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { CaseStudy, getCaseStudy } from "~/components/CaseStudy";

const nell = getCaseStudy("nell")!;

/**
 * `CaseStudy` is the shared, data-driven portfolio case study layout. Every case
 * (Nell, AGI, Krea, …) is a single `CaseStudyData` object fed into this one
 * component, so new case studies are added as data in `cases.ts` rather than as
 * bespoke pages. Pick a case from the `study` control to preview it here.
 */
const meta = {
  title: "Portfolio/Case Study",
  component: CaseStudy,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    study: nell,
  },
} satisfies Meta<typeof CaseStudy>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Nell: Story = {};

export const Agi: Story = {
  args: {
    study: getCaseStudy("agi")!,
  },
};

export const Krea: Story = {
  args: {
    study: getCaseStudy("krea")!,
  },
};

export const Skydio: Story = {
  args: {
    study: getCaseStudy("skydio")!,
  },
};
