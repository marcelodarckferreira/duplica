import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../../shared/ui/dialog";
import { ChangePasswordInput, changePasswordSchema, ProfileInput, profileSchema } from "../../users/schemas/schema";
import { User } from "../../users/model/types";
import { cn } from "../../../shared/lib/utils";

function Spinner() {
  return <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />;
}

export function AccountModal(props: {
  open: boolean;
  user: User;
  onClose: () => void;
  onSave: (payload: { name: string; email: string }) => Promise<void>;
}) {
  const { open, user, onClose, onSave } = props;
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name, email: user.email },
  });

  async function submit(values: ProfileInput) {
    setError("");
    try {
      await onSave(values);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Minha conta</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="grid gap-3.5">
          <label className="grid gap-1.5 text-sm font-bold text-label">
            Nome
            <input {...register("name")} className="rounded border border-border bg-surface px-3 py-2.5 font-normal text-text" />
            {errors.name && <p className="m-0 font-bold text-[#a43b2f]">{errors.name.message}</p>}
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-label">
            E-mail
            <input type="email" {...register("email")} className="rounded border border-border bg-surface px-3 py-2.5 font-normal text-text" />
            {errors.email && <p className="m-0 font-bold text-[#a43b2f]">{errors.email.message}</p>}
          </label>
          {error && <p className="m-0 font-bold text-[#a43b2f]">{error}</p>}
          <DialogFooter>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded border-0 bg-surface-soft px-4 py-2 text-sm font-bold text-text [appearance:none] hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded border-0 bg-accent-strong px-4 py-2 text-sm font-bold text-white [appearance:none] hover:opacity-90 disabled:pointer-events-none disabled:opacity-70"
            >
              {isSubmitting && <Spinner />}
              Salvar
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ChangePasswordModal(props: {
  open: boolean;
  onClose: () => void;
  onSave: (payload: { currentPassword: string; newPassword: string }) => Promise<void>;
}) {
  const { open, onClose, onSave } = props;
  const [isVisible, setIsVisible] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    criteriaMode: "all",
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  function handleClose() {
    reset({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setError("");
    onClose();
  }

  async function submit(values: ChangePasswordInput) {
    setError("");
    try {
      await onSave({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível alterar a senha.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar senha</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="grid gap-3.5">
          <label className="grid gap-1.5 text-sm font-bold text-label">
            Senha atual
            <span className="relative block">
              <input
                type={isVisible ? "text" : "password"}
                {...register("currentPassword")}
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
            {errors.currentPassword && <p className="m-0 font-bold text-[#a43b2f]">{errors.currentPassword.message}</p>}
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-label">
            Nova senha
            <input
              type={isVisible ? "text" : "password"}
              minLength={8}
              {...register("newPassword")}
              className="rounded border border-border bg-surface px-3 py-2.5 font-normal text-text"
            />
            {errors.newPassword && <p className="m-0 font-bold text-[#a43b2f]">{errors.newPassword.message}</p>}
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-label">
            Confirmar nova senha
            <input
              type={isVisible ? "text" : "password"}
              minLength={8}
              {...register("confirmPassword")}
              className="rounded border border-border bg-surface px-3 py-2.5 font-normal text-text"
            />
            {errors.confirmPassword && (
              <p className="m-0 font-bold text-[#a43b2f]">{errors.confirmPassword.types?.custom ?? errors.confirmPassword.message}</p>
            )}
          </label>
          {error && <p className="m-0 font-bold text-[#a43b2f]">{error}</p>}
          <DialogFooter>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="rounded border-0 bg-surface-soft px-4 py-2 text-sm font-bold text-text [appearance:none] hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded border-0 bg-accent-strong px-4 py-2 text-sm font-bold text-white [appearance:none] hover:opacity-90 disabled:pointer-events-none disabled:opacity-70"
            >
              {isSubmitting && <Spinner />}
              Salvar
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
