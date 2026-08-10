import { BarChart3, Building2, ChevronsLeft, ChevronsRight, ClipboardList, FileText, LogOut, Moon, ShieldCheck, Sun, Users } from "lucide-react";
import { useState } from "react";
import { cn } from "../lib/utils";
import { User } from "../domains/users/types";
import { Logo, LogoMark } from "./Logo";
import { ThemeMode } from "./theme";

export type ShellView = "dashboard" | "requests" | "units" | "users" | "reports" | "audit";

const COLLAPSE_STORAGE_KEY = "grafica.semed.sidebarCollapsed";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("pt-BR");
}

function navLinkClasses(isActive: boolean, collapsed: boolean) {
  return cn(
    "flex w-full items-center gap-3 rounded border-0 bg-transparent p-0 px-3 py-2 text-left text-sm font-medium text-sidebar-text [appearance:none] transition-colors",
    collapsed && "justify-center px-2",
    isActive ? "bg-white/15 text-white" : "text-sidebar-muted hover:bg-white/10 hover:text-white",
  );
}

export function Sidebar(props: {
  activeView: ShellView;
  onChangeView: (view: ShellView) => void;
  canManageUsers: boolean;
  canManageAudit: boolean;
  user: User;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onLogout: () => void;
}) {
  const { activeView, onChangeView, canManageUsers, canManageAudit, user, theme, onToggleTheme, onLogout } = props;
  const [collapsed, setCollapsed] = useState(
    () => window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1",
  );
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  const items: { view: ShellView; label: string; icon: typeof BarChart3 }[] = [
    { view: "dashboard", label: "Dashboard", icon: BarChart3 },
    { view: "requests", label: "Solicitações", icon: ClipboardList },
    { view: "units", label: "Unidades", icon: Building2 },
    ...(canManageUsers ? [{ view: "users" as const, label: "Usuários", icon: Users }] : []),
    { view: "reports", label: "Relatórios", icon: FileText },
    ...(canManageAudit ? [{ view: "audit" as const, label: "Auditoria", icon: ShieldCheck }] : []),
  ];

  return (
    <aside
      aria-label="Navegação principal"
      className={cn(
        "flex h-screen shrink-0 flex-col border-r border-white/10 bg-sidebar transition-[width] duration-200",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className={cn("flex h-16 items-center border-b border-white/10", collapsed ? "justify-center px-2" : "justify-between px-4")}>
        {collapsed ? (
          <button
            type="button"
            aria-label="Expandir menu"
            onClick={toggleCollapsed}
            className="group relative grid h-10 w-10 place-items-center rounded border-0 bg-transparent p-0 [appearance:none] hover:bg-white/10"
          >
            <LogoMark size={28} className="transition-opacity group-hover:opacity-0" />
            <ChevronsRight size={16} className="absolute text-white opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        ) : (
          <>
            <Logo size={30} textClassName="text-lg text-white" className="[&_span]:text-white" />
            <button
              type="button"
              aria-label="Recolher menu"
              onClick={toggleCollapsed}
              className="grid h-8 w-8 shrink-0 place-items-center rounded border-0 bg-transparent p-0 text-sidebar-muted [appearance:none] hover:bg-white/10 hover:text-white"
            >
              <ChevronsLeft size={16} />
            </button>
          </>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => (
          <button
            key={item.view}
            type="button"
            onClick={() => onChangeView(item.view)}
            className={navLinkClasses(activeView === item.view, collapsed)}
          >
            <item.icon size={16} className="shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="relative">
          <button
            type="button"
            aria-expanded={isMenuOpen}
            aria-label="Abrir menu do usuário"
            onClick={() => setIsMenuOpen((current) => !current)}
            className={cn(
              "flex w-full items-center gap-2 rounded border-0 bg-transparent p-2 text-left [appearance:none] hover:bg-white/10",
              collapsed && "justify-center",
            )}
          >
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="h-8 w-8 shrink-0 rounded-full object-cover" />
            ) : (
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-strong text-xs font-bold text-white">
                {getInitials(user.name)}
              </span>
            )}
            {!collapsed && (
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-white">{user.name}</span>
                <span className="block truncate text-[11px] text-sidebar-muted">{user.role}</span>
              </span>
            )}
          </button>

          {isMenuOpen && (
            <div className="absolute bottom-full left-0 z-10 mb-2 w-64 rounded border border-border bg-surface py-1 shadow-lg">
              <div className="px-3 py-2">
                <h2 className="m-0 text-xs font-bold uppercase tracking-wide text-muted">Perfil</h2>
                <dl className="m-0 mt-1.5 grid gap-1 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Nome</dt>
                    <dd className="m-0 truncate font-medium text-text">{user.name}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">E-mail</dt>
                    <dd className="m-0 truncate font-medium text-text">{user.email}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Perfil</dt>
                    <dd className="m-0 truncate font-medium text-text">{user.role}</dd>
                  </div>
                </dl>
              </div>
              <div className="border-t border-border px-1 py-1">
                <h2 className="m-0 px-2 py-1 text-xs font-bold uppercase tracking-wide text-muted">Configurações</h2>
                <button
                  type="button"
                  onClick={onToggleTheme}
                  aria-label={theme === "light" ? "Ativar modo escuro" : "Ativar modo claro"}
                  className="flex w-full items-center gap-2 rounded border-0 bg-transparent px-2 py-1.5 text-left text-sm text-text [appearance:none] hover:bg-surface-soft"
                >
                  {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
                  {theme === "light" ? "Modo escuro" : "Modo claro"}
                </button>
              </div>
              <div className="border-t border-border px-1 py-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onLogout();
                  }}
                  className="flex w-full items-center gap-2 rounded border-0 bg-transparent px-2 py-1.5 text-left text-sm font-medium text-[#a43b2f] [appearance:none] hover:bg-surface-soft"
                >
                  <LogOut size={16} />
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
