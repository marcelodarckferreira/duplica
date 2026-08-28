import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent, { UserEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "./AppShell";
import { setToken } from "../shared/api/apiClient";
import { installMockApi } from "../shared/testing/mockApi";

function renderShell() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>,
  );
}

async function login(user: UserEvent) {
  await user.type(await screen.findByLabelText("Usuário ou e-mail"), "admin@grafica.local");
  await user.type(screen.getByLabelText("Senha"), "admin123");
  await user.click(screen.getByRole("button", { name: "Entrar" }));
}

describe("AppShell user menu", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setToken(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setToken(null);
  });

  it("opens profile and settings from the user avatar and changes theme there", async () => {
    installMockApi();
    const user = userEvent.setup();
    renderShell();

    await login(user);
    await user.click(await screen.findByRole("button", { name: /abrir menu do usuário/i }));

    expect(screen.getByText("Conta")).toBeTruthy();
    expect(screen.getByText("Tema")).toBeTruthy();

    await user.click(screen.getByRole("menuitem", { name: "Escuro" }));

    expect(window.localStorage.getItem("grafica.semed.theme")).toBe("dark");
  });

  it("shows application and database versions from the account menu", async () => {
    installMockApi();
    const user = userEvent.setup();
    renderShell();

    await login(user);
    await user.click(await screen.findByRole("button", { name: /abrir menu do usuário/i }));
    await user.click(screen.getByRole("menuitem", { name: "Sobre" }));

    expect(await screen.findByRole("dialog", { name: "Sobre o Duplica" })).toBeTruthy();
    expect(screen.getByText("0.1.0")).toBeTruthy();
    expect(screen.getByText("535a164")).toBeTruthy();
    expect(screen.getByText("62ad30878cdf")).toBeTruthy();
  });

  it("keeps the about dialog open and retries when versions cannot be loaded", async () => {
    installMockApi({ systemVersionFailures: 1 });
    const user = userEvent.setup();
    renderShell();

    await login(user);
    await user.click(await screen.findByRole("button", { name: /abrir menu do usuário/i }));
    await user.click(screen.getByRole("menuitem", { name: "Sobre" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Não foi possível consultar as versões.");
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByText("62ad30878cdf")).toBeTruthy();
  });

  it("restores the session from a stored token after a reload, on every screen", async () => {
    installMockApi();
    const user = userEvent.setup();
    let mounted = renderShell();

    await login(user);
    await screen.findByRole("heading", { name: "Visão geral" });

    for (const screenName of ["Solicitações", "Locais", "Usuários", "Auditoria"]) {
      await user.click(await screen.findByRole("button", { name: screenName }));

      mounted.unmount();
      mounted = renderShell();
      await screen.findByRole("heading", { name: "Visão geral" }, { timeout: 3000 });
      expect(screen.queryByLabelText("Usuário ou e-mail")).toBeNull();
    }
  });

  it("opens the headquarters print fleet for an authorized admin", async () => {
    installMockApi();
    const user = userEvent.setup();
    renderShell();
    await login(user);
    await user.click(await screen.findByRole("button", { name: "Parque de impressão" }));
    expect(await screen.findByRole("heading", { name: "Parque de impressão" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Redes" })).toBeTruthy();
  });

  it("edits the own profile and changes the own password from the account menu", async () => {
    installMockApi();
    const user = userEvent.setup();
    renderShell();

    await login(user);
    await user.click(await screen.findByRole("button", { name: /abrir menu do usuário/i }));
    await user.click(screen.getByRole("menuitem", { name: "Minha conta" }));

    const nameField = await screen.findByRole("textbox", { name: "Nome" });
    await user.clear(nameField);
    await user.type(nameField, "Administrador Renomeado");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Administrador Renomeado")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /abrir menu do usuário/i }));
    await user.click(screen.getByRole("menuitem", { name: "Alterar senha" }));

    await user.type(screen.getByLabelText("Senha atual"), "admin123");
    await user.type(screen.getByLabelText("Nova senha"), "nova-senha-456");
    await user.type(screen.getByLabelText("Confirmar nova senha"), "nova-senha-456");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Alterar senha" })).toBeNull();
    });
  });

  it("masks account passwords and requires matching confirmation", async () => {
    installMockApi();
    const user = userEvent.setup();
    renderShell();

    await login(user);
    await user.click(await screen.findByRole("button", { name: "Usuários" }));
    await user.click(await screen.findByRole("button", { name: "Nova conta" }));

    const password = await screen.findByLabelText("Senha");
    const confirmation = screen.getByLabelText("Confirmar senha");

    expect(password.getAttribute("type")).toBe("password");
    expect(confirmation.getAttribute("type")).toBe("password");

    await user.type(screen.getByLabelText("Usuário"), "nova.pessoa");
    await user.type(screen.getByLabelText("Nome"), "Nova Pessoa");
    await user.type(screen.getByLabelText("E-mail"), "nova@grafica.local");
    await user.type(password, "abc123");
    await user.type(confirmation, "abc124");
    await user.click(screen.getByRole("button", { name: /salvar conta/i }));

    expect(await screen.findByText("As senhas não conferem.")).toBeTruthy();
  });

  it("shows and hides account password fields from the left-side button", async () => {
    installMockApi();
    const user = userEvent.setup();
    renderShell();

    await login(user);
    await user.click(await screen.findByRole("button", { name: "Usuários" }));
    await user.click(await screen.findByRole("button", { name: "Nova conta" }));

    const password = await screen.findByLabelText("Senha");
    const confirmation = screen.getByLabelText("Confirmar senha");

    await user.click(screen.getByRole("button", { name: "Visualizar senha" }));

    expect(password.getAttribute("type")).toBe("text");
    expect(confirmation.getAttribute("type")).toBe("text");

    await user.click(screen.getByRole("button", { name: "Ocultar senha" }));

    expect(password.getAttribute("type")).toBe("password");
    expect(confirmation.getAttribute("type")).toBe("password");
  });

  it("filters requests by school via the search field", async () => {
    installMockApi();
    const user = userEvent.setup();
    renderShell();

    await login(user);
    await user.click(await screen.findByRole("button", { name: "Solicitações" }));
    await user.type(await screen.findByPlaceholderText("Buscar por código, unidade, solicitante ou documento"), "Ana Nery");

    expect(screen.getByRole("row", { name: /EMEF Ana Nery/ })).toBeTruthy();
    expect(screen.queryByRole("row", { name: /EMEF Paulo Freire/ })).toBeNull();
    expect(screen.queryByRole("row", { name: /Sede - Coordenação Pedagógica/ })).toBeNull();
  });

  it("edits and deletes requests from the request detail panel", async () => {
    installMockApi();
    const user = userEvent.setup();
    renderShell();

    await login(user);
    await user.click(await screen.findByRole("button", { name: "Solicitações" }));
    await user.click(await screen.findByRole("button", { name: "Editar CP-2026-0001" }));

    await user.click(screen.getByRole("combobox", { name: "Pessoa" }));
    await user.click(await screen.findByRole("option", { name: "Solicitante Editado" }));
    await user.click(screen.getByRole("button", { name: /salvar alterações/i }));

    expect(await screen.findByText("Solicitante Editado")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Excluir CP-2026-0001" }));
    await user.click(await screen.findByRole("button", { name: "Excluir" }));

    await waitFor(() => {
      expect(screen.queryByRole("row", { name: /CP-2026-0001/ })).toBeNull();
    });
  });

  it("lists and clears the audit log", async () => {
    installMockApi();
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderShell();

    await login(user);
    await user.click(await screen.findByRole("button", { name: "Auditoria" }));

    expect(await screen.findByText("Solicitação criada.")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Limpar log" }));

    await waitFor(() => {
      expect(screen.queryByText("Solicitação criada.")).toBeNull();
    });
  });
});
