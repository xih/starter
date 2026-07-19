import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { TimelinePhysicsControls } from "~/components/interactions";

const meta = {
  title: "Interactions/Timeline Physics Controls",
  component: TimelinePhysicsControls,
  parameters: { layout: "centered" },
  args: {
    children: () => null,
    showPanel: false,
  },
} satisfies Meta<typeof TimelinePhysicsControls>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Summary: Story = {
  render: (args) => (
    <TimelinePhysicsControls {...args}>
      {(controls) => (
        <div className="w-[420px] rounded-md border border-neutral-200 bg-white p-5 text-neutral-950">
          <h2 className="text-lg font-semibold">Archive Scroll Timeline</h2>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-neutral-500">Hover reveal</dt>
              <dd>{controls.hoverRevealDuration}s</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Minimap scale</dt>
              <dd>{controls.minimapScale}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Zoom spring</dt>
              <dd>
                {controls.zoomSpringStiffness}/{controls.zoomSpringDamping}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500">Travel spring</dt>
              <dd>
                {controls.travelSpringStiffness}/{controls.travelSpringDamping}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </TimelinePhysicsControls>
  ),
};
