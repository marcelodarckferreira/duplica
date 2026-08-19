import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createUsersRepository } from "../api/repository";
import { Permission, UserDraft, UserRole } from "./types";

const usersRepo = createUsersRepository();

export const usersKeys = {
  all: ["users"] as const,
};

export const rolePermissionsKeys = {
  all: ["rolePermissions"] as const,
};

export function useUsersQuery(enabled: boolean) {
  return useQuery({
    queryKey: usersKeys.all,
    queryFn: () => usersRepo.getUsers(),
    enabled,
  });
}

export function useSaveUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (draft: UserDraft) => usersRepo.saveUser(draft),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: usersKeys.all }),
  });
}

export function useToggleUserActiveMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => usersRepo.toggleUserActive(id, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: usersKeys.all }),
  });
}

export function useDeleteUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersRepo.deleteUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: usersKeys.all }),
  });
}

export function useUploadAvatarMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => usersRepo.uploadAvatar(id, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: usersKeys.all }),
  });
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; email: string }) => usersRepo.updateProfile(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: usersKeys.all }),
  });
}

export function useChangePasswordMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { currentPassword: string; newPassword: string; name: string; email: string }) =>
      usersRepo.changePassword(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: usersKeys.all }),
  });
}

export function useRolePermissionsQuery(enabled: boolean) {
  return useQuery({
    queryKey: rolePermissionsKeys.all,
    queryFn: () => usersRepo.getRolePermissions(),
    enabled,
  });
}

export function useUpdateRolePermissionsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ role, permissions }: { role: UserRole; permissions: Permission[] }) =>
      usersRepo.updateRolePermissions(role, permissions),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: rolePermissionsKeys.all }),
  });
}
