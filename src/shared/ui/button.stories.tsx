import type { Meta, StoryObj } from "@storybook/react-vite";
import { Plus } from "lucide-react";
import { Button } from "./button";

const meta = {
  component: Button,
  title: "Design System/Button",
  args: {
    children: "Salvar",
  },
  argTypes: {
    variant: { control: "select", options: ["default", "ghost", "soft", "danger"] },
    size: { control: "select", options: ["default", "sm", "icon"] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { variant: "default" },
};

export const Ghost: Story = {
  args: { variant: "ghost" },
};

export const Soft: Story = {
  args: { variant: "soft" },
};

export const Danger: Story = {
  args: { variant: "danger", children: "Excluir" },
};

export const WithIcon: Story = {
  args: {
    children: (
      <>
        <Plus size={17} />
        Nova solicitação
      </>
    ),
  },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const Loading: Story = {
  args: {
    disabled: true,
    children: (
      <>
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
        Salvando…
      </>
    ),
  },
};
