import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card, CardDescription, CardHeader, CardTitle } from "./card";

const meta = {
  component: Card,
  title: "Design System/Card",
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-96">
      <CardHeader>
        <CardTitle>Unidades escolares e setores</CardTitle>
        <CardDescription>6 cadastrados</CardDescription>
      </CardHeader>
      <p className="m-0 text-sm text-text">Conteúdo do card.</p>
    </Card>
  ),
};

export const Empty: Story = {
  render: () => (
    <Card className="w-96">
      <CardHeader>
        <CardTitle>Contas de login</CardTitle>
        <CardDescription>0 conta(s)</CardDescription>
      </CardHeader>
      <p className="m-0 text-sm text-muted">Nenhum registro encontrado.</p>
    </Card>
  ),
};
