import { vi } from "vitest";

interface MockUnit {
  id: string;
  name: string;
  origin: string;
  code: string;
  contact: string | null;
  active: boolean;
}

interface MockUser {
  id: string;
  username: string;
  name: string;
  role: string;
  email: string;
  active: boolean;
  password: string;
  avatar_url: string | null;
}

interface MockHistoryEntry {
  status: string;
  date: string;
  by: string;
}

interface MockAuditEntry {
  id: number;
  action: string;
  request_id: string;
  request_code: string;
  actor_id: string;
  actor_name: string;
  detail: string;
  created_at: string;
}

interface MockRequest {
  id: string;
  code: string;
  origin: string;
  unit_id: string;
  unit_name: string;
  requester: string;
  contact: string;
  document_description: string;
  pages: number;
  copies: number;
  duplex: boolean;
  printed_faces: number;
  consumed_sheets: number;
  paper: string;
  color_mode: string;
  priority: string;
  desired_deadline: string;
  status: string;
  production_owner: string;
  requested_at: string;
  produced_at: string;
  delivered_at: string;
  picked_up_by: string;
  notes: string;
  history: MockHistoryEntry[];
}

function json(body: unknown, status = 200): Promise<Response> {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
}

function noContent(): Promise<Response> {
  return Promise.resolve(new Response(null, { status: 204 }));
}

export function installMockApi() {
  const units: MockUnit[] = [
    { id: "emef-paulo-freire", name: "EMEF Paulo Freire", origin: "Escola", code: "ESC-001", contact: null, active: true },
    { id: "emef-ana-nery", name: "EMEF Ana Nery", origin: "Escola", code: "ESC-002", contact: null, active: true },
    { id: "setor-pedagogico", name: "Sede - Coordenação Pedagógica", origin: "Sede SEMED", code: "SED-PED", contact: null, active: true },
  ];

  const users: MockUser[] = [
    {
      id: "admin",
      username: "admin",
      name: "Administrador SEMED",
      role: "Administrador",
      email: "admin@grafica.local",
      active: true,
      password: "admin123",
      avatar_url: null,
    },
  ];

  const requests: MockRequest[] = [
    {
      id: "req-1",
      code: "CP-2026-0001",
      origin: "Escola",
      unit_id: "emef-paulo-freire",
      unit_name: "EMEF Paulo Freire",
      requester: "Ana Souza",
      contact: "(11) 99999-0000",
      document_description: "Avaliação de Língua Portuguesa - 5º ano",
      pages: 8,
      copies: 120,
      duplex: false,
      printed_faces: 960,
      consumed_sheets: 960,
      paper: "A4",
      color_mode: "P&B",
      priority: "Normal",
      desired_deadline: "2026-08-15",
      status: "Recebido",
      production_owner: "Marta",
      requested_at: "2026-08-10",
      produced_at: "",
      delivered_at: "",
      picked_up_by: "",
      notes: "",
      history: [{ status: "Recebido", date: "2026-08-10", by: "Marta" }],
    },
    {
      id: "req-2",
      code: "CP-2026-0002",
      origin: "Sede SEMED",
      unit_id: "setor-pedagogico",
      unit_name: "Sede - Coordenação Pedagógica",
      requester: "Rafael Mendes",
      contact: "(11) 98888-1010",
      document_description: "Circular de formação continuada",
      pages: 3,
      copies: 80,
      duplex: true,
      printed_faces: 240,
      consumed_sheets: 160,
      paper: "A4",
      color_mode: "P&B",
      priority: "Institucional",
      desired_deadline: "2026-08-12",
      status: "Em produção",
      production_owner: "Carlos",
      requested_at: "2026-08-09",
      produced_at: "",
      delivered_at: "",
      picked_up_by: "",
      notes: "",
      history: [{ status: "Recebido", date: "2026-08-09", by: "Carlos" }],
    },
    {
      id: "req-3",
      code: "CP-2026-0003",
      origin: "Escola",
      unit_id: "emef-ana-nery",
      unit_name: "EMEF Ana Nery",
      requester: "Beatriz Lima",
      contact: "(11) 97777-2323",
      document_description: "Atividades de recuperação",
      pages: 5,
      copies: 45,
      duplex: true,
      printed_faces: 225,
      consumed_sheets: 135,
      paper: "A4",
      color_mode: "P&B",
      priority: "Urgente",
      desired_deadline: "2026-08-11",
      status: "Pronto",
      production_owner: "Marta",
      requested_at: "2026-08-08",
      produced_at: "2026-08-10",
      delivered_at: "",
      picked_up_by: "",
      notes: "",
      history: [{ status: "Recebido", date: "2026-08-08", by: "Marta" }],
    },
  ];

  const auditEntries: MockAuditEntry[] = [
    {
      id: 1,
      action: "create",
      request_id: "req-1",
      request_code: "CP-2026-0001",
      actor_id: "admin",
      actor_name: "Administrador SEMED",
      detail: "Solicitação criada.",
      created_at: "2026-08-10T12:00:00Z",
    },
  ];

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = typeof input === "string" ? input : input.toString();
    const method = (init.method ?? "GET").toUpperCase();
    const path = url.replace(/^https?:\/\/[^/]+/, "");

    if (path === "/api/v1/auth/token" && method === "POST") {
      const params = new URLSearchParams(init.body as string);
      const identifier = params.get("username") ?? "";
      const password = params.get("password") ?? "";
      const user = users.find((item) => (item.email === identifier || item.username === identifier) && item.password === password);
      if (!user) return json({ detail: "Usuário/e-mail ou senha inválidos." }, 401);
      return json({
        access_token: "test-token",
        token_type: "bearer",
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          email: user.email,
          active: user.active,
          avatar_url: user.avatar_url,
        },
      });
    }

    if (path === "/api/v1/auth/me" && method === "PATCH") {
      const body = JSON.parse(init.body as string);
      const current = users[0];
      if (body.password && body.password !== "" && body.current_password !== current.password) {
        return json({ detail: "Senha atual incorreta." }, 400);
      }
      current.name = body.name;
      current.email = body.email;
      if (body.password) current.password = body.password;
      const { password: _password, ...rest } = current;
      return json(rest);
    }

    if (path === "/api/v1/units" && method === "GET") return json(units);
    if (path === "/api/v1/users" && method === "GET") {
      return json(users.map(({ password: _password, ...rest }) => rest));
    }
    if (path === "/api/v1/requests" && method === "GET") return json(requests);

    if (path === "/api/v1/requests" && method === "POST") {
      const body = JSON.parse(init.body as string);
      const unit = units.find((item) => item.id === body.unit_id);
      const created: MockRequest = {
        id: `req-${requests.length + 1}`,
        code: `CP-2026-000${requests.length + 1}`,
        origin: body.origin,
        unit_id: body.unit_id,
        unit_name: unit?.name ?? "",
        requester: body.requester,
        contact: body.contact,
        document_description: body.document_description,
        pages: body.pages,
        copies: body.copies,
        duplex: body.duplex,
        printed_faces: body.pages * body.copies,
        consumed_sheets: (body.duplex ? Math.ceil(body.pages / 2) : body.pages) * body.copies,
        paper: body.paper,
        color_mode: body.color_mode,
        priority: body.priority,
        desired_deadline: body.desired_deadline,
        status: "Recebido",
        production_owner: body.production_owner,
        requested_at: "2026-08-10",
        produced_at: "",
        delivered_at: "",
        picked_up_by: "",
        notes: body.notes,
        history: [{ status: "Recebido", date: "2026-08-10", by: body.production_owner || "Sistema" }],
      };
      requests.push(created);
      return json(created);
    }

    const requestMatch = path.match(/^\/api\/v1\/requests\/([^/]+)$/);
    if (requestMatch && method === "PUT") {
      const request = requests.find((item) => item.id === requestMatch[1]);
      if (!request) return json({ detail: "Solicitação não encontrada." }, 404);
      Object.assign(request, JSON.parse(init.body as string));
      return json(request);
    }
    if (requestMatch && method === "DELETE") {
      const index = requests.findIndex((item) => item.id === requestMatch[1]);
      if (index >= 0) requests.splice(index, 1);
      return noContent();
    }

    const statusMatch = path.match(/^\/api\/v1\/requests\/([^/]+)\/status$/);
    if (statusMatch && method === "PATCH") {
      const request = requests.find((item) => item.id === statusMatch[1]);
      if (!request) return json({ detail: "Solicitação não encontrada." }, 404);
      const body = JSON.parse(init.body as string);
      request.status = body.status;
      return json(request);
    }

    if (path === "/api/v1/units" && method === "POST") {
      const body = JSON.parse(init.body as string);
      const unit: MockUnit = {
        id: body.id ?? body.name.toLowerCase().replace(/\s+/g, "-"),
        name: body.name,
        code: body.code,
        origin: body.origin,
        contact: body.contact ?? null,
        active: true,
      };
      units.push(unit);
      return json(unit);
    }

    if (path === "/api/v1/users" && method === "POST") {
      const body = JSON.parse(init.body as string);
      const existing = users.find((item) => item.id === body.id);
      if (existing) {
        Object.assign(existing, {
          username: body.username,
          name: body.name,
          role: body.role,
          email: body.email,
          active: body.active,
          ...(body.password ? { password: body.password } : {}),
        });
        const { password: _password, ...rest } = existing;
        return json(rest);
      }
      const created: MockUser = {
        id: `user-${users.length + 1}`,
        username: body.username,
        name: body.name,
        role: body.role,
        email: body.email,
        active: body.active,
        password: body.password,
        avatar_url: null,
      };
      users.push(created);
      const { password: _password, ...rest } = created;
      return json(rest);
    }

    if (path === "/api/v1/audit-log" && method === "GET") return json(auditEntries);
    if (path === "/api/v1/audit-log" && method === "DELETE") {
      auditEntries.length = 0;
      return noContent();
    }

    const avatarMatch = path.match(/^\/api\/v1\/users\/([^/]+)\/avatar$/);
    if (avatarMatch && method === "POST") {
      const targetUser = users.find((item) => item.id === avatarMatch[1]);
      if (!targetUser) return json({ detail: "Usuário não encontrado." }, 404);
      targetUser.avatar_url = `/uploads/avatars/${targetUser.id}-test.png`;
      const { password: _password, ...rest } = targetUser;
      return json(rest);
    }

    return json({ detail: `Rota não mapeada no mock de teste: ${method} ${path}` }, 404);
  });

  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, units, users, requests };
}
