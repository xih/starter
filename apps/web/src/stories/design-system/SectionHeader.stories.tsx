import { SectionHeader } from "@starter/design-system";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

const subtext =
  "2 lines of subtext before it breaks out from here. Nell, AGI, Krea, and Skydio. Skydio.Skydio.Skydio.Skydio.";

const meta = {
  title: "Design System/Section Header",
  component: SectionHeader,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof SectionHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Matrix: Story = {
  args: {
    title: "Title",
  },
  render: () => (
    <div className="grid w-[863px] grid-cols-2 gap-x-[98px] gap-y-[82px] bg-white p-[20px]">
      <SectionHeader showBackButton title="Title" />
      <SectionHeader title="Title" />
      <SectionHeader actionLabel="View all" showBackButton title="Title" />
      <SectionHeader actionLabel="View all" title="Title" />
      <SectionHeader showBackButton showSortOrder title="Title" />
      <SectionHeader showSortOrder title="Title" />
      <SectionHeader
        showBackButton
        showSortOrder
        subtext={subtext}
        title="Title"
      />
      <SectionHeader showSortOrder subtext={subtext} title="Title" />
      <SectionHeader showBackButton subtext={subtext} title="Title" />
      <SectionHeader subtext={subtext} title="Title" />
    </div>
  ),
};

export const AskHeader: Story = {
  args: {
    title: "Hi, what would you like to ask?",
  },
  render: () => (
    <div className="w-[402px] bg-white p-[20px]">
      <SectionHeader
        showBackButton
        subtext="This feature uses the memories of living people. It can make some mistakes"
        title="Hi, what would you like to ask?"
      />
    </div>
  ),
};
