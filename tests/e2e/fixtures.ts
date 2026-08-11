import { Page } from "@playwright/test";

// Credenciais da massa de dados semeada por backend/scripts/e2e_bootstrap.sh
// (banco de teste isolado grafica_test — ver backend/app/db/seed.py).
export const DEMO_USERS = {
  admin: { identifier: "admin", password: "admin123" },
  gerente: { identifier: "gerente", password: "gerente123" },
  operador: { identifier: "operador", password: "operador123" },
  consulta: { identifier: "consulta", password: "consulta123" },
} as const;

export function STORAGE_STATE_PATH(role: keyof typeof DEMO_USERS): string {
  return `playwright/.auth/${role}.json`;
}

// Login via UI de verdade — só usar nos poucos testes que exercitam o
// próprio formulário/fluxo de login. Os demais devem reaproveitar o
// storageState já autenticado (ver auth.setup.ts) pra não bater no rate
// limit real de 5 tentativas/min do endpoint de login.
export async function login(page: Page, user: keyof typeof DEMO_USERS = "admin") {
  const { identifier, password } = DEMO_USERS[user];
  await page.goto("/");
  await page.getByLabel("Usuário ou e-mail").fill(identifier);
  await page.getByRole("textbox", { name: "Senha" }).fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.getByRole("heading", { name: "Visão geral" }).waitFor();
}
