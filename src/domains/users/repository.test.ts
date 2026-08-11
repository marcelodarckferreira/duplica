import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createUsersRepository } from "./repository";
import { getToken, setToken } from "../../lib/apiClient";

describe("users repository", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    setToken(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setToken(null);
  });

  it("authenticates and stores the access token", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: "fake-jwt",
          token_type: "bearer",
          user: { id: "admin", name: "Administrador SEMED", role: "Admin", email: "admin@grafica.local", active: true },
        }),
        { status: 200 },
      ),
    );

    const repo = createUsersRepository();
    const user = await repo.authenticate("admin@grafica.local", "admin123");

    expect(user?.email).toBe("admin@grafica.local");
    expect(getToken()).toBe("fake-jwt");

    const [, requestInit] = fetchMock.mock.calls[0];
    expect(requestInit.body).toBeInstanceOf(URLSearchParams);
  });

  it("returns null on invalid credentials without throwing", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ detail: "E-mail ou senha inválidos." }), { status: 401 }));

    const repo = createUsersRepository();
    const user = await repo.authenticate("admin@grafica.local", "errada");

    expect(user).toBeNull();
  });

  it("returns an empty list instead of throwing when forbidden to list users", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ detail: "Sem permissão." }), { status: 403 }));

    const repo = createUsersRepository();
    const users = await repo.getUsers();

    expect(users).toEqual([]);
  });

  it("saves a user via POST, omitting a blank password", async () => {
    const saved = { id: "user-1", name: "Nova Pessoa", role: "Consulta", email: "nova@grafica.local", active: true };
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(saved), { status: 200 }));

    const repo = createUsersRepository();
    await repo.saveUser({ id: "user-1", name: "Nova Pessoa", role: "Consulta", email: "nova@grafica.local", password: "", active: true });

    const [, requestInit] = fetchMock.mock.calls[0];
    expect(JSON.parse(requestInit.body).password).toBeNull();
  });

  it("toggles user active state via PATCH", async () => {
    const saved = { id: "user-1", name: "Nova Pessoa", role: "Consulta", email: "nova@grafica.local", active: false };
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(saved), { status: 200 }));

    const repo = createUsersRepository();
    const result = await repo.toggleUserActive("user-1", false);

    const [url, requestInit] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/v1/users/user-1/active");
    expect(requestInit.method).toBe("PATCH");
    expect(result.active).toBe(false);
  });

  it("deletes a user via DELETE", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    const repo = createUsersRepository();
    await repo.deleteUser("user-1");

    const [url, requestInit] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/v1/users/user-1");
    expect(requestInit.method).toBe("DELETE");
  });

  it("uploads an avatar via multipart POST and maps the returned URL", async () => {
    const saved = {
      id: "user-1",
      name: "Nova Pessoa",
      role: "Consulta",
      email: "nova@grafica.local",
      active: true,
      avatar_url: "/uploads/avatars/user-1-abcd1234.png",
    };
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(saved), { status: 200 }));

    const repo = createUsersRepository();
    const file = new File(["fake-image-bytes"], "photo.png", { type: "image/png" });
    const result = await repo.uploadAvatar("user-1", file);

    const [url, requestInit] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/v1/users/user-1/avatar");
    expect(requestInit.method).toBe("POST");
    expect(requestInit.body).toBeInstanceOf(FormData);
    expect(result.avatarUrl).toContain("/uploads/avatars/user-1-abcd1234.png");
  });

  it("updates the own profile via PATCH /auth/me without touching the password", async () => {
    const saved = { id: "admin", username: "admin", name: "Novo Nome", role: "Admin", email: "novo@grafica.local", active: true };
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(saved), { status: 200 }));

    const repo = createUsersRepository();
    const result = await repo.updateProfile({ name: "Novo Nome", email: "novo@grafica.local" });

    const [url, requestInit] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/v1/auth/me");
    expect(requestInit.method).toBe("PATCH");
    const body = JSON.parse(requestInit.body);
    expect(body.password).toBeNull();
    expect(body.current_password).toBeNull();
    expect(result.name).toBe("Novo Nome");
  });

  it("changes the own password via PATCH /auth/me sending current and new password", async () => {
    const saved = { id: "admin", username: "admin", name: "Administrador SEMED", role: "Admin", email: "admin@grafica.local", active: true };
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(saved), { status: 200 }));

    const repo = createUsersRepository();
    await repo.changePassword({
      name: "Administrador SEMED",
      email: "admin@grafica.local",
      currentPassword: "admin123",
      newPassword: "nova-senha-456",
    });

    const [, requestInit] = fetchMock.mock.calls[0];
    const body = JSON.parse(requestInit.body);
    expect(body.current_password).toBe("admin123");
    expect(body.password).toBe("nova-senha-456");
  });
});
