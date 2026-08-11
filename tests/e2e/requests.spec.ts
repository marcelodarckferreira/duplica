import { expect, test } from "@playwright/test";
import { STORAGE_STATE_PATH } from "./fixtures";

test.use({ storageState: STORAGE_STATE_PATH("admin") });

test.describe("Solicitações", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Solicitações" }).click();
    await page.getByRole("heading", { name: "Solicitações" }).first().waitFor();
  });

  test("cria, edita, muda o status e exclui uma solicitação", async ({ page }) => {
    await page.getByRole("button", { name: "Nova solicitação" }).click();
    await page.getByRole("heading", { name: "Nova solicitação" }).waitFor();

    await page.getByLabel("Solicitante").fill("Playwright E2E");
    await page.getByLabel("Contato").fill("(21) 90000-0000");
    await page.getByLabel("Descrição / documento").fill("Prova E2E automatizada");
    await page.getByLabel("Páginas").fill("5");
    await page.getByLabel("Jogos / cópias").fill("3");

    await page.getByRole("button", { name: "Registrar solicitação" }).click();
    await expect(page.getByText("Prova E2E automatizada").first()).toBeVisible();
    await expect(page.getByText("Playwright E2E").first()).toBeVisible();

    // editar
    await page.getByRole("button", { name: "Editar solicitação" }).click();
    const requesterField = page.getByLabel("Solicitante");
    await requesterField.fill("Playwright E2E Editado");
    await page.getByRole("button", { name: /salvar alterações/i }).click();
    await expect(page.getByText("Playwright E2E Editado").first()).toBeVisible();

    // mudar status
    await page.getByRole("button", { name: "Em produção", exact: true }).click();
    await expect(page.locator("span", { hasText: "Em produção" }).first()).toBeVisible();

    // excluir
    await page.getByRole("button", { name: "Excluir solicitação" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Excluir" }).click();
    await expect(page.locator("table tbody")).not.toContainText("Playwright E2E Editado");
  });

  test("valida campos obrigatórios antes de enviar", async ({ page }) => {
    await page.getByRole("button", { name: "Nova solicitação" }).click();
    await page.getByRole("heading", { name: "Nova solicitação" }).waitFor();
    await page.getByRole("button", { name: "Registrar solicitação" }).click();
    await expect(page.getByText("Informe o solicitante.")).toBeVisible();
  });

  test("filtra a lista por texto de busca", async ({ page }) => {
    await page.getByPlaceholder("Buscar por código, unidade, solicitante ou documento").fill("não-deve-existir-em-lugar-nenhum");
    await expect(page.locator("table tbody tr")).toHaveCount(0);
  });
});
