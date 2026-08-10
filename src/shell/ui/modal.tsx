import { ReactNode } from "react";
import { cn } from "../../lib/utils";

export function ConfirmModal(props: {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  isConfirming?: boolean;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { open, title, description, confirmLabel, cancelLabel = "Cancelar", isConfirming, danger, onConfirm, onCancel } = props;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="presentation" onClick={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="w-full max-w-sm rounded-lg border border-border bg-surface p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-modal-title" className="m-0 text-lg font-bold text-text">
          {title}
        </h2>
        <div className="mt-2 text-sm text-muted">{description}</div>
        <div className="mt-6 flex justify-end gap-2">
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
        </div>
      </div>
    </div>
  );
}
