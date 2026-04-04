'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { queryKeys } from './query-keys';

/** Tenant configuration. */
export function useTenantConfig() {
  return useQuery({
    queryKey: queryKeys.tenantConfig,
    queryFn: () => api.tenant.getConfig(),
  });
}

/** Feature flags. */
export function useFeatureFlags() {
  return useQuery({
    queryKey: queryKeys.featureFlags,
    queryFn: () => api.tenant.listFeatures(),
  });
}

/** Tenant mutations. */
export function useTenantMutations() {
  const qc = useQueryClient();

  const updateConfig = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.tenant.updateConfig(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tenantConfig }),
  });

  const toggleFeature = useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) =>
      api.tenant.toggleFeature(key, enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.featureFlags }),
  });

  return {
    updateConfig: updateConfig.mutateAsync,
    toggleFeature: toggleFeature.mutateAsync,
    isUpdatingConfig: updateConfig.isPending,
  };
}
