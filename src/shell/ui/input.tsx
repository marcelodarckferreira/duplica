import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "../../lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded border border-border bg-surface px-3 text-sm text-text placeholder:text-muted",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
