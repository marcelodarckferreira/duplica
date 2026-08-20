// Sem VITE_API_URL no ambiente de build, assume mesma origem (string vazia,
// URLs relativas) em vez de um host fixo. Isso só é exercitado pelo build
// de produção (Dockerfile) — a etapa de build do frontend ali não recebe um
// .env, então cai neste fallback; como o "pro" mode serve frontend e API no
// mesmo container/porta, relativo é o único valor que funciona não importa
// por qual IP/hostname a página é acessada (127.0.0.1:8010 fixo quebrava
// pra qualquer cliente que não fosse o próprio servidor). Dev/preview
// continuam definindo VITE_API_URL explicitamente via .env na raiz.
const API_URL = import.meta.env.VITE_API_URL ?? "";
const TOKEN_KEY = "grafica.semed.token";

export function apiAssetUrl(path: string): string {
  return `${API_URL}${path}`;
}

function readStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY) ?? window.sessionStorage.getItem(TOKEN_KEY);
}

let token: string | null = readStoredToken();

export function getToken(): string | null {
  return token;
}

// `remember` decide onde o token persiste: localStorage sobrevive a fechar o
// navegador ("permanecer conectado"), sessionStorage só dura a aba atual.
export function setToken(next: string | null, remember: boolean = true): void {
  token = next;
  window.localStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem(TOKEN_KEY);
  if (next) {
    (remember ? window.localStorage : window.sessionStorage).setItem(TOKEN_KEY, next);
  }
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Notifica a aplicação quando uma sessão já autenticada deixa de ser válida
// (token expirado/revogado no meio do uso — não a tentativa de login em si,
// que trata seu próprio 401 sem passar por aqui, ver guarda abaixo). Sem
// isso, uma query em segundo plano (ex.: dashboard) recebia 401 e só
// mostrava o texto cru do erro, deixando a tela como se o usuário ainda
// estivesse logado.
type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (
    options.body &&
    !(options.body instanceof URLSearchParams) &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (response.status === 204) {
    return undefined as T;
  }

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    if (response.status === 401 && path !== "/api/v1/auth/token") {
      setToken(null);
      unauthorizedListeners.forEach((listener) => listener());
    }
    throw new ApiError(detail?.detail ?? "Erro na requisição.", response.status);
  }

  return (await response.json()) as T;
}
