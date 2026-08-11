const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8010";
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
    throw new ApiError(detail?.detail ?? "Erro na requisição.", response.status);
  }

  return (await response.json()) as T;
}
