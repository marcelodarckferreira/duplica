import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "./input";
import { Label } from "./label";

const meta = {
  component: Input,
  title: "Design System/Input",
  args: {
    placeholder: "Digite aqui…",
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLabel: Story = {
  render: (args) => (
    <div className="grid gap-1.5">
      <Label htmlFor="story-input">Nome</Label>
      <Input id="story-input" {...args} />
    </div>
  ),
};

export const Disabled: Story = {
  args: { disabled: true, value: "Não editável", readOnly: true },
};

export const WithError: Story = {
  render: (args) => (
    <div className="grid gap-1.5">
      <Label htmlFor="story-input-error">E-mail</Label>
      <Input id="story-input-error" {...args} defaultValue="email-invalido" />
      <p className="m-0 font-bold text-[#a43b2f]">Informe um e-mail válido.</p>
    </div>
  ),
};
