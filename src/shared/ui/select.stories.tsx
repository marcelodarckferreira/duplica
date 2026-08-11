import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

const meta = {
  title: "Design System/Select",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const papers = ["A4", "A3", "Ofício"];

function SelectDemo() {
  const [value, setValue] = useState("A4");
  return (
    <Select value={value} onValueChange={setValue}>
      <SelectTrigger className="w-56">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {papers.map((paper) => (
          <SelectItem key={paper} value={paper}>
            {paper}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export const Default: Story = {
  render: () => <SelectDemo />,
};

export const Disabled: Story = {
  render: () => (
    <Select value="A4" disabled>
      <SelectTrigger className="w-56">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {papers.map((paper) => (
          <SelectItem key={paper} value={paper}>
            {paper}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ),
};

export const Open: Story = {
  render: () => (
    <Select defaultOpen value="A4">
      <SelectTrigger className="w-56">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {papers.map((paper) => (
          <SelectItem key={paper} value={paper}>
            {paper}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ),
};
