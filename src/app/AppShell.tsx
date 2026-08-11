import { FormEvent, useEffect, useMemo, useState } from "react";
import { getInitialTheme, resolveTheme, ThemeMode } from "./theme";
import { LoginView } from "./LoginView";
import { Sidebar, ShellView } from "./Sidebar";
import { generateUnitId } from "../features/units/model/rules";
import { Origin } from "../features/units/model/types";
import { UnitsView } from "../features/units/ui/UnitsView";
import { useSaveUnitMutation, useUnitsQuery } from "../features/units/model/queries";
import { UnitDraftInput } from "../features/units/schemas/schema";
import { canPerform } from "../features/users/model/rules";
import { createUsersRepository } from "../features/users/api/repository";
import { setToken } from "../shared/api/apiClient";
import { User } from "../features/users/model/types";
import { UsersView } from "../features/users/ui/UsersView";
import { UserDraftInput } from "../features/users/schemas/schema";
import { AccessProfilesView } from "../features/users/ui/AccessProfilesView";
import {
  useChangePasswordMutation,
  useDeleteUserMutation,
  useSaveUserMutation,
  useToggleUserActiveMutation,
  useUpdateProfileMutation,
  useUploadAvatarMutation,
  useUsersQuery,
} from "../features/users/model/queries";
import { filterRequests } from "../features/requests/model/rules";
import { CopyRequest, RequestDraft, RequestStatus } from "../features/requests/model/types";
import { RequestsView } from "../features/requests/ui/RequestsView";
import {
  useCreateRequestMutation,
  useDeleteRequestMutation,
  useRequestsQuery,
  useUpdateRequestMutation,
  useUpdateRequestStatusMutation,
} from "../features/requests/model/queries";
import { buildDashboardMetrics, getMonthlyConsolidation, getUnitRanking } from "../features/reports/model/rules";
import { DashboardView } from "../features/reports/ui/DashboardView";
import { AuditLogEntry } from "../features/audit/model/types";
import { AuditView } from "../features/audit/ui/AuditView";
import { useAuditQuery, useClearAuditMutation } from "../features/audit/model/queries";

// Autenticação continua fora do TanStack Query — login/sessão não é "estado
// do servidor" cacheável do mesmo jeito que listas de domínio, e usersRepo
// já encapsula setToken()/localStorage por conta própria (ver §3.13/3.14).
const usersRepo = createUsersRepository();

type View = ShellView;

const THEME_STORAGE_KEY = "grafica.semed.theme";

export function AppShell() {
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme(window.localStorage.getItem(THEME_STORAGE_KEY)));
  const [prefersDark, setPrefersDark] = useState(() => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false);
  const resolvedTheme = resolveTheme(theme, prefersDark);
  const [user, setUser] = useState<User | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [loginError, setLoginError] = useState("");
  const [activeView, setActiveView] = useState<View>("dashboard");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "Todos">("Todos");
  const [originFilter, setOriginFilter] = useState<Origin | "Todas">("Todas");
  const [schoolFilter, setSchoolFilter] = useState<string>("Todas");
  const [editingRequestId, setEditingRequestId] = useState("");
  const [isCreatingRequest, setIsCreatingRequest] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [editingUserId, setEditingUserId] = useState("");
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [userMessage, setUserMessage] = useState("");

  // Estado do servidor via TanStack Query — cache, invalidação e
  // loading/error passam a ser gerenciados pela lib em vez de um `snapshot`
  // manual com refresh() disparado depois de cada mutação (ver docs/SPEC.md
  // §3.18: adoção completa do padrão de arquitetura frontend).
  const unitsQuery = useUnitsQuery();
  const requestsQuery = useRequestsQuery();
  const usersQuery = useUsersQuery();
  const units = unitsQuery.data ?? [];
  const requests = requestsQuery.data ?? [];
  const users = usersQuery.data ?? [];
  const isLoadingSnapshot = unitsQuery.isLoading || requestsQuery.isLoading || usersQuery.isLoading;
  const snapshotError = unitsQuery.error ?? requestsQuery.error ?? usersQuery.error;

  const saveUnitMutation = useSaveUnitMutation();
  const createRequestMutation = useCreateRequestMutation();
  const updateRequestMutation = useUpdateRequestMutation();
  const deleteRequestMutation = useDeleteRequestMutation();
  const updateRequestStatusMutation = useUpdateRequestStatusMutation();
  const saveUserMutation = useSaveUserMutation();
  const toggleUserActiveMutation = useToggleUserActiveMutation();
  const deleteUserMutation = useDeleteUserMutation();
  const uploadAvatarMutation = useUploadAvatarMutation();
  const updateProfileMutation = useUpdateProfileMutation();
  const changePasswordMutation = useChangePasswordMutation();

  const canManageAudit = Boolean(user && canPerform(user.role, "manageAudit"));
  const auditQuery = useAuditQuery(activeView === "audit" && canManageAudit);
  const auditEntries: AuditLogEntry[] = auditQuery.data ?? [];
  const clearAuditMutation = useClearAuditMutation();

  const metrics = useMemo(() => buildDashboardMetrics(requests), [requests]);
  const fullRanking = useMemo(() => getUnitRanking(requests), [requests]);
  const ranking = useMemo(() => fullRanking.slice(0, 6), [fullRanking]);
  const monthly = useMemo(() => getMonthlyConsolidation(requests), [requests]);

  const filteredRequests = useMemo(
    () => filterRequests(requests, { query, status: statusFilter, origin: originFilter, unitId: schoolFilter }),
    [originFilter, query, requests, schoolFilter, statusFilter],
  );

  const selectedRequest =
    requests.find((request) => request.id === selectedRequestId) ??
    (activeView === "requests" ? filteredRequests[0] : requests[0]);

  const editingRequest = editingRequestId ? requests.find((request) => request.id === editingRequestId) : undefined;
  const editingUser = editingUserId ? users.find((account) => account.id === editingUserId) : undefined;

  useEffect(() => {
    usersRepo
      .restoreSession()
      .then((restored) => {
        if (restored) setUser(restored);
      })
      .catch(() => {})
      .finally(() => setIsRestoringSession(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (!window.matchMedia) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => setPrefersDark(event.matches);
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (activeView !== "requests") return;
    if (!filteredRequests.length) {
      setSelectedRequestId("");
      return;
    }
    if (!filteredRequests.some((request) => request.id === selectedRequestId)) {
      setSelectedRequestId(filteredRequests[0].id);
    }
  }, [activeView, filteredRequests, selectedRequestId]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoginError("");
    try {
      const authenticated = await usersRepo.authenticate(
        String(form.get("email")),
        String(form.get("password")),
        form.get("remember") === "on",
      );
      if (!authenticated) {
        setLoginError("E-mail ou senha inválidos.");
        return;
      }
      setUser(authenticated);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Não foi possível entrar.");
    }
  }

  async function handleSubmitRequest(values: RequestDraft) {
    if (!user || !canPerform(user.role, "createRequests")) return;

    if (editingRequestId) {
      const updated = await updateRequestMutation.mutateAsync({ id: editingRequestId, draft: values });
      if (updated) {
        setSelectedRequestId(updated.id);
      }
      setEditingRequestId("");
      setIsCreatingRequest(false);
      return;
    }

    const created = await createRequestMutation.mutateAsync(values);
    setSelectedRequestId(created.id);
    setIsCreatingRequest(false);
  }

  function handleStartCreateRequest() {
    if (!user || !canPerform(user.role, "createRequests")) return;
    setEditingRequestId("");
    setIsCreatingRequest(true);
  }

  function handleEditRequest(request: CopyRequest) {
    if (!user || !canPerform(user.role, "editRequests")) return;
    setIsCreatingRequest(false);
    setEditingRequestId(request.id);
  }

  function handleCancelRequestEdit() {
    setEditingRequestId("");
    setIsCreatingRequest(false);
  }

  async function handleDeleteRequest(request: CopyRequest) {
    if (!user || !canPerform(user.role, "editRequests")) return;
    await deleteRequestMutation.mutateAsync(request.id);
    if (editingRequestId === request.id) {
      handleCancelRequestEdit();
    }
  }

  async function handleStatusChange(request: CopyRequest, status: RequestStatus) {
    if (!user || !canPerform(user.role, "updateProduction")) return;
    await updateRequestStatusMutation.mutateAsync({ id: request.id, status, pickedUpBy: request.pickedUpBy });
  }

  async function handleSaveUnit(values: UnitDraftInput) {
    if (!user || !canPerform(user.role, "manageUnits")) return;
    const id = generateUnitId(values.name);
    await saveUnitMutation.mutateAsync({ ...values, id, active: true });
  }

  async function handleSaveUser(values: UserDraftInput) {
    if (!user || !canPerform(user.role, "manageUsers")) return;

    const { confirmPassword: _confirmPassword, ...draft } = values;
    try {
      const saved = await saveUserMutation.mutateAsync({ id: editingUserId || undefined, ...draft });
      setEditingUserId("");
      setIsCreatingUser(false);
      setUserMessage(`Conta de ${saved.name} salva.`);
    } catch (error) {
      setUserMessage(error instanceof Error ? error.message : "Não foi possível salvar a conta.");
    }
  }

  function handleStartCreateUser() {
    if (!user || !canPerform(user.role, "manageUsers")) return;
    setEditingUserId("");
    setUserMessage("");
    setIsCreatingUser(true);
  }

  function handleEditUser(selected: User) {
    setIsCreatingUser(false);
    setEditingUserId(selected.id);
    setUserMessage("");
  }

  async function handleToggleUserActive(selected: User) {
    if (!user || !canPerform(user.role, "manageUsers")) return;
    if (selected.id === user.id && selected.active) {
      setUserMessage("A conta em uso não pode ser desativada.");
      return;
    }

    await toggleUserActiveMutation.mutateAsync({ id: selected.id, active: !selected.active });
    setUserMessage(`${selected.name} ${selected.active ? "desativado" : "ativado"}.`);
  }

  async function handleDeleteUser(selected: User) {
    if (!user || !canPerform(user.role, "manageUsers")) return;
    if (selected.id === user.id) {
      setUserMessage("A conta em uso não pode ser excluída.");
      return;
    }
    if (selected.isSystem) {
      setUserMessage("Esta é uma conta do sistema e não pode ser excluída.");
      return;
    }
    const confirmed = window.confirm(`Excluir a conta de ${selected.name}? Essa ação não pode ser desfeita.`);
    if (!confirmed) return;

    try {
      await deleteUserMutation.mutateAsync(selected.id);
      setUserMessage(`Conta de ${selected.name} excluída.`);
    } catch (error) {
      setUserMessage(error instanceof Error ? error.message : "Não foi possível excluir a conta.");
    }
  }

  async function handleUploadAvatar(userId: string, file: File) {
    if (!user || !canPerform(user.role, "manageUsers")) return;
    const updated = await uploadAvatarMutation.mutateAsync({ id: userId, file });
    if (updated.id === user.id) {
      setUser(updated);
    }
  }

  function handleCancelUserEdit() {
    setEditingUserId("");
    setIsCreatingUser(false);
    setUserMessage("");
  }

  async function handleUpdateProfile(payload: { name: string; email: string }) {
    if (!user) return;
    const updated = await updateProfileMutation.mutateAsync(payload);
    setUser(updated);
  }

  async function handleChangePassword(payload: { currentPassword: string; newPassword: string }) {
    if (!user) return;
    const updated = await changePasswordMutation.mutateAsync({
      name: user.name,
      email: user.email,
      currentPassword: payload.currentPassword,
      newPassword: payload.newPassword,
    });
    setUser(updated);
  }

  async function handleClearAudit() {
    if (!user || !canPerform(user.role, "manageAudit")) return;
    const confirmed = window.confirm("Limpar todo o log de auditoria? Essa ação não pode ser desfeita.");
    if (!confirmed) return;
    await clearAuditMutation.mutateAsync();
  }

  if (isRestoringSession) {
    return <div id="theme-root" className="theme-root" data-theme={resolvedTheme} />;
  }

  if (!user) {
    return <LoginView theme={resolvedTheme} loginError={loginError} onSubmit={handleLogin} />;
  }

  return (
    <div id="theme-root" className="theme-root flex min-h-screen" data-theme={resolvedTheme}>
      <Sidebar
        activeView={activeView}
        onChangeView={setActiveView}
        canManageUsers={canPerform(user.role, "manageUsers")}
        canManageAudit={canManageAudit}
        user={user}
        theme={theme}
        onChangeTheme={setTheme}
        onLogout={() => {
          setToken(null);
          setUser(null);
        }}
        onUpdateProfile={handleUpdateProfile}
        onChangePassword={handleChangePassword}
      />

      <main className="min-w-0 flex-1 overflow-x-hidden bg-page p-[18px] sm:p-7">
        <header className="mb-[22px] flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="m-0 text-xs font-extrabold uppercase tracking-wide text-accent">Sistema de controle de cópias</p>
            <h1 className="m-1 mb-2 text-[clamp(2rem,4vw,3rem)] font-bold leading-none text-text">
              {activeView === "dashboard" ? "Visão geral" : activeView === "requests" ? "Solicitações" : activeView === "units" ? "Unidades e setores" : activeView === "users" ? "Usuários e perfis" : activeView === "profiles" ? "Perfis de acesso" : "Auditoria"}
            </h1>
          </div>
        </header>

        {snapshotError && <p className="m-0 mb-4 font-bold text-[#a43b2f]">{snapshotError instanceof Error ? snapshotError.message : "Não foi possível carregar os dados do servidor."}</p>}

        {isLoadingSnapshot ? (
          <p className="text-text">Carregando dados…</p>
        ) : (
          <>
            {activeView === "dashboard" && (
              <DashboardView
                metrics={metrics}
                ranking={ranking}
                monthly={monthly}
                fullRanking={fullRanking}
                recentRequests={requests.slice(0, 5)}
                onSelectRequest={(id) => {
                  setSelectedRequestId(id);
                  setActiveView("requests");
                }}
              />
            )}

            {activeView === "requests" && (
              <RequestsView
                units={units}
                filteredRequests={filteredRequests}
                selectedRequest={selectedRequest}
                onSelectRequest={setSelectedRequestId}
                query={query}
                onQueryChange={setQuery}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                originFilter={originFilter}
                onOriginFilterChange={setOriginFilter}
                schoolFilter={schoolFilter}
                onSchoolFilterChange={setSchoolFilter}
                mode={isCreatingRequest || editingRequestId ? "form" : "list"}
                editingRequest={editingRequest}
                canEdit={canPerform(user.role, "editRequests")}
                canCreate={canPerform(user.role, "createRequests")}
                canUpdateProduction={canPerform(user.role, "updateProduction")}
                onStartCreate={handleStartCreateRequest}
                onSubmit={handleSubmitRequest}
                onEditRequest={handleEditRequest}
                onCancelEdit={handleCancelRequestEdit}
                onDeleteRequest={handleDeleteRequest}
                onStatusChange={handleStatusChange}
              />
            )}

            {activeView === "units" && (
              <UnitsView
                units={units}
                canManage={canPerform(user.role, "manageUnits")}
                onSubmit={handleSaveUnit}
              />
            )}

            {activeView === "users" && canPerform(user.role, "manageUsers") && (
              <UsersView
                users={users}
                editingUser={editingUser}
                userMessage={userMessage}
                mode={isCreatingUser || editingUserId ? "form" : "list"}
                onStartCreate={handleStartCreateUser}
                onSubmit={handleSaveUser}
                onEditUser={handleEditUser}
                onToggleUserActive={handleToggleUserActive}
                onDeleteUser={handleDeleteUser}
                onCancelEdit={handleCancelUserEdit}
                onUploadAvatar={handleUploadAvatar}
                currentUserId={user.id}
              />
            )}

            {activeView === "profiles" && canPerform(user.role, "manageUsers") && <AccessProfilesView />}

            {activeView === "audit" && canManageAudit && (
              <AuditView entries={auditEntries} canClear={canManageAudit} onClear={handleClearAudit} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
