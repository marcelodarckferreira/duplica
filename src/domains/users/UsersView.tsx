import { ArrowLeft, Camera, Eye, EyeOff, Pencil, Plus, ShieldCheck, Trash2, UserCheck, UserX } from "lucide-react";
import { ChangeEvent, FormEvent, useState } from "react";
import { roles } from "./rules";
import { User, UserDraft, UserRole } from "./types";

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
        className="avatar-image"
        style={{ width: props.size, height: props.size }}
      />
    );
  }
  return (
    <span className="avatar-fallback" style={{ width: props.size, height: props.size }}>
      {initials(props.name)}
    </span>
  );
}

export function UsersView(props: {
  users: User[];
  userForm: UserDraft;
  confirmPassword: string;
  isPasswordVisible: boolean;
  userMessage: string;
  mode: "list" | "form";
  onUserFormChange: (form: UserDraft) => void;
  onConfirmPasswordChange: (value: string) => void;
  onTogglePasswordVisible: () => void;
  onStartCreate: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onEditUser: (user: User) => void;
  onToggleUserActive: (user: User) => void;
  onDeleteUser: (user: User) => void;
  onCancelEdit: () => void;
  onUploadAvatar: (userId: string, file: File) => Promise<void>;
  currentUserId: string;
}) {
  const {
    users,
    userForm,
    confirmPassword,
    isPasswordVisible,
    userMessage,
    mode,
    onUserFormChange,
    onConfirmPasswordChange,
    onTogglePasswordVisible,
    onStartCreate,
    onSubmit,
    onEditUser,
    onToggleUserActive,
    onDeleteUser,
    onCancelEdit,
    onUploadAvatar,
    currentUserId,
  } = props;

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const editingUser = userForm.id ? users.find((account) => account.id === userForm.id) : undefined;

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !userForm.id) return;
    setAvatarError("");
    setIsUploadingAvatar(true);
    try {
      await onUploadAvatar(userForm.id, file);
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : "Não foi possível enviar a imagem.");
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  if (mode === "form") {
    return (
      <form className="panel user-form" onSubmit={onSubmit}>
        <div className="panel-heading">
          <div className="heading-with-back">
            <button type="button" className="icon-back-button" onClick={onCancelEdit} aria-label="Voltar para a lista">
              <ArrowLeft size={18} />
            </button>
            <h2>{userForm.id ? "Editar conta" : "Nova conta"}</h2>
          </div>
          <span>Login e perfil de acesso</span>
        </div>
        {userForm.id && (
          <div className="avatar-upload">
            <span className="avatar-upload-preview">
              <Avatar name={userForm.name} avatarUrl={editingUser?.avatarUrl ?? null} size={72} />
              <label className="avatar-upload-trigger" aria-label="Alterar foto do usuário">
                <Camera size={14} />
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarChange} disabled={isUploadingAvatar} />
              </label>
            </span>
            <div>
              <p className="avatar-upload-hint">{isUploadingAvatar ? "Enviando…" : "PNG, JPEG ou WEBP até 2 MB."}</p>
              {avatarError && <p className="form-error">{avatarError}</p>}
            </div>
          </div>
        )}
        <div className="form-grid">
          <label className="span-2">
            Usuário
            <input
              value={userForm.username}
              onChange={(event) => onUserFormChange({ ...userForm, username: event.target.value })}
              required
            />
          </label>
          <label className="span-2">
            Nome
            <input value={userForm.name} onChange={(event) => onUserFormChange({ ...userForm, name: event.target.value })} required />
          </label>
          <label className="span-2">
            E-mail
            <input
              type="email"
              value={userForm.email}
              onChange={(event) => onUserFormChange({ ...userForm, email: event.target.value })}
              required
            />
          </label>
          <label className="span-2">
            Perfil
            <select value={userForm.role} onChange={(event) => onUserFormChange({ ...userForm, role: event.target.value as UserRole })}>
              {roles.map((role) => (
                <option key={role}>{role}</option>
              ))}
            </select>
          </label>
          <div className="field-block span-2">
            <label htmlFor="account-password">Senha</label>
            <span className="password-field">
              <button
                type="button"
                aria-label={isPasswordVisible ? "Ocultar confirmação de senha" : "Visualizar confirmação de senha"}
                onClick={onTogglePasswordVisible}
              >
                {isPasswordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
              <input
                id="account-password"
                type={isPasswordVisible ? "text" : "password"}
                value={userForm.password}
                onChange={(event) => onUserFormChange({ ...userForm, password: event.target.value })}
                minLength={8}
                required
              />
            </span>
          </div>
          <div className="field-block span-2">
            <label htmlFor="account-password-confirmation">Confirmar senha</label>
            <span className="password-field">
              <button
                type="button"
                aria-label={isPasswordVisible ? "Ocultar senha" : "Visualizar senha"}
                onClick={onTogglePasswordVisible}
              >
                {isPasswordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
              <input
                id="account-password-confirmation"
                type={isPasswordVisible ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => onConfirmPasswordChange(event.target.value)}
                minLength={8}
                required
              />
            </span>
          </div>
          <label className="checkbox-label span-4">
            <input
              type="checkbox"
              checked={userForm.active}
              onChange={(event) => onUserFormChange({ ...userForm, active: event.target.checked })}
            />
            Conta ativa
          </label>
        </div>
        {userMessage && <p className="form-note">{userMessage}</p>}
        <div className="form-actions">
          <button className="primary-action" type="submit"><ShieldCheck size={18} /> Salvar conta</button>
          <button className="secondary-action" type="button" onClick={onCancelEdit}>
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <section className="users-layout-single">
      <div className="panel">
        <div className="panel-heading">
          <h2>Contas de login</h2>
          <div className="heading-actions">
            <span>{users.length} conta(s)</span>
            <button type="button" className="primary-action" onClick={onStartCreate}>
              <Plus size={17} /> Nova conta
            </button>
          </div>
        </div>
        {userMessage && <p className="form-note">{userMessage}</p>}
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Perfil</th>
                <th>Status</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {users.map((account) => (
                <tr key={account.id}>
                  <td><code>{account.username}</code></td>
                  <td>
                    <div className="row-identity">
                      <Avatar name={account.name} avatarUrl={account.avatarUrl} size={30} />
                      <strong>{account.name}</strong>
                    </div>
                  </td>
                  <td>{account.email}</td>
                  <td><span className="badge role-badge">{account.role}</span></td>
                  <td>
                    <span className={`badge ${account.active ? "account-active" : "account-inactive"}`}>
                      {account.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td>
                    <div className="row-icon-actions">
                      <button
                        type="button"
                        className="icon-row-button"
                        aria-label={`Editar ${account.name}`}
                        onClick={() => onEditUser(account)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        className="icon-row-button icon-row-button-danger"
                        aria-label={account.active ? `Desativar ${account.name}` : `Ativar ${account.name}`}
                        onClick={() => onToggleUserActive(account)}
                      >
                        {account.active ? <UserX size={15} /> : <UserCheck size={15} />}
                      </button>
                      {!account.isSystem && account.id !== currentUserId && (
                        <button
                          type="button"
                          className="icon-row-button icon-row-button-danger"
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
      </div>
    </section>
  );
}
