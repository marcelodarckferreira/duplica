import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Button } from "./button";
import { ConfirmModal } from "./modal";

const meta = {
  title: "Design System/ConfirmModal",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function DefaultDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="soft" onClick={() => setOpen(true)}>
        Abrir confirmação
      </Button>
      <ConfirmModal
        open={open}
        title="Salvar alterações"
        description="Confirma a atualização deste registro?"
        confirmLabel="Salvar"
        onConfirm={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}

export const Default: Story = {
  render: () => <DefaultDemo />,
};

function DangerDemo() {
  const [open, setOpen] = useState(true);
  return (
    <ConfirmModal
      open={open}
      title="Excluir solicitação"
      description="Tem certeza que deseja excluir a solicitação CP-2026-0001? Essa ação não pode ser desfeita."
      confirmLabel="Excluir"
      danger
      onConfirm={() => setOpen(false)}
      onCancel={() => setOpen(false)}
    />
  );
}

export const Danger: Story = {
  render: () => <DangerDemo />,
};

export const Confirming: Story = {
  render: () => (
    <ConfirmModal
      open
      title="Excluir solicitação"
      description="Tem certeza que deseja excluir a solicitação CP-2026-0001? Essa ação não pode ser desfeita."
      confirmLabel="Excluir"
      danger
      isConfirming
      onConfirm={() => {}}
      onCancel={() => {}}
    />
  ),
};
