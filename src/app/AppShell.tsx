import { FormEvent, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getInitialTheme, resolveTheme, ThemeMode } from "./theme";
import { LoginView } from "./LoginView";
import { Sidebar, ShellView } from "./Sidebar";
import { generateUnitId } from "../features/units/model/rules";
import { Origin, Unit } from "../features/units/model/types";
import { UnitsView } from "../features/units/ui/UnitsView";
import {
  useDeleteUnitMutation,
  useSaveUnitMutation,
  useToggleUnitActiveMutation,
  useUnitsQuery,
} from "../features/units/model/queries";
import { UnitDraftInput } from "../features/units/schemas/schema";
import { Person } from "../features/people/model/types";
import { PeopleView } from "../features/people/ui/PeopleView";
import {
  useDeletePersonMutation,
  usePeopleQuery,
  useSavePersonMutation,
  useTogglePersonActiveMutation,
} from "../features/people/model/queries";
import { PersonDraftInput } from "../features/people/schemas/schema";
import { canPerform as canPerformDefault } from "../features/users/model/rules";
import { createUsersRepository } from "../features/users/api/repository";
import { onUnauthorized, setToken } from "../shared/api/apiClient";
import { Permission, User, UserRole } from "../features/users/model/types";
import { UsersView } from "../features/users/ui/UsersView";
import { UserDraftInput } from "../features/users/schemas/schema";
import { AccessProfilesView } from "../features/users/ui/AccessProfilesView";
import {
  useChangePasswordMutation,
  useDeleteUserMutation,
  useRolePermissionsQuery,
  useSaveUserMutation,
  useToggleUserActiveMutation,
  useUpdateProfileMutation,
  useUpdateRolePermissionsMutation,
  useUploadAvatarMutation,
  useUsersQuery,
} from "../features/users/model/queries";
import { filterRequests } from "../features/requests/model/rules";
import { CopyRequest, RequestDraft, RequestStatus } from "../features/requests/model/types";
import { RequestsView } from "../features/requests/ui/RequestsView";
import {
  useCreateRequestMutation,
  useDeleteHistoryEntryMutation,
  useDeleteRequestMutation,
  useRequestsQuery,
  useUpdateRequestMutation,
  useUpdateRequestStatusMutation,
} from "../features/requests/model/queries";
import { buildDashboardMetrics, getMonthlyConsolidation, getUnitConsumptionRanking, getUnitRanking } from "../features/reports/model/rules";
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
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeView, setActiveView] = useState<View>("dashboard");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "Todos">("Todos");
  const [originFilter, setOriginFilter] = useState<Origin | "Todas">("Todas");
  const [editingRequestId, setEditingRequestId] = useState("");
  const [isCreatingRequest, setIsCreatingRequest] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [editingUserId, setEditingUserId] = useState("");
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [userMessage, setUserMessage] = useState("");
  const [editingUnitId, setEditingUnitId] = useState("");
  const [isCreatingUnit, setIsCreatingUnit] = useState(false);
  const [unitMessage, setUnitMessage] = useState("");
  const [editingPersonId, setEditingPersonId] = useState("");
  const [isCreatingPerson, setIsCreatingPerson] = useState(false);
  const [personMessage, setPersonMessage] = useState("");

  // Estado do servidor via TanStack Query — cache, invalidação e
  // loading/error passam a ser gerenciados pela lib em vez de um `snapshot`
  // manual com refresh() disparado depois de cada mutação (ver docs/SPEC.md
  // §3.18: adoção completa do padrão de arquitetura frontend).
  const unitsQuery = useUnitsQuery(!!user);
  const peopleQuery = usePeopleQuery(!!user);
  const requestsQuery = useRequestsQuery(!!user);
  const usersQuery = useUsersQuery(!!user);
  const rolePermissionsQuery = useRolePermissionsQuery(!!user);
  const units = unitsQuery.data ?? [];
  const people = peopleQuery.data ?? [];
  const requests = requestsQuery.data ?? [];
  const users = usersQuery.data ?? [];
  const isLoadingSnapshot = unitsQuery.isLoading || peopleQuery.isLoading || requestsQuery.isLoading || usersQuery.isLoading;
  const snapshotError = unitsQuery.error ?? peopleQuery.error ?? requestsQuery.error ?? usersQuery.error;

  // Fonte de verdade das permissões passou a ser o backend (tabela
  // role_permissions, editável em Perfis de Acesso) em vez da constante
  // estática ROLE_PERMISSIONS. Faz shadow do `canPerform` importado para que
  // todos os ~20 call-sites já existentes no componente continuem
  // funcionando sem alteração, só que agora lendo dados ao vivo; enquanto a
  // query ainda não resolveu (ex.: logo após o login), cai para os valores
  // padrão estáticos como fallback.
  const rolePermissions = rolePermissionsQuery.data;
  function canPerform(role: UserRole, permission: Permission): boolean {
    if (rolePermissions) return (rolePermissions[role] ?? []).includes(permission);
    return canPerformDefault(role, permission);
  }

  const saveUnitMutation = useSaveUnitMutation();
  const toggleUnitActiveMutation = useToggleUnitActiveMutation();
  const deleteUnitMutation = useDeleteUnitMutation();
  const savePersonMutation = useSavePersonMutation();
  const togglePersonActiveMutation = useTogglePersonActiveMutation();
  const deletePersonMutation = useDeletePersonMutation();
  const createRequestMutation = useCreateRequestMutation();
  const updateRequestMutation = useUpdateRequestMutation();
  const deleteRequestMutation = useDeleteRequestMutation();
  const updateRequestStatusMutation = useUpdateRequestStatusMutation();
  const deleteHistoryEntryMutation = useDeleteHistoryEntryMutation();
  const saveUserMutation = useSaveUserMutation();
  const toggleUserActiveMutation = useToggleUserActiveMutation();
  const deleteUserMutation = useDeleteUserMutation();
  const uploadAvatarMutation = useUploadAvatarMutation();
  const updateProfileMutation = useUpdateProfileMutation();
  const changePasswordMutation = useChangePasswordMutation();
  const updateRolePermissionsMutation = useUpdateRolePermissionsMutation();

  const canManageAudit = Boolean(user && canPerform(user.role, "manageAudit"));
  const auditQuery = useAuditQuery(activeView === "audit" && canManageAudit);
  const auditEntries: AuditLogEntry[] = auditQuery.data ?? [];
  const clearAuditMutation = useClearAuditMutation();

  const unitIdsWithRequests = useMemo(() => new Set(requests.map((request) => request.unitId)), [requests]);
  const personIdsWithRequests = useMemo(() => {
    const requesterNames = new Set(requests.map((request) => request.requester.toLocaleLowerCase("pt-BR")));
    return new Set(people.filter((person) => requesterNames.has(person.name.toLocaleLowerCase("pt-BR"))).map((person) => person.id));
  }, [requests, people]);

  const metrics = useMemo(() => buildDashboardMetrics(requests), [requests]);
  const fullRanking = useMemo(() => getUnitRanking(requests), [requests]);
  const ranking = useMemo(() => fullRanking.slice(0, 6), [fullRanking]);
  const consumptionRanking = useMemo(() => getUnitConsumptionRanking(requests).slice(0, 6), [requests]);
  const monthly = useMemo(() => getMonthlyConsolidation(requests), [requests]);

  const filteredRequests = useMemo(
    () => filterRequests(requests, { query, status: statusFilter, origin: originFilter, unitId: "Todas" }),
    [originFilter, query, requests, statusFilter],
  );

  // Sem fallback pro primeiro item: o detalhe agora expande dentro da própria
  // linha da tabela (ver RequestsView), então "nada selecionado" deve
  // significar "nenhuma linha expandida", não "mostrar a primeira por padrão".
  const selectedRequest = requests.find((request) => request.id === selectedRequestId);

  const editingRequest = editingRequestId ? requests.find((request) => request.id === editingRequestId) : undefined;
  const editingUser = editingUserId ? users.find((account) => account.id === editingUserId) : undefined;
  const editingUnit = editingUnitId ? units.find((unit) => unit.id === editingUnitId) : undefined;
  const editingPerson = editingPersonId ? people.find((person) => person.id === editingPersonId) : undefined;

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

  // Sessão pode expirar/ser revogada no meio do uso (o token JWT tem prazo
  // de validade — ver backend Settings.ACCESS_TOKEN_EXPIRE_MINUTES) enquanto
  // a aba continua aberta. Sem isso, uma query em segundo plano (ex.:
  // dashboard) recebia 401 e só mostrava o texto cru do erro por cima da
  // tela ainda "logada", sem levar o usuário de volta ao login.
  useEffect(() => {
    return onUnauthorized(() => {
      setUser(null);
      queryClient.clear();
      setLoginError("Sessão expirada. Faça login novamente.");
    });
  }, [queryClient]);

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

  // Recolhe a linha expandida se ela sair da lista filtrada (ex.: usuário
  // trocou o filtro de status/origem/escola) — nunca expande a primeira por
  // padrão, já que "nada selecionado" agora significa "nada expandido".
  useEffect(() => {
    if (activeView !== "requests") return;
    if (selectedRequestId && !filteredRequests.some((request) => request.id === selectedRequestId)) {
      setSelectedRequestId("");
    }
  }, [activeView, filteredRequests, selectedRequestId]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoginError("");
    setIsLoggingIn(true);
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
    } finally {
      setIsLoggingIn(false);
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

  async function handleStatusChange(request: CopyRequest, status: RequestStatus, pickedUpBy?: string, signature?: string) {
    if (!user || !canPerform(user.role, "updateProduction")) return;
    await updateRequestStatusMutation.mutateAsync({
      id: request.id,
      status,
      pickedUpBy: pickedUpBy ?? request.pickedUpBy,
      signature: signature ?? request.signature,
    });
  }

  async function handleDeleteHistoryEntry(requestId: string, entryId: number) {
    if (!user || !canPerform(user.role, "updateProduction")) return;
    await deleteHistoryEntryMutation.mutateAsync({ requestId, entryId });
  }

  async function handleSaveUnit(values: UnitDraftInput) {
    if (!user || !canPerform(user.role, "manageUnits")) return;
    try {
      const id = editingUnitId || generateUnitId(values.name);
      const active = editingUnit ? editingUnit.active : true;
      const saved = await saveUnitMutation.mutateAsync({ ...values, id, active });
      setEditingUnitId("");
      setIsCreatingUnit(false);
      setUnitMessage(`Local ${saved.name} salvo.`);
    } catch (error) {
      setUnitMessage(error instanceof Error ? error.message : "Não foi possível salvar o local.");
    }
  }

  async function handleQuickCreateUnit(draft: { name: string; origin: Origin; contact?: string }): Promise<Unit> {
    return saveUnitMutation.mutateAsync({
      id: generateUnitId(draft.name),
      name: draft.name,
      origin: draft.origin,
      contact: draft.contact,
      active: true,
    });
  }

  function handleStartCreateUnit() {
    if (!user || !canPerform(user.role, "manageUnits")) return;
    setEditingUnitId("");
    setUnitMessage("");
    setIsCreatingUnit(true);
  }

  function handleEditUnit(selected: Unit) {
    setIsCreatingUnit(false);
    setEditingUnitId(selected.id);
    setUnitMessage("");
  }

  function handleCancelUnitEdit() {
    setEditingUnitId("");
    setIsCreatingUnit(false);
  }

  async function handleToggleUnitActive(selected: Unit) {
    if (!user || !canPerform(user.role, "manageUnits")) return;
    await toggleUnitActiveMutation.mutateAsync({ id: selected.id, active: !selected.active });
    setUnitMessage(`${selected.name} ${selected.active ? "desativado" : "ativado"}.`);
  }

  async function handleDeleteUnit(selected: Unit) {
    if (!user || !canPerform(user.role, "manageUnits")) return;
    try {
      await deleteUnitMutation.mutateAsync(selected.id);
      setUnitMessage(`Local ${selected.name} excluído.`);
    } catch (error) {
      setUnitMessage(error instanceof Error ? error.message : "Não foi possível excluir o local.");
    }
  }

  async function handleSavePerson(values: PersonDraftInput) {
    if (!user || !canPerform(user.role, "manageUnits")) return;
    try {
      const id = editingPersonId || generateUnitId(`${values.name}-${values.unitId}`);
      const saved = await savePersonMutation.mutateAsync({ ...values, id });
      setEditingPersonId("");
      setIsCreatingPerson(false);
      setPersonMessage(`Pessoa ${saved.name} salva.`);
    } catch (error) {
      setPersonMessage(error instanceof Error ? error.message : "Não foi possível salvar a pessoa.");
    }
  }

  async function handleQuickCreatePerson(draft: { name: string; registrationNumber: string; phone: string; unitId: string }): Promise<Person> {
    return savePersonMutation.mutateAsync({
      id: generateUnitId(`${draft.name}-${draft.unitId}`),
      name: draft.name,
      registrationNumber: draft.registrationNumber,
      phone: draft.phone,
      unitId: draft.unitId,
    });
  }

  function handleStartCreatePerson() {
    if (!user || !canPerform(user.role, "manageUnits")) return;
    setEditingPersonId("");
    setPersonMessage("");
    setIsCreatingPerson(true);
  }

  function handleEditPerson(selected: Person) {
    setIsCreatingPerson(false);
    setEditingPersonId(selected.id);
    setPersonMessage("");
  }

  function handleCancelPersonEdit() {
    setEditingPersonId("");
    setIsCreatingPerson(false);
  }

  async function handleTogglePersonActive(selected: Person) {
    if (!user || !canPerform(user.role, "manageUnits")) return;
    await togglePersonActiveMutation.mutateAsync({ id: selected.id, active: !selected.active });
    setPersonMessage(`${selected.name} ${selected.active ? "desativada" : "ativada"}.`);
  }

  async function handleDeletePerson(selected: Person) {
    if (!user || !canPerform(user.role, "manageUnits")) return;
    try {
      await deletePersonMutation.mutateAsync(selected.id);
      setPersonMessage(`Pessoa ${selected.name} excluída.`);
    } catch (error) {
      setPersonMessage(error instanceof Error ? error.message : "Não foi possível excluir a pessoa.");
    }
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
    // Confirmação já aconteceu no ConfirmModal da UsersView antes de chamar
    // isto — aqui só resta a checagem de autorização e a chamada real.
    if (!user || !canPerform(user.role, "manageUsers")) return;
    if (selected.id === user.id) {
      setUserMessage("A conta em uso não pode ser excluída.");
      return;
    }
    if (selected.isSystem) {
      setUserMessage("Esta é uma conta do sistema e não pode ser excluída.");
      return;
    }

    try {
      await deleteUserMutation.mutateAsync(selected.id);
      setUserMessage(`Conta de ${selected.name} excluída.`);
    } catch (error) {
      setUserMessage(error instanceof Error ? error.message : "Não foi possível excluir a conta.");
    }
  }

  async function handleUploadAvatar(userId: string, file: File) {
    if (!user) return;
    // Qualquer conta troca a própria foto (tela "Minha conta"); trocar a foto
    // de outra pessoa continua exigindo manageUsers, como no backend.
    if (userId !== user.id && !canPerform(user.role, "manageUsers")) return;
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
    return <LoginView theme={resolvedTheme} loginError={loginError} isSubmitting={isLoggingIn} onSubmit={handleLogin} />;
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
        onUploadAvatar={handleUploadAvatar}
      />

      <main className="min-w-0 flex-1 overflow-x-hidden bg-page p-[18px] sm:p-7">
        <header className="mb-[22px] flex flex-col items-start gap-4 print:hidden sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="m-1 mb-2 text-[clamp(1.6rem,3.2vw,2.4rem)] font-bold leading-none text-text">
              {activeView === "dashboard" ? "Visão geral" : activeView === "requests" ? "Solicitações" : activeView === "units" ? "Locais" : activeView === "people" ? "Pessoas" : activeView === "users" ? "Usuários e perfis" : activeView === "profiles" ? "Perfis de acesso" : "Auditoria"}
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
                consumptionRanking={consumptionRanking}
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
                people={people}
                users={users}
                filteredRequests={filteredRequests}
                selectedRequest={selectedRequest}
                onSelectRequest={setSelectedRequestId}
                query={query}
                onQueryChange={setQuery}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                originFilter={originFilter}
                onOriginFilterChange={setOriginFilter}
                mode={isCreatingRequest || editingRequestId ? "form" : "list"}
                editingRequest={editingRequest}
                canEdit={canPerform(user.role, "editRequests")}
                canCreate={canPerform(user.role, "createRequests")}
                canUpdateProduction={canPerform(user.role, "updateProduction")}
                canManageUnits={canPerform(user.role, "manageUnits")}
                currentUserName={user.name}
                onStartCreate={handleStartCreateRequest}
                onSubmit={handleSubmitRequest}
                onEditRequest={handleEditRequest}
                onCancelEdit={handleCancelRequestEdit}
                onDeleteRequest={handleDeleteRequest}
                onStatusChange={handleStatusChange}
                onDeleteHistoryEntry={handleDeleteHistoryEntry}
                onCreateUnit={handleQuickCreateUnit}
                onCreatePerson={handleQuickCreatePerson}
              />
            )}

            {activeView === "units" && (
              <UnitsView
                units={units}
                unitIdsWithRequests={unitIdsWithRequests}
                editingUnit={editingUnit}
                unitMessage={unitMessage}
                mode={isCreatingUnit || editingUnitId ? "form" : "list"}
                canManage={canPerform(user.role, "manageUnits")}
                onStartCreate={handleStartCreateUnit}
                onSubmit={handleSaveUnit}
                onEditUnit={handleEditUnit}
                onToggleUnitActive={handleToggleUnitActive}
                onDeleteUnit={handleDeleteUnit}
                onCancelEdit={handleCancelUnitEdit}
              />
            )}

            {activeView === "people" && (
              <PeopleView
                people={people}
                units={units}
                personIdsWithRequests={personIdsWithRequests}
                editingPerson={editingPerson}
                personMessage={personMessage}
                mode={isCreatingPerson || editingPersonId ? "form" : "list"}
                canManage={canPerform(user.role, "manageUnits")}
                onStartCreate={handleStartCreatePerson}
                onSubmit={handleSavePerson}
                onEditPerson={handleEditPerson}
                onTogglePersonActive={handleTogglePersonActive}
                onDeletePerson={handleDeletePerson}
                onCancelEdit={handleCancelPersonEdit}
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

            {activeView === "profiles" && canPerform(user.role, "manageUsers") && (
              <AccessProfilesView currentUserRole={user.role} />
            )}

            {activeView === "audit" && canManageAudit && (
              <AuditView entries={auditEntries} canClear={canManageAudit} onClear={handleClearAudit} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
