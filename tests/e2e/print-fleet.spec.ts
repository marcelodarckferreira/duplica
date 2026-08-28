import { expect, test } from "@playwright/test";
import { STORAGE_STATE_PATH } from "./fixtures";

test.use({ storageState: STORAGE_STATE_PATH("admin") });

test("cadastra rede, descobre HP simulada e vincula insumos ao setor", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Parque de impressão" }).click();
  await expect(page.getByRole("heading", { name: "Parque de impressão" })).toBeVisible();

  await page.getByRole("tab", { name: "Redes" }).click();
  await page.getByRole("button", { name: "Nova rede" }).click();
  await page.getByLabel("Nome").fill("Rede E2E da sede");
  await page.getByLabel("Rede CIDR").fill("172.15.10.0/30");
  await page.getByLabel("Comunidade SNMP v2c").fill("e2e-read-only");
  await page.getByRole("button", { name: "Salvar rede" }).click();
  await expect(page.getByText("Rede E2E da sede")).toBeVisible();
  await expect(page.getByText(/credencial configurada/)).toBeVisible();
  await expect(page.locator('input[value="e2e-read-only"]')).toHaveCount(0);

  await page.getByRole("tab", { name: "Descoberta" }).click();
  await page.getByRole("button", { name: "Iniciar descoberta em Rede E2E da sede" }).click();
  await page.getByRole("button", { name: "Colocar na fila" }).click();
  await expect(page.getByText("Concluída", { exact: true })).toBeVisible({ timeout: 20_000 });

  await page.getByRole("tab", { name: "Impressoras" }).click();
  await expect(page.getByText("HP Sede E2E")).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Revisar" }).click();
  await page.getByLabel("Nome").fill("HP Pedagógico");
  await page.getByRole("combobox", { name: "Setor" }).click();
  await page.getByRole("option", { name: "Sede - Coordenação Pedagógica" }).click();
  await page.getByRole("button", { name: "Confirmar cadastro" }).click();
  await expect(page.getByText("HP Pedagógico")).toBeVisible();

  await page.getByRole("switch", { name: "Ativar monitoramento de HP Pedagógico" }).click();
  await expect(page.getByRole("switch", { name: "Desativar monitoramento de HP Pedagógico" })).toBeVisible();
  await expect.poll(async () => {
    await page.getByRole("button", { name: "Ver detalhes de HP Pedagógico" }).click();
    const count = await page.getByText("18% — Atenção").count();
    if (!count) await page.getByRole("button", { name: "Ver detalhes de HP Pedagógico" }).click();
    return count;
  }, { timeout: 20_000 }).toBeGreaterThan(0);
});
