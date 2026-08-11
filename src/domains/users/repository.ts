import { apiAssetUrl, ApiError, apiFetch, setToken } from "../../lib/apiClient";
import { User, UserDraft } from "./types";

interface UserApiPayload {
  id: string;
  username: string;
  name: string;
  role: User["role"];
  email: string;
  active: boolean;
  avatar_url: string | null;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  user: UserApiPayload;
}

function mapUser(payload: UserApiPayload): User {
  return {
    id: payload.id,
    username: payload.username,
    name: payload.name,
    role: payload.role,
    email: payload.email,
    active: payload.active,
    avatarUrl: payload.avatar_url ? apiAssetUrl(payload.avatar_url) : null,
  };
}

export function createUsersRepository() {
  return {
    async getUsers(): Promise<User[]> {
      try {
        const users = await apiFetch<UserApiPayload[]>("/api/v1/users");
        return users.map(mapUser);
      } catch (error) {
        // Sem permissão de manageUsers: a view de Usuários já fica escondida
        // para esse papel, então uma lista vazia aqui é o resultado correto.
        if (error instanceof ApiError && error.status === 403) {
          return [];
        }
        throw error;
      }
    },

    async authenticate(identifier: string, password: string): Promise<User | null> {
      const body = new URLSearchParams({ username: identifier, password });
      try {
        const result = await apiFetch<TokenResponse>("/api/v1/auth/token", {
          method: "POST",
          body,
        });
        setToken(result.access_token);
        return mapUser(result.user);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          return null;
        }
        throw error;
      }
    },

    async saveUser(draft: UserDraft): Promise<User> {
      const result = await apiFetch<UserApiPayload>("/api/v1/users", {
        method: "POST",
        body: JSON.stringify({
          id: draft.id ?? null,
          username: draft.username,
          name: draft.name,
          role: draft.role,
          email: draft.email,
          password: draft.password || null,
          active: draft.active,
        }),
      });
      return mapUser(result);
    },

    async toggleUserActive(id: string, active: boolean): Promise<User> {
      const result = await apiFetch<UserApiPayload>(`/api/v1/users/${id}/active`, {
        method: "PATCH",
        body: JSON.stringify({ active }),
      });
      return mapUser(result);
    },

    async uploadAvatar(id: string, file: File): Promise<User> {
      const body = new FormData();
      body.append("file", file);
      const result = await apiFetch<UserApiPayload>(`/api/v1/users/${id}/avatar`, {
        method: "POST",
        body,
      });
      return mapUser(result);
    },

    async updateProfile(payload: { name: string; email: string }): Promise<User> {
      const result = await apiFetch<UserApiPayload>("/api/v1/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ name: payload.name, email: payload.email, password: null, current_password: null }),
      });
      return mapUser(result);
    },

    async changePassword(payload: { currentPassword: string; newPassword: string; name: string; email: string }): Promise<User> {
      const result = await apiFetch<UserApiPayload>("/api/v1/auth/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: payload.name,
          email: payload.email,
          password: payload.newPassword,
          current_password: payload.currentPassword,
        }),
      });
      return mapUser(result);
    },
  };
}
