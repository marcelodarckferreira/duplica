import { expect, test } from "@playwright/test";
import { STORAGE_STATE_PATH } from "./fixtures";

test.describe("Autorização — Operador", () => {
  test.use({ storageState: STORAGE_STATE_PATH("operador") });

  test("não vê itens administrativos na navegação", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("heading", { name: "Visão geral" }).waitFor();
    await expect(page.getByRole("button", { name: "Usuários" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Perfis de Acesso" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Auditoria" })).toBeHidden();
  });
});

test.describe("Autorização — Consulta", () => {
  test.use({ storageState: STORAGE_STATE_PATH("consulta") });

  test("não vê ação de criar solicitação", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Solicitações" }).click();
    await page.getByRole("heading", { name: "Solicitações" }).first().waitFor();
    await expect(page.getByRole("button", { name: "Nova solicitação" })).toBeHidden();
  });
});

test.describe("Autorização — Gerente (autoproteção de conta)", () => {
  test.use({ storageState: STORAGE_STATE_PATH("gerente") });

  test("conta em uso não pode excluir a si mesma na tela de usuários", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Usuários" }).click();
    await page.getByRole("heading", { name: "Usuários e perfis" }).first().waitFor();

    const ownRow = page.locator("table tbody tr", { hasText: "Gerente da Gráfica" });
    await expect(ownRow.getByRole("button", { name: /excluir/i })).toHaveCount(0);
  });

  test("conta do sistema não pode ser excluída por ninguém", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Usuários" }).click();
    await page.getByRole("heading", { name: "Usuários e perfis" }).first().waitFor();

    const systemRow = page.locator("table tbody tr", { hasText: "Administrador SEMED" });
    await expect(systemRow.getByRole("button", { name: /excluir/i })).toHaveCount(0);
  });
});
