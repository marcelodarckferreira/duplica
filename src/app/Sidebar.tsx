import { BadgeInfo, BarChart3, Building2, Check, ChevronsLeft, ChevronsRight, ClipboardList, Contact, Key, Lock, LogOut, Monitor, Moon, Printer, RefreshCw, ShieldCheck, Sun, User as UserIcon, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../shared/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../shared/ui/dropdown-menu";
import { Switch } from "../shared/ui/switch";
import { User } from "../features/users/model/types";
import { AccountModal, ChangePasswordModal } from "../features/account/ui/AccountModals";
import { AboutModal } from "../features/system/ui/AboutModal";
import { Avatar } from "../shared/ui/avatar";
import { LogoMark } from "./Logo";
import { ThemeMode } from "./theme";

export type ShellView = "dashboard" | "requests" | "units" | "people" | "printFleet" | "users" | "profiles" | "audit";

const COLLAPSE_STORAGE_KEY = "grafica.semed.sidebarCollapsed";

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
  canViewPrintFleet: boolean;
  user: User;
  theme: ThemeMode;
  onChangeTheme: (theme: ThemeMode) => void;
  onLogout: () => void;
  onUpdateProfile: (payload: { name: string; email: string }) => Promise<void>;
  onChangePassword: (payload: { currentPassword: string; newPassword: string }) => Promise<void>;
  onUploadAvatar: (userId: string, file: File) => Promise<void>;
  isDashboardAutoSyncOn: boolean;
  onToggleDashboardAutoSync: () => void;
}) {
  const {
    activeView,
    onChangeView,
    canManageUsers,
    canManageAudit,
    canViewPrintFleet,
    user,
    theme,
    onChangeTheme,
    onLogout,
    onUpdateProfile,
    onChangePassword,
    onUploadAvatar,
    isDashboardAutoSyncOn,
    onToggleDashboardAutoSync,
  } = props;
  const [collapsed, setCollapsed] = useState(
    () => window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1",
  );
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const wasAboutModalOpen = useRef(false);

  useEffect(() => {
    if (wasAboutModalOpen.current && !isAboutModalOpen) {
      window.setTimeout(() => {
        document.querySelector<HTMLButtonElement>('[aria-label="Abrir menu do usuário"]')?.focus();
      }, 0);
    }
    wasAboutModalOpen.current = isAboutModalOpen;
  }, [isAboutModalOpen]);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  const groups: { label: string; items: { view: ShellView; label: string; icon: typeof BarChart3 }[] }[] = [
    {
      label: "Operação",
      items: [
        { view: "dashboard" as const, label: "Dashboard", icon: BarChart3 },
        { view: "requests" as const, label: "Solicitações", icon: ClipboardList },
        { view: "units" as const, label: "Locais", icon: Building2 },
        { view: "people" as const, label: "Pessoas", icon: Contact },
        ...(canViewPrintFleet ? [{ view: "printFleet" as const, label: "Parque de impressão", icon: Printer }] : []),
      ],
    },
    {
      label: "Administração",
      items: [
        ...(canManageUsers ? [{ view: "users" as const, label: "Usuários", icon: Users }] : []),
        ...(canManageUsers ? [{ view: "profiles" as const, label: "Perfis de Acesso", icon: Lock }] : []),
        ...(canManageAudit ? [{ view: "audit" as const, label: "Auditoria", icon: ShieldCheck }] : []),
      ],
    },
  ].filter((group) => group.items.length > 0);

  return (
    <aside
      aria-label="Navegação principal"
      className={cn(
        "flex h-screen shrink-0 flex-col border-r border-white/10 bg-sidebar transition-[width] duration-200 print:hidden",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className={cn("flex items-center border-b border-white/10 py-3", collapsed ? "justify-center px-2" : "justify-between px-4")}>
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
            <span className="flex items-center gap-2.5">
              <LogoMark size={30} />
              <span className="flex flex-col leading-tight">
                <span className="text-lg font-bold tracking-tight text-white">Duplica</span>
                <span className="text-xs font-medium text-sidebar-muted">Controle de Impressão</span>
              </span>
            </span>
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

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {groups.map((group) => (
          <div key={group.label} className="space-y-1">
            {!collapsed && (
              <p className="px-3 text-[11px] font-bold uppercase tracking-wide text-sidebar-muted">{group.label}</p>
            )}
            {group.items.map((item) => (
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
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Abrir menu do usuário"
              className={cn(
                "flex w-full items-center gap-2 rounded border-0 bg-transparent p-2 text-left [appearance:none] hover:bg-white/10",
                collapsed && "justify-center",
              )}
            >
              <span className="shrink-0">
                <Avatar name={user.name} avatarUrl={user.avatarUrl} size={32} />
              </span>
              {!collapsed && (
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-white">{user.name}</span>
                  <span className="block truncate text-[11px] text-sidebar-muted">{user.role}</span>
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-64">
            <DropdownMenuLabel>Conta</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => setIsAccountModalOpen(true)}>
              <UserIcon size={16} />
              Minha conta
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setIsPasswordModalOpen(true)}>
              <Key size={16} />
              Alterar senha
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setIsAboutModalOpen(true)}>
              <BadgeInfo size={16} />
              Sobre
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Configurações</DropdownMenuLabel>
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                onToggleDashboardAutoSync();
              }}
              className="justify-between gap-3"
            >
              <span className="flex min-w-0 items-center gap-2">
                <RefreshCw size={16} className="shrink-0" />
                <span className="truncate">Sync do dashboard</span>
              </span>
              <Switch checked={isDashboardAutoSyncOn} className="pointer-events-none shrink-0" tabIndex={-1} aria-hidden="true" />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Tema</DropdownMenuLabel>
            {(
              [
                { mode: "light" as const, label: "Claro", icon: Sun },
                { mode: "dark" as const, label: "Escuro", icon: Moon },
                { mode: "system" as const, label: "Sistema", icon: Monitor },
              ]
            ).map((option) => (
              <DropdownMenuItem key={option.mode} onSelect={() => onChangeTheme(option.mode)} className="justify-between">
                <span className="flex items-center gap-2">
                  <option.icon size={16} />
                  {option.label}
                </span>
                {theme === option.mode && <Check size={15} className="text-accent-strong" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onLogout} className="font-medium text-[#a43b2f]">
              <LogOut size={16} />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AccountModal
        open={isAccountModalOpen}
        user={user}
        onClose={() => setIsAccountModalOpen(false)}
        onSave={onUpdateProfile}
        onUploadAvatar={onUploadAvatar}
      />
      <ChangePasswordModal open={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} onSave={onChangePassword} />
      <AboutModal open={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)} />
    </aside>
  );
}
