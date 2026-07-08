import { Checkbox } from "@starter/design-system";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

const meta = {
  title: "Design System/Checkbox",
  component: Checkbox,
  parameters: { layout: "centered" },
  argTypes: {
    checked: { control: "boolean" },
  },
  args: {
    checked: false,
  },
  render: function Render(args) {
    const [localChecked, setLocalChecked] = useState(Boolean(args.checked));

    return (
      <Checkbox
        {...args}
        checked={localChecked}
        onCheckedChange={setLocalChecked}
      />
    );
  },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Filled: Story = {
  args: { checked: true },
};

export const FigmaStates: Story = {
  render: () => (
    <div className="flex gap-[15px]">
      <Checkbox defaultChecked={false} />
      <Checkbox defaultChecked />
    </div>
  ),
};
