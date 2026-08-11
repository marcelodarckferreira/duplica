import { cva, type VariantProps } from "class-variance-authority";
import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded border-0 font-bold transition-colors [appearance:none] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-accent-strong text-white hover:opacity-90",
        ghost: "bg-transparent text-muted hover:bg-surface-soft hover:text-text",
        soft: "bg-surface-soft text-text hover:opacity-90",
        danger: "bg-[#9b3d35] text-white hover:opacity-90",
      },
      size: {
        default: "h-11 px-4 text-sm",
        sm: "min-h-[34px] px-2.5 py-1.5 text-sm",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = "Button";
