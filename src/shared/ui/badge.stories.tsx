import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "./badge";

const meta = {
  component: Badge,
  title: "Design System/Badge",
  args: {
    children: "Recebido",
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["recebido", "em-producao", "pronto", "entregue", "cancelado", "role", "active", "inactive"],
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Recebido: Story = {
  args: { variant: "recebido", children: "Recebido" },
};

export const EmProducao: Story = {
  args: { variant: "em-producao", children: "Em produção" },
};

export const Pronto: Story = {
  args: { variant: "pronto", children: "Pronto" },
};

export const Entregue: Story = {
  args: { variant: "entregue", children: "Entregue" },
};

export const Cancelado: Story = {
  args: { variant: "cancelado", children: "Cancelado" },
};

export const Role: Story = {
  args: { variant: "role", children: "Admin" },
};

export const Active: Story = {
  args: { variant: "active", children: "Ativo" },
};

export const Inactive: Story = {
  args: { variant: "inactive", children: "Inativo" },
};

export const AllStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="recebido">Recebido</Badge>
      <Badge variant="em-producao">Em produção</Badge>
      <Badge variant="pronto">Pronto</Badge>
      <Badge variant="entregue">Entregue</Badge>
      <Badge variant="cancelado">Cancelado</Badge>
    </div>
  ),
};
