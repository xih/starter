import { DesignSystemButton } from "@starter/design-system";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

const meta = {
  title: "Design System/Buttons/Secondary",
  component: DesignSystemButton,
  parameters: { layout: "centered" },
  args: {
    buttonType: "secondary",
    children: "Button",
    size: "large",
    state: "default",
  },
  argTypes: {
    size: { control: "inline-radio", options: ["large", "small"] },
    state: {
      control: "inline-radio",
      options: ["default", "hovered", "selected", "disabled"],
    },
  },
} satisfies Meta<typeof DesignSystemButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const FigmaStates: Story = {
  render: () => (
    <div className="grid gap-token-20">
      {(["default", "hovered", "selected", "disabled"] as const).map(
        (state) => (
          <DesignSystemButton buttonType="secondary" key={state} state={state}>
            Button
          </DesignSystemButton>
        ),
      )}
      <div className="grid grid-cols-4 gap-token-20 pt-token-40">
        {(["default", "hovered", "selected", "disabled"] as const).map(
          (state) => (
            <DesignSystemButton
              buttonType="secondary"
              key={state}
              size="small"
              state={state}
            >
              Button
            </DesignSystemButton>
          ),
        )}
      </div>
    </div>
  ),
};
