import { cn } from "../lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "./dialog";

export function ConfirmModal(props: {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  isConfirming?: boolean;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { open, title, description, confirmLabel, cancelLabel = "Cancelar", isConfirming, danger, onConfirm, onCancel } = props;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent
        role="alertdialog"
        hideClose
        onEscapeKeyDown={(event) => isConfirming && event.preventDefault()}
        onPointerDownOutside={(event) => isConfirming && event.preventDefault()}
      >
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        <DialogFooter>
          <button
            type="button"
            onClick={onCancel}
            disabled={isConfirming}
            className="rounded border-0 bg-surface-soft px-4 py-2 text-sm font-bold text-text [appearance:none] hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className={cn(
              "inline-flex items-center gap-2 rounded border-0 px-4 py-2 text-sm font-bold text-white [appearance:none] hover:opacity-90 disabled:pointer-events-none disabled:opacity-70",
              danger ? "bg-[#9b3d35]" : "bg-accent-strong",
            )}
          >
            {isConfirming && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
            )}
            {confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
