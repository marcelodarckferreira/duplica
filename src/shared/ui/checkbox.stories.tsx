import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Checkbox } from "./checkbox";

const meta = {
  component: Checkbox,
  title: "Design System/Checkbox",
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {
  args: { defaultChecked: false },
};

export const Checked: Story = {
  args: { defaultChecked: true },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const DisabledChecked: Story = {
  args: { disabled: true, defaultChecked: true },
};

function CheckboxWithLabelDemo() {
  const [checked, setChecked] = useState(true);
  return (
    <label className="flex items-center gap-2 text-sm font-bold text-label">
      <Checkbox checked={checked} onCheckedChange={(value) => setChecked(value === true)} />
      Frente e verso
    </label>
  );
}

export const WithLabel: Story = {
  render: () => <CheckboxWithLabelDemo />,
};
