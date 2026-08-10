const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8010";
const TOKEN_KEY = "grafica.semed.token";

export function apiAssetUrl(path: string): string {
  return `${API_URL}${path}`;
}

let token: string | null = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;

export function getToken(): string | null {
  return token;
}

export function setToken(next: string | null): void {
  token = next;
  if (next) {
    window.localStorage.setItem(TOKEN_KEY, next);
  } else {
    window.localStorage.removeItem(TOKEN_KEY);
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
