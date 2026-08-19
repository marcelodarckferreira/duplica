import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { ComponentPropsWithoutRef, ElementRef, forwardRef } from "react";
import { cn } from "../lib/utils";

export const Checkbox = forwardRef<
  ElementRef<typeof CheckboxPrimitive.Root>,
  ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "grid h-4 w-4 shrink-0 place-items-center rounded-sm border border-border bg-surface p-0 [appearance:none]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
      "data-[state=checked]:border-accent-strong data-[state=checked]:bg-accent-strong data-[state=checked]:text-white",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="grid place-items-center text-current">
      <Check size={12} strokeWidth={3} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;
