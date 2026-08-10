import { FormEvent, useEffect, useMemo, useState } from "react";
import { getInitialTheme, getNextTheme, ThemeMode } from "./theme";
import { LoginView } from "./LoginView";
import { Sidebar, ShellView } from "./Sidebar";
import { generateUnitId } from "../domains/units/rules";
import { createUnitsRepository } from "../domains/units/repository";
import { Origin, Unit } from "../domains/units/types";
import { UnitsView } from "../domains/units/UnitsView";
import { canPerform } from "../domains/users/rules";
import { createUsersRepository } from "../domains/users/repository";
import { User, UserDraft } from "../domains/users/types";
import { UsersView } from "../domains/users/UsersView";
import { calculatePrintTotals, emptyDraft, filterRequests, requestToDraft } from "../domains/requests/rules";
import { createRequestsRepository } from "../domains/requests/repository";
import { CopyRequest, RequestDraft, RequestStatus } from "../domains/requests/types";
import { RequestsView } from "../domains/requests/RequestsView";
import { buildDashboardMetrics, getMonthlyConsolidation, getUnitRanking } from "../domains/reports/rules";
import { DashboardView } from "../domains/reports/DashboardView";
import { createAuditRepository } from "../domains/audit/repository";
import { AuditLogEntry } from "../domains/audit/types";
import { AuditView } from "../domains/audit/AuditView";

const unitsRepo = createUnitsRepository();
const usersRepo = createUsersRepository();
const requestsRepo = createRequestsRepository();
const auditRepo = createAuditRepository();

type View = ShellView;

interface Snapshot {
  units: Unit[];
  requests: CopyRequest[];
  users: User[];
}

const emptySnapshot: Snapshot = { units: [], requests: [], users: [] };

const THEME_STORAGE_KEY = "grafica.semed.theme";

const emptyUserDraft: UserDraft = {
  name: "",
  email: "",
  password: "",
  role: "Consulta",
  active: true,
};

export function AppShell() {
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const [hasLoadedSnapshot, setHasLoadedSnapshot] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [theme, setTheme] = useState<ThemeMode>(() =>
    getInitialTheme(
      window.localStorage.getItem(THEME_STORAGE_KEY),
      window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false,
    ),
  );
  const [user, setUser] = useState<User | null>(null);
  const [loginError, setLoginError] = useState("");
  const [activeView, setActiveView] = useState<View>("dashboard");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "Todos">("Todos");
  const [originFilter, setOriginFilter] = useState<Origin | "Todas">("Todas");
  const [schoolFilter, setSchoolFilter] = useState<string>("Todas");
  const [draft, setDraft] = useState<RequestDraft>(emptyDraft);
  const [editingRequestId, setEditingRequestId] = useState("");
  const [isCreatingRequest, setIsCreatingRequest] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [unitForm, setUnitForm] = useState<Omit<Unit, "active">>({
    id: "",
    code: "",
    name: "",
    origin: "Escola",
  });
  const [userForm, setUserForm] = useState<UserDraft>(emptyUserDraft);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isAccountPasswordVisible, setIsAccountPasswordVisible] = useState(false);
  const [userMessage, setUserMessage] = useState("");
  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>([]);

  const metrics = useMemo(() => buildDashboardMetrics(snapshot.requests), [snapshot.requests]);
  const fullRanking = useMemo(() => getUnitRanking(snapshot.requests), [snapshot.requests]);
  const ranking = useMemo(() => fullRanking.slice(0, 6), [fullRanking]);
  const monthly = useMemo(() => getMonthlyConsolidation(snapshot.requests), [snapshot.requests]);
  const draftTotals = calculatePrintTotals(draft);

  const filteredRequests = useMemo(
    () => filterRequests(snapshot.requests, { query, status: statusFilter, origin: originFilter, unitId: schoolFilter }),
    [originFilter, query, schoolFilter, snapshot.requests, statusFilter],
  );

  const selectedRequest =
    snapshot.requests.find((request) => request.id === selectedRequestId) ??
    (activeView === "requests" ? filteredRequests[0] : snapshot.requests[0]);

  async function refresh(): Promise<Snapshot> {
    try {
      const [units, requests, users] = await Promise.all([
        unitsRepo.getUnits(),
        requestsRepo.getRequests(),
        usersRepo.getUsers(),
      ]);
      const next = { units, requests, users };
      setSnapshot(next);
      setHasLoadedSnapshot(true);
      setLoadError("");
      return next;
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Não foi possível carregar os dados do servidor.");
      throw error;
    }
  }

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (user) {
      void refresh().catch(() => {});
    } else {
      setSnapshot(emptySnapshot);
      setHasLoadedSnapshot(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (activeView === "audit" && user && canPerform(user.role, "manageAudit")) {
      void auditRepo.getEntries().then(setAuditEntries).catch(() => {});
    }
  }, [activeView, user]);

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

  function toggleTheme() {
    setTheme((current) => getNextTheme(current));
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoginError("");
    try {
      const authenticated = await usersRepo.authenticate(String(form.get("email")), String(form.get("password")));
      if (!authenticated) {
        setLoginError("E-mail ou senha inválidos.");
        return;
      }
      setUser(authenticated);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Não foi possível entrar.");
    }
  }

  async function handleCreateRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !canPerform(user.role, "createRequests")) return;

    if (editingRequestId) {
      const updated = await requestsRepo.updateRequest(editingRequestId, draft);
      await refresh();
      if (updated) {
        setSelectedRequestId(updated.id);
      }
      setEditingRequestId("");
      setIsCreatingRequest(false);
      setDraft({ ...emptyDraft, unitId: snapshot.units.find((unit) => unit.origin === "Escola")?.id ?? "" });
      return;
    }

    const created = await requestsRepo.createRequest(draft);
    await refresh();
    setSelectedRequestId(created.id);
    setIsCreatingRequest(false);
    setDraft({ ...emptyDraft, unitId: snapshot.units.find((unit) => unit.origin === "Escola")?.id ?? "" });
  }

  function handleStartCreateRequest() {
    if (!user || !canPerform(user.role, "createRequests")) return;
    setEditingRequestId("");
    setDraft({ ...emptyDraft, unitId: snapshot.units.find((unit) => unit.origin === "Escola")?.id ?? "" });
    setIsCreatingRequest(true);
  }

  function handleEditRequest(request: CopyRequest) {
    if (!user || !canPerform(user.role, "editRequests")) return;
    setIsCreatingRequest(false);
    setEditingRequestId(request.id);
    setDraft(requestToDraft(request));
  }

  function handleCancelRequestEdit() {
    setEditingRequestId("");
    setIsCreatingRequest(false);
    setDraft({ ...emptyDraft, unitId: snapshot.units.find((unit) => unit.origin === "Escola")?.id ?? "" });
  }

  async function handleDeleteRequest(request: CopyRequest) {
    if (!user || !canPerform(user.role, "editRequests")) return;
    await requestsRepo.deleteRequest(request.id);
    const next = await refresh();
    setSelectedRequestId(next.requests[0]?.id ?? "");
    if (editingRequestId === request.id) {
      handleCancelRequestEdit();
    }
  }

  async function handleStatusChange(request: CopyRequest, status: RequestStatus) {
    if (!user || !canPerform(user.role, "updateProduction")) return;
    await requestsRepo.updateStatus(request.id, status, request.pickedUpBy);
    await refresh();
  }

  async function handleSaveUnit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !canPerform(user.role, "manageUnits")) return;
    const id = unitForm.id || generateUnitId(unitForm.name);
    await unitsRepo.saveUnit({ ...unitForm, id, active: true });
    setUnitForm({ id: "", code: "", name: "", origin: "Escola" });
    await refresh();
  }

  async function handleSaveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !canPerform(user.role, "manageUsers")) return;

    if (userForm.password !== confirmPassword) {
      setUserMessage("As senhas não conferem.");
      return;
    }

    try {
      const saved = await usersRepo.saveUser(userForm);
      await refresh();
      setUserForm(emptyUserDraft);
      setConfirmPassword("");
      setIsAccountPasswordVisible(false);
      setIsCreatingUser(false);
      setUserMessage(`Conta de ${saved.name} salva.`);
    } catch (error) {
      setUserMessage(error instanceof Error ? error.message : "Não foi possível salvar a conta.");
    }
  }

  function handleStartCreateUser() {
    if (!user || !canPerform(user.role, "manageUsers")) return;
    setUserForm(emptyUserDraft);
    setConfirmPassword("");
    setIsAccountPasswordVisible(false);
    setUserMessage("");
    setIsCreatingUser(true);
  }

  function handleEditUser(selected: User) {
    setIsCreatingUser(false);
    setUserForm({
      id: selected.id,
      name: selected.name,
      email: selected.email,
      password: "",
      role: selected.role,
      active: selected.active,
    });
    setConfirmPassword("");
    setUserMessage("");
  }

  async function handleToggleUserActive(selected: User) {
    if (!user || !canPerform(user.role, "manageUsers")) return;
    if (selected.id === user.id && selected.active) {
      setUserMessage("A conta em uso não pode ser desativada.");
      return;
    }

    await usersRepo.toggleUserActive(selected.id, !selected.active);
    await refresh();
    setUserMessage(`${selected.name} ${selected.active ? "desativado" : "ativado"}.`);
  }

  async function handleUploadAvatar(userId: string, file: File) {
    if (!user || !canPerform(user.role, "manageUsers")) return;
    const updated = await usersRepo.uploadAvatar(userId, file);
    await refresh();
    if (updated.id === user.id) {
      setUser(updated);
    }
  }

  function handleCancelUserEdit() {
    setUserForm(emptyUserDraft);
    setConfirmPassword("");
    setIsAccountPasswordVisible(false);
    setIsCreatingUser(false);
    setUserMessage("");
  }

  async function handleClearAudit() {
    if (!user || !canPerform(user.role, "manageAudit")) return;
    const confirmed = window.confirm("Limpar todo o log de auditoria? Essa ação não pode ser desfeita.");
    if (!confirmed) return;
    await auditRepo.clear();
    setAuditEntries([]);
  }

  if (!user) {
    return <LoginView theme={theme} loginError={loginError} onSubmit={handleLogin} />;
  }

  return (
    <div className="app-shell theme-root" data-theme={theme}>
      <Sidebar
        activeView={activeView}
        onChangeView={setActiveView}
        canManageUsers={canPerform(user.role, "manageUsers")}
        canManageAudit={canPerform(user.role, "manageAudit")}
        user={user}
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogout={() => setUser(null)}
      />

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Sistema de controle de cópias</p>
            <h1>{activeView === "dashboard" ? "Visão geral" : activeView === "requests" ? "Solicitações" : activeView === "units" ? "Unidades e setores" : activeView === "users" ? "Usuários e perfis" : "Auditoria"}</h1>
          </div>
        </header>

        {loadError && <p className="form-error">{loadError}</p>}

        {!hasLoadedSnapshot ? (
          <p>Carregando dados…</p>
        ) : (
          <>
            {activeView === "dashboard" && (
              <DashboardView
                metrics={metrics}
                ranking={ranking}
                monthly={monthly}
                fullRanking={fullRanking}
                recentRequests={snapshot.requests.slice(0, 5)}
                onSelectRequest={(id) => {
                  setSelectedRequestId(id);
                  setActiveView("requests");
                }}
              />
            )}

            {activeView === "requests" && (
              <RequestsView
                units={snapshot.units}
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
                draft={draft}
                onDraftChange={setDraft}
                draftTotals={draftTotals}
                mode={isCreatingRequest || editingRequestId ? "form" : "list"}
                editingRequestId={editingRequestId}
                canEdit={canPerform(user.role, "editRequests")}
                canCreate={canPerform(user.role, "createRequests")}
                canUpdateProduction={canPerform(user.role, "updateProduction")}
                onStartCreate={handleStartCreateRequest}
                onSubmit={handleCreateRequest}
                onEditRequest={handleEditRequest}
                onCancelEdit={handleCancelRequestEdit}
                onDeleteRequest={handleDeleteRequest}
                onStatusChange={handleStatusChange}
              />
            )}

            {activeView === "units" && (
              <UnitsView
                units={snapshot.units}
                canManage={canPerform(user.role, "manageUnits")}
                unitForm={unitForm}
                onUnitFormChange={setUnitForm}
                onSubmit={handleSaveUnit}
              />
            )}

            {activeView === "users" && canPerform(user.role, "manageUsers") && (
              <UsersView
                users={snapshot.users}
                userForm={userForm}
                confirmPassword={confirmPassword}
                isPasswordVisible={isAccountPasswordVisible}
                userMessage={userMessage}
                mode={isCreatingUser || userForm.id ? "form" : "list"}
                onUserFormChange={setUserForm}
                onConfirmPasswordChange={setConfirmPassword}
                onTogglePasswordVisible={() => setIsAccountPasswordVisible((current) => !current)}
                onStartCreate={handleStartCreateUser}
                onSubmit={handleSaveUser}
                onEditUser={handleEditUser}
                onToggleUserActive={handleToggleUserActive}
                onCancelEdit={handleCancelUserEdit}
                onUploadAvatar={handleUploadAvatar}
              />
            )}

            {activeView === "audit" && canPerform(user.role, "manageAudit") && (
              <AuditView entries={auditEntries} canClear={canPerform(user.role, "manageAudit")} onClear={handleClearAudit} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
