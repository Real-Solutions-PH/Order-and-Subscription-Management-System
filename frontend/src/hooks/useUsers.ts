"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  api,
  type AdminUserUpdate,
  type AdminCreateUserRequest,
} from "@/lib/api-client";
import { queryKeys } from "./query-keys";

/** Users list (admin). */
export function useUsers(params?: {
  page?: number;
  page_size?: number;
  role?: string;
}) {
  return useQuery({
    queryKey: queryKeys.users.list(params as Record<string, unknown>),
    queryFn: () => api.users.list(params),
  });
}

/** Single user detail (admin). */
export function useUser(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.users.detail(id!),
    queryFn: () => api.users.get(id!),
    enabled: !!id,
  });
}

/** User admin mutations. */
export function useUserMutations() {
  const qc = useQueryClient();

  const createUser = useMutation({
    mutationFn: (data: AdminCreateUserRequest) => api.users.create(data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.users.list() }),
  });

  const updateUser = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AdminUserUpdate }) =>
      api.users.update(id, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.users.list() }),
  });

  const activateUser = useMutation({
    mutationFn: (id: string) => api.users.activate(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.users.list() }),
  });

  const deactivateUser = useMutation({
    mutationFn: (id: string) => api.users.deactivate(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.users.list() }),
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) => api.users.delete(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.users.list() }),
  });

  return {
    createUser: createUser.mutateAsync,
    updateUser: updateUser.mutateAsync,
    activateUser: activateUser.mutateAsync,
    deactivateUser: deactivateUser.mutateAsync,
    deleteUser: deleteUser.mutateAsync,
    isCreating: createUser.isPending,
    isUpdating: updateUser.isPending,
    isDeleting: deleteUser.isPending,
  };
}
