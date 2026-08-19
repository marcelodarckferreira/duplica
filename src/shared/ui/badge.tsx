import { cva, type VariantProps } from "class-variance-authority";
import { HTMLAttributes } from "react";
import { cn } from "../lib/utils";

const badgeVariants = cva(
  "inline-flex min-h-[26px] items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-extrabold",
  {
    variants: {
      variant: {
        recebido: "text-status-recebido-fg bg-status-recebido-bg",
        "em-producao": "text-status-em-producao-fg bg-status-em-producao-bg",
        pronto: "text-status-pronto-fg bg-status-pronto-bg",
        entregue: "text-status-entregue-fg bg-status-entregue-bg",
        cancelado: "text-status-cancelado-fg bg-status-cancelado-bg",
        role: "text-accent-strong bg-surface-soft",
        active: "text-status-pronto-fg bg-status-pronto-bg",
        inactive: "text-status-cancelado-fg bg-status-cancelado-bg",
        urgente: "text-priority-urgente-fg bg-priority-urgente-bg",
        institucional: "text-priority-institucional-fg bg-priority-institucional-bg",
      },
    },
    defaultVariants: {
      variant: "role",
    },
  },
);

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
