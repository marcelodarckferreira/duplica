import { BarChart3, ClipboardList, Eye, EyeOff, Loader2, Printer, ShieldCheck } from "lucide-react";
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
        <BackgroundChart className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[30%] w-full opacity-40" />
        <LogoMark size={420} className="pointer-events-none absolute -bottom-16 -right-16 z-0 opacity-10" />
        <Logo className="relative z-10 [&_span]:text-white" />
        <div className="relative z-10 grid gap-7">
          <p className="max-w-sm text-3xl font-bold leading-tight text-white">
            Controle institucional de cópias da SEMED.
          </p>
          <div className="grid gap-5">
            {pillars.map((pillar) => (
              <div key={pillar.label} className="flex items-start gap-3">
                <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded bg-white/15 text-white">
                  <pillar.icon size={18} />
                </div>
                <div>
                  <strong className="block text-sm font-bold text-white">{pillar.label}</strong>
                  <span className="text-sm text-white/75">{pillar.copy}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center bg-page p-6">
        <div className="w-full max-w-[420px] rounded-lg border border-border bg-surface p-8 shadow-2xl">
          <div className="mb-6 lg:hidden">
            <Logo />
          </div>
          <p className="m-0 text-xs font-extrabold uppercase tracking-wide text-accent">SEMED</p>
          <h1 id="login-title" className="m-0 mb-2 mt-1 text-4xl font-bold leading-none text-text">
            Duplica
          </h1>
          <p className="m-0 mb-6 text-muted">Controle institucional de solicitações de cópias, produção e retirada.</p>

          <form onSubmit={onSubmit} className="grid gap-3.5" aria-labelledby="login-title">
            <div className="grid gap-1.5">
              <Label htmlFor="login-email">Usuário ou e-mail</Label>
              <Input id="login-email" name="email" type="text" autoComplete="username" required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="login-password">Senha</Label>
              <div className="relative">
                <Input
                  id="login-password"
                  name="password"
                  type={isPasswordVisible ? "text" : "password"}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  aria-label={isPasswordVisible ? "Ocultar senha" : "Visualizar senha"}
                  onClick={() => setIsPasswordVisible((current) => !current)}
                  className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center border-0 bg-transparent p-0 text-muted [appearance:none] hover:text-text"
                >
                  {isPasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-muted">
              <Checkbox name="remember" defaultChecked />
              Permanecer conectado
            </label>
            {loginError && <p className="m-0 font-bold text-[#a43b2f]">{loginError}</p>}
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
