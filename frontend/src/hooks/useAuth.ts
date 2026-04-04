"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  api,
  setAccessToken,
  setRefreshToken,
  type LoginRequest,
  type RegisterRequest,
  type UserUpdate,
} from "@/lib/api-client";
import { queryKeys } from "./query-keys";

/** Current user profile query + auth mutations. */
export function useAuth() {
  const qc = useQueryClient();

  const meQuery = useQuery({
    queryKey: queryKeys.me,
    queryFn: () => api.auth.me(),
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: (data: LoginRequest) => api.auth.login(data),
    onSuccess: (res) => {
      setAccessToken(res.access_token);
      setRefreshToken(res.refresh_token);
      qc.invalidateQueries({ queryKey: queryKeys.me });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterRequest) => {
      // Backend register returns UserResponse, not tokens.
      // Chain a login call to get tokens after successful registration.
      await api.auth.register(data);
      return api.auth.login({ email: data.email, password: data.password });
    },
    onSuccess: (res) => {
      setAccessToken(res.access_token);
      setRefreshToken(res.refresh_token);
      qc.invalidateQueries({ queryKey: queryKeys.me });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => {
      const rt = localStorage.getItem("prepflow_refresh_token");
      return api.auth.logout(rt ?? "");
    },
    onSettled: () => {
      setAccessToken(null);
      setRefreshToken(null);
      qc.clear();
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: UserUpdate) => api.auth.updateMe(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.me }),
  });

  return {
    user: meQuery.data ?? null,
    isLoading: meQuery.isLoading,
    isAuthenticated: !!meQuery.data,

    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,

    register: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,

    logout: logoutMutation.mutate,

    updateProfile: updateProfileMutation.mutateAsync,
    isUpdatingProfile: updateProfileMutation.isPending,
  };
}
