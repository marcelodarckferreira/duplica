import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "./input";
import { Label } from "./label";

const meta = {
  component: Label,
  title: "Design System/Label",
  args: {
    children: "Nome",
  },
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AssociatedWithField: Story = {
  render: (args) => (
    <div className="grid gap-1.5">
      <Label htmlFor="story-label-field" {...args} />
      <Input id="story-label-field" />
    </div>
  ),
};
