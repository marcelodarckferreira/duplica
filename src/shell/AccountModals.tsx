import { Eye, EyeOff, X } from "lucide-react";
import { FormEvent, ReactNode, useState } from "react";
import { User } from "../domains/users/types";
import { cn } from "../lib/utils";

function Spinner() {
  return <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />;
}

function ModalShell(props: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  if (!props.open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="presentation" onClick={props.onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-modal-title"
        className="w-full max-w-sm rounded-lg border border-border bg-surface p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="account-modal-title" className="m-0 text-lg font-bold text-text">{props.title}</h2>
          <button
            type="button"
            onClick={props.onClose}
            aria-label="Fechar"
            className="grid h-7 w-7 place-items-center rounded border-0 bg-transparent p-0 text-muted [appearance:none] hover:bg-surface-soft hover:text-text"
          >
            <X size={16} />
          </button>
        </div>
        {props.children}
      </div>
    </div>
  );
}

export function AccountModal(props: {
  open: boolean;
  user: User;
  onClose: () => void;
  onSave: (payload: { name: string; email: string }) => Promise<void>;
}) {
  const { open, user, onClose, onSave } = props;
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      await onSave({ name, email });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ModalShell open={open} title="Minha conta" onClose={onClose}>
      <form onSubmit={handleSubmit} className="grid gap-3.5">
        <label className="grid gap-1.5 text-sm font-bold text-label">
          Nome
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            className="rounded border border-border bg-surface px-3 py-2.5 font-normal text-text"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-label">
          E-mail
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="rounded border border-border bg-surface px-3 py-2.5 font-normal text-text"
          />
        </label>
        {error && <p className="m-0 font-bold text-[#a43b2f]">{error}</p>}
        <div className="mt-1 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded border-0 bg-surface-soft px-4 py-2 text-sm font-bold text-text [appearance:none] hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded border-0 bg-accent-strong px-4 py-2 text-sm font-bold text-white [appearance:none] hover:opacity-90 disabled:pointer-events-none disabled:opacity-70"
          >
            {isSaving && <Spinner />}
            Salvar
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function ChangePasswordModal(props: {
  open: boolean;
  onClose: () => void;
  onSave: (payload: { currentPassword: string; newPassword: string }) => Promise<void>;
}) {
  const { open, onClose, onSave } = props;
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  function handleClose() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }
    setIsSaving(true);
    try {
      await onSave({ currentPassword, newPassword });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível alterar a senha.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ModalShell open={open} title="Alterar senha" onClose={handleClose}>
      <form onSubmit={handleSubmit} className="grid gap-3.5">
        <label className="grid gap-1.5 text-sm font-bold text-label">
          Senha atual
          <span className="relative block">
            <input
              type={isVisible ? "text" : "password"}
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
              className="w-full rounded border border-border bg-surface py-2.5 pl-3 pr-10 font-normal text-text"
            />
            <button
              type="button"
              onClick={() => setIsVisible((current) => !current)}
              aria-label={isVisible ? "Ocultar senhas" : "Visualizar senhas"}
              className={cn(
                "absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded border-0 bg-transparent p-0 text-muted [appearance:none] hover:bg-surface-soft hover:text-text",
              )}
            >
              {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </span>
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-label">
          Nova senha
          <input
            type={isVisible ? "text" : "password"}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            className="rounded border border-border bg-surface px-3 py-2.5 font-normal text-text"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-label">
          Confirmar nova senha
          <input
            type={isVisible ? "text" : "password"}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            className="rounded border border-border bg-surface px-3 py-2.5 font-normal text-text"
          />
        </label>
        {error && <p className="m-0 font-bold text-[#a43b2f]">{error}</p>}
        <div className="mt-1 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="rounded border-0 bg-surface-soft px-4 py-2 text-sm font-bold text-text [appearance:none] hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded border-0 bg-accent-strong px-4 py-2 text-sm font-bold text-white [appearance:none] hover:opacity-90 disabled:pointer-events-none disabled:opacity-70"
          >
            {isSaving && <Spinner />}
            Salvar
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
