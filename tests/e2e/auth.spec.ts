import { expect, test } from "@playwright/test";
import { STORAGE_STATE_PATH } from "./fixtures";

// O caminho de sucesso do login (credenciais válidas -> dashboard) já é
// exercitado e verificado pelo projeto "setup" (auth.setup.ts) pra cada
// papel — se esse fluxo quebrasse, a suíte inteira falharia ali antes de
// chegar aqui. Não repetimos esse login aqui de propósito: o endpoint de
// login tem rate limit real de 5/min por IP (proteção contra força bruta,
// ver backend/app/api/routes/auth.py) e toda a suíte roda do mesmo IP —
// "setup" já usa 4 dessas 5 tentativas (uma por papel).
test.describe("Autenticação — formulário de login", () => {
  test("rejeita credenciais inválidas com mensagem de erro", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Usuário ou e-mail").fill("admin");
    await page.getByRole("textbox", { name: "Senha" }).fill("senha-errada");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText(/inválid/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Visão geral" })).toBeHidden();
  });
});

// Sessão já autenticada (storageState do projeto "setup") — evita repetir
// login via UI e bater no rate limit real do endpoint.
test.describe("Autenticação — sessão", () => {
  test.use({ storageState: STORAGE_STATE_PATH("admin") });

  test("mantém a sessão após recarregar a página", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Visão geral" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Visão geral" })).toBeVisible();
    await expect(page.getByLabel("Usuário ou e-mail")).toBeHidden();
  });

  test("faz logout e volta pra tela de login", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /abrir menu do usuário/i }).click();
    await page.getByRole("menuitem", { name: "Sair" }).click();
    await expect(page.getByLabel("Usuário ou e-mail")).toBeVisible();
  });
});
