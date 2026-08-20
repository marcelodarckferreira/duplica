import { AlertCircle, BarChart3, ClipboardList, Eye, EyeOff, Loader2, Lock, Printer, ShieldCheck, User } from "lucide-react";
import { FormEvent, useState } from "react";
import { BackgroundChart } from "./BackgroundChart";
import { Logo, LogoMark } from "./Logo";
import { Button } from "../shared/ui/button";
import { Checkbox } from "../shared/ui/checkbox";
import { Input } from "../shared/ui/input";
import { Label } from "../shared/ui/label";

const pillars = [
  { icon: ClipboardList, label: "Solicitações", copy: "Escolas e setores da SEMED registram pedidos de cópia num único lugar." },
  { icon: Printer, label: "Produção e entrega", copy: "Status, histórico e retirada acompanhados do início ao fim." },
  { icon: BarChart3, label: "Relatórios", copy: "Ranking de locais e consolidação mensal em tempo real." },
];

export function LoginView(props: {
  theme: "light" | "dark";
  loginError: string;
  isSubmitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const { theme, loginError, isSubmitting, onSubmit } = props;
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <main id="theme-root" className="theme-root grid min-h-screen lg:grid-cols-[1.15fr_1fr]" data-theme={theme}>
      <section
        className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12"
        style={{ background: "linear-gradient(135deg, var(--sidebar), var(--accent-strong))" }}
        aria-hidden="true"
      >
        <BackgroundChart className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-60" />
        <LogoMark size={440} className="pointer-events-none absolute -bottom-16 -right-16 z-0 opacity-10" />
        <Logo className="relative z-20 [&_span]:text-white" />
        <div className="relative z-20 mb-32 grid gap-6">
          <div className="grid gap-2">
            <span className="inline-flex w-fit items-center rounded-full bg-black/20 px-3 py-1 text-xs font-semibold tracking-wider text-accent border border-accent/30 backdrop-blur-md">
              CONTROLE DE IMPRESSÃO
            </span>
            <h2 className="max-w-md text-3xl font-bold leading-tight text-white">
              Gestão centralizada de solicitações de impressão da SEMED.
            </h2>
          </div>
          <div className="grid gap-3">
            {pillars.map((pillar) => (
              <div
                key={pillar.label}
                className="flex items-start gap-4 rounded-xl border border-white/10 bg-black/20 p-3.5 backdrop-blur-md transition-colors hover:bg-black/30"
              >
                <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/20 text-accent shadow-sm">
                  <pillar.icon size={18} />
                </div>
                <div>
                  <strong className="block text-sm font-bold text-white">{pillar.label}</strong>
                  <span className="text-sm leading-relaxed text-white/75">{pillar.copy}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center bg-page p-6">
        <div className="w-full max-w-[420px] rounded-xl border border-border bg-surface p-8 shadow-sm">
          <div className="mb-6 lg:hidden">
            <Logo />
          </div>
          <div className="mb-6">
            <span className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-bold text-accent border border-accent/20">
              SEMED
            </span>
            <h1 id="login-title" className="m-0 mb-1 mt-2 text-3xl font-bold leading-tight text-text">
              Duplica
            </h1>
            <p className="m-0 text-sm text-muted">Acesse com suas credenciais para gerenciar solicitações.</p>
          </div>

          <form onSubmit={onSubmit} className="grid gap-4" aria-labelledby="login-title">
            <div className="grid gap-1.5">
              <Label htmlFor="login-email">Usuário ou e-mail</Label>
              <div className="relative">
                <User size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <Input
                  id="login-email"
                  name="email"
                  type="text"
                  autoComplete="username"
                  required
                  className="pl-10"
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="login-password">Senha</Label>
              <div className="relative">
                <Lock size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <Input
                  id="login-password"
                  name="password"
                  type={isPasswordVisible ? "text" : "password"}
                  required
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  aria-label={isPasswordVisible ? "Ocultar senha" : "Visualizar senha"}
                  onClick={() => setIsPasswordVisible((current) => !current)}
                  className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded border-0 bg-transparent p-0 text-muted transition-colors hover:bg-surface-soft hover:text-text [appearance:none]"
                >
                  {isPasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-muted">
              <Checkbox name="remember" defaultChecked />
              Permanecer conectado
            </label>
            {loginError && (
              <div className="flex items-center gap-2 rounded-lg border border-status-cancelado-fg/20 bg-status-cancelado-bg p-3 text-sm font-semibold text-status-cancelado-fg">
                <AlertCircle size={18} className="shrink-0" />
                <span>{loginError}</span>
              </div>
            )}
            <Button type="submit" className="mt-1" disabled={isSubmitting} aria-busy={isSubmitting}>
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
              {isSubmitting ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}

