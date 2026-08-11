import { test as setup } from "@playwright/test";
import { DEMO_USERS, STORAGE_STATE_PATH } from "./fixtures";

// Projeto "setup" do Playwright: autentica cada papel demo UMA vez via UI e
// salva o storageState (cookies/localStorage) em disco. Os specs reais usam
// esse estado pronto em vez de logar de novo a cada teste — necessário
// porque o login tem rate limit real de 5/min por IP (proteção contra força
// bruta, ver backend/app/api/routes/auth.py) e a suíte inteira roda do mesmo
// IP; nunca afrouxamos esse limite só pra acomodar testes.
for (const role of Object.keys(DEMO_USERS) as (keyof typeof DEMO_USERS)[]) {
  setup(`autentica como ${role}`, async ({ page }) => {
    const { identifier, password } = DEMO_USERS[role];
    await page.goto("/");
    await page.getByLabel("Usuário ou e-mail").fill(identifier);
    await page.getByRole("textbox", { name: "Senha" }).fill(password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.getByRole("heading", { name: "Visão geral" }).waitFor();
    await page.context().storageState({ path: STORAGE_STATE_PATH(role) });
  });
}
