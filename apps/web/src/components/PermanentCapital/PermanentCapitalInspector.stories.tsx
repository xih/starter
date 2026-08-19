import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  aggregatePermanentCapitalCompanies,
  missingPermanentCapitalCompanyFixture,
  permanentCapitalCompanyFixture,
} from "./PermanentCapital.fixtures";
import {
  PermanentCapitalDrawer,
  PermanentCapitalInspector,
} from "./PermanentCapitalInspector";

const meta = {
  title: "Permanent Capital/Inspector",
  component: PermanentCapitalInspector,
  parameters: {
    layout: "centered",
  },
  args: {
    selection: null,
  },
} satisfies Meta<typeof PermanentCapitalInspector>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  render: () => (
    <div className="h-[720px] w-[476px] bg-[#05060a] p-token-20">
      <PermanentCapitalInspector selection={null} />
    </div>
  ),
};

export const AggregateSelection: Story = {
  render: () => (
    <div className="h-[720px] w-[476px] bg-[#05060a] p-token-20">
      <PermanentCapitalInspector
        selection={{
          type: "aggregate",
          companies: aggregatePermanentCapitalCompanies,
        }}
      />
    </div>
  ),
};

export const CompanySelection: Story = {
  render: () => (
    <div className="h-[1024px] w-[476px] bg-[#05060a] p-token-20">
      <PermanentCapitalInspector
        selection={{
          type: "company",
          company: permanentCapitalCompanyFixture,
          aggregateCompanies: aggregatePermanentCapitalCompanies,
        }}
      />
    </div>
  ),
};

export const MissingData: Story = {
  render: () => (
    <div className="h-[760px] w-[476px] bg-[#05060a] p-token-20">
      <PermanentCapitalInspector
        selection={{
          type: "company",
          company: missingPermanentCapitalCompanyFixture,
        }}
      />
    </div>
  ),
};

export const MobileDrawer: Story = {
  parameters: {
    layout: "fullscreen",
    viewport: {
      defaultViewport: "mobile1",
    },
  },
  render: () => (
    <main className="h-svh w-full bg-[#05060a]">
      <PermanentCapitalDrawer
        selection={{
          type: "company",
          company: permanentCapitalCompanyFixture,
        }}
      />
    </main>
  ),
};
