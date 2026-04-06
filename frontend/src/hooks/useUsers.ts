"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type UserUpdate } from "@/lib/api-client";
import { queryKeys } from "./query-keys";

/** Users list (admin). */
export function useUsers(params?: { page?: number; page_size?: number }) {
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

  const updateUser = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UserUpdate }) =>
      api.users.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.users.list() }),
  });

  const deactivateUser = useMutation({
    mutationFn: (id: string) => api.users.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.users.list() }),
  });

  return {
    updateUser: updateUser.mutateAsync,
    deactivateUser: deactivateUser.mutateAsync,
    isUpdating: updateUser.isPending,
  };
}
