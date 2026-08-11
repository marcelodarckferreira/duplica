import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Camera, Eye, EyeOff, Pencil, Plus, ShieldCheck, Trash2, UserCheck, UserX } from "lucide-react";
import { ChangeEvent, useState } from "react";
import { useForm } from "react-hook-form";
import { Badge } from "../../../shared/ui/badge";
import { Button } from "../../../shared/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "../../../shared/ui/card";
import { Checkbox } from "../../../shared/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../shared/ui/select";
import { roles } from "../model/rules";
import { userDraftSchema, UserDraftInput } from "../schemas/schema";
import { User } from "../model/types";

const fieldClasses = "h-11 w-full rounded border border-border bg-surface px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return (first + last).toUpperCase();
}

function Avatar(props: { name: string; avatarUrl: string | null; size: number }) {
  if (props.avatarUrl) {
    return (
      <img
        src={props.avatarUrl}
        alt={props.name}
        className="rounded-full border border-border object-cover"
        style={{ width: props.size, height: props.size }}
      />
    );
  }
  return (
    <span
      className="grid place-items-center rounded-full bg-accent text-sm font-extrabold text-white"
      style={{ width: props.size, height: props.size }}
    >
      {initials(props.name)}
    </span>
  );
}

function UserForm(props: {
  editingUser: User | undefined;
  userMessage: string;
  onSubmit: (values: UserDraftInput) => Promise<void>;
  onCancel: () => void;
  onUploadAvatar: (userId: string, file: File) => Promise<void>;
}) {
  const { editingUser, userMessage, onSubmit, onCancel, onUploadAvatar } = props;

  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<UserDraftInput>({
    resolver: zodResolver(userDraftSchema),
    criteriaMode: "all",
    defaultValues: editingUser
      ? {
          username: editingUser.username,
          name: editingUser.name,
          email: editingUser.email,
          role: editingUser.role,
          password: "",
          confirmPassword: "",
          active: editingUser.active,
        }
      : { username: "", name: "", email: "", role: "Consulta", password: "", confirmPassword: "", active: true },
  });

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !editingUser) return;
    setAvatarError("");
    setIsUploadingAvatar(true);
    try {
      await onUploadAvatar(editingUser.id, file);
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : "Não foi possível enviar a imagem.");
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  return (
    <form className="grid gap-4 rounded-lg border border-border bg-surface p-[18px]" onSubmit={handleSubmit(onSubmit)}>
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded border-0 bg-transparent p-0 text-muted [appearance:none] hover:bg-surface-soft hover:text-text"
            onClick={onCancel}
            aria-label="Voltar para a lista"
          >
            <ArrowLeft size={18} />
          </button>
          <CardTitle>{editingUser ? "Editar conta" : "Nova conta"}</CardTitle>
        </div>
        <CardDescription>Login e perfil de acesso</CardDescription>
      </CardHeader>
      {editingUser && (
        <div className="mb-1 flex items-center gap-4">
          <span className="relative inline-block h-[72px] w-[72px] shrink-0">
            <Avatar name={editingUser.name} avatarUrl={editingUser.avatarUrl} size={72} />
            <label
              className="absolute -bottom-0.5 -right-0.5 grid h-7 w-7 cursor-pointer place-items-center rounded-full border-2 border-surface bg-accent-strong text-white hover:opacity-90"
              aria-label="Alterar foto do usuário"
            >
              <Camera size={14} />
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleAvatarChange}
                disabled={isUploadingAvatar}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
          </span>
          <div>
            <p className="m-0 text-sm text-muted">{isUploadingAvatar ? "Enviando…" : "PNG, JPEG ou WEBP até 2 MB."}</p>
            {avatarError && <p className="m-0 font-bold text-[#a43b2f]">{avatarError}</p>}
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <label className="grid gap-1.5 text-sm font-bold text-label sm:col-span-2">
          Usuário
          <input className={fieldClasses} {...register("username")} />
          {errors.username && <p className="m-0 font-bold text-[#a43b2f]">{errors.username.message}</p>}
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-label sm:col-span-2">
          Nome
          <input className={fieldClasses} {...register("name")} />
          {errors.name && <p className="m-0 font-bold text-[#a43b2f]">{errors.name.message}</p>}
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-label sm:col-span-2">
          E-mail
          <input type="email" className={fieldClasses} {...register("email")} />
          {errors.email && <p className="m-0 font-bold text-[#a43b2f]">{errors.email.message}</p>}
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-label sm:col-span-2">
          Perfil
          <Select value={watch("role")} onValueChange={(value) => setValue("role", value as UserDraftInput["role"], { shouldValidate: true })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {roles.map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}
            </SelectContent>
          </Select>
        </label>
        <div className="grid gap-1.5 sm:col-span-2">
          <label htmlFor="account-password" className="text-sm font-bold text-label">Senha</label>
          <span className="relative block">
            <button
              type="button"
              aria-label={isPasswordVisible ? "Ocultar confirmação de senha" : "Visualizar confirmação de senha"}
              onClick={() => setIsPasswordVisible((current) => !current)}
              className="absolute left-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded border-0 bg-transparent p-0 text-muted [appearance:none] hover:bg-surface-soft hover:text-text"
            >
              {isPasswordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
            <input
              id="account-password"
              type={isPasswordVisible ? "text" : "password"}
              minLength={8}
              className={`${fieldClasses} pl-11`}
              {...register("password")}
            />
          </span>
          {errors.password && <p className="m-0 font-bold text-[#a43b2f]">{errors.password.message}</p>}
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <label htmlFor="account-password-confirmation" className="text-sm font-bold text-label">Confirmar senha</label>
          <span className="relative block">
            <button
              type="button"
              aria-label={isPasswordVisible ? "Ocultar senha" : "Visualizar senha"}
              onClick={() => setIsPasswordVisible((current) => !current)}
              className="absolute left-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded border-0 bg-transparent p-0 text-muted [appearance:none] hover:bg-surface-soft hover:text-text"
            >
              {isPasswordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
            <input
              id="account-password-confirmation"
              type={isPasswordVisible ? "text" : "password"}
              minLength={8}
              className={`${fieldClasses} pl-11`}
              {...register("confirmPassword")}
            />
          </span>
          {errors.confirmPassword && (
            <p className="m-0 font-bold text-[#a43b2f]">{errors.confirmPassword.types?.custom ?? errors.confirmPassword.message}</p>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm font-bold text-label sm:col-span-2 lg:col-span-4">
          <Checkbox checked={watch("active")} onCheckedChange={(checked) => setValue("active", checked === true)} />
          Conta ativa
        </label>
      </div>
      {userMessage && <p className="m-0 font-bold text-accent">{userMessage}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isSubmitting}>
          <ShieldCheck size={18} /> {isSubmitting ? "Salvando…" : "Salvar conta"}
        </Button>
        <Button type="button" variant="soft" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

export function UsersView(props: {
  users: User[];
  editingUser: User | undefined;
  userMessage: string;
  mode: "list" | "form";
  onStartCreate: () => void;
  onSubmit: (values: UserDraftInput) => Promise<void>;
  onEditUser: (user: User) => void;
  onToggleUserActive: (user: User) => void;
  onDeleteUser: (user: User) => void;
  onCancelEdit: () => void;
  onUploadAvatar: (userId: string, file: File) => Promise<void>;
  currentUserId: string;
}) {
  const {
    users,
    editingUser,
    userMessage,
    mode,
    onStartCreate,
    onSubmit,
    onEditUser,
    onToggleUserActive,
    onDeleteUser,
    onCancelEdit,
    onUploadAvatar,
    currentUserId,
  } = props;

  if (mode === "form") {
    return (
      <UserForm
        key={editingUser?.id ?? "new"}
        editingUser={editingUser}
        userMessage={userMessage}
        onSubmit={onSubmit}
        onCancel={onCancelEdit}
        onUploadAvatar={onUploadAvatar}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contas de login</CardTitle>
        <div className="flex items-center gap-3.5">
          <CardDescription>{users.length} conta(s)</CardDescription>
          <Button type="button" onClick={onStartCreate}>
            <Plus size={17} /> Nova conta
          </Button>
        </div>
      </CardHeader>
      {userMessage && <p className="m-0 mb-3 font-bold text-accent">{userMessage}</p>}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b border-border px-2.5 py-2.5 text-left text-xs uppercase text-muted">Usuário</th>
              <th className="border-b border-border px-2.5 py-2.5 text-left text-xs uppercase text-muted">Nome</th>
              <th className="border-b border-border px-2.5 py-2.5 text-left text-xs uppercase text-muted">E-mail</th>
              <th className="border-b border-border px-2.5 py-2.5 text-left text-xs uppercase text-muted">Perfil</th>
              <th className="border-b border-border px-2.5 py-2.5 text-left text-xs uppercase text-muted">Status</th>
              <th className="border-b border-border px-2.5 py-2.5" aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {users.map((account) => (
              <tr key={account.id}>
                <td className="border-b border-border-soft px-2.5 py-2.5"><code>{account.username}</code></td>
                <td className="border-b border-border-soft px-2.5 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={account.name} avatarUrl={account.avatarUrl} size={30} />
                    <strong>{account.name}</strong>
                  </div>
                </td>
                <td className="border-b border-border-soft px-2.5 py-2.5">{account.email}</td>
                <td className="border-b border-border-soft px-2.5 py-2.5"><Badge variant="role">{account.role}</Badge></td>
                <td className="border-b border-border-soft px-2.5 py-2.5">
                  <Badge variant={account.active ? "active" : "inactive"}>{account.active ? "Ativo" : "Inativo"}</Badge>
                </td>
                <td className="border-b border-border-soft px-2.5 py-2.5">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      className="grid h-7 w-7 place-items-center rounded border-0 bg-transparent p-0 text-muted [appearance:none] hover:bg-surface-soft hover:text-text"
                      aria-label={`Editar ${account.name}`}
                      onClick={() => onEditUser(account)}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      className="grid h-7 w-7 place-items-center rounded border-0 bg-transparent p-0 text-muted [appearance:none] hover:bg-surface-soft hover:text-[#9b3d35]"
                      aria-label={account.active ? `Desativar ${account.name}` : `Ativar ${account.name}`}
                      onClick={() => onToggleUserActive(account)}
                    >
                      {account.active ? <UserX size={15} /> : <UserCheck size={15} />}
                    </button>
                    {!account.isSystem && account.id !== currentUserId && (
                      <button
                        type="button"
                        className="grid h-7 w-7 place-items-center rounded border-0 bg-transparent p-0 text-muted [appearance:none] hover:bg-surface-soft hover:text-[#9b3d35]"
                        aria-label={`Excluir ${account.name}`}
                        onClick={() => onDeleteUser(account)}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
