import type { Meta, StoryObj } from "@storybook/react-vite";
import { Key, LogOut, User as UserIcon } from "lucide-react";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";

const meta = {
  title: "Design System/DropdownMenu",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="soft">Abrir menu do usuário</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <h2 className="m-0 px-2 py-1 text-xs font-bold uppercase tracking-wide text-muted">Conta</h2>
        <DropdownMenuItem>
          <UserIcon size={16} />
          Minha conta
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Key size={16} />
          Alterar senha
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="font-medium text-[#a43b2f]">
          <LogOut size={16} />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};

export const Open: Story = {
  render: () => (
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="soft">Abrir menu do usuário</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <DropdownMenuItem>
          <UserIcon size={16} />
          Minha conta
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Key size={16} />
          Alterar senha
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};
