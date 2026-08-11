import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./dialog";

const meta = {
  title: "Design System/Dialog",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Dialog>
      <Button type="button">Abrir diálogo</Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Minha conta</DialogTitle>
        </DialogHeader>
        <DialogDescription>Atualize seu nome e e-mail.</DialogDescription>
        <DialogFooter>
          <Button type="button" variant="soft">Cancelar</Button>
          <Button type="button">Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const Open: Story = {
  render: () => (
    <Dialog defaultOpen>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar senha</DialogTitle>
        </DialogHeader>
        <DialogDescription>A senha atual é exigida antes de salvar a nova.</DialogDescription>
        <DialogFooter>
          <Button type="button" variant="soft">Cancelar</Button>
          <Button type="button">Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};
