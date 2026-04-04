"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "./query-keys";

/** Dashboard overview metrics. */
export function useDashboardMetrics(period?: string) {
  return useQuery({
    queryKey: queryKeys.analytics.dashboard(period),
    queryFn: () => api.analytics.dashboard(period),
  });
}

/** MRR breakdown by plan. */
export function useMRRBreakdown() {
  return useQuery({
    queryKey: queryKeys.analytics.mrr,
    queryFn: () => api.analytics.mrr(),
  });
}

/** Churn analysis. */
export function useChurnData(params?: {
  period_start?: string;
  period_end?: string;
}) {
  return useQuery({
    queryKey: queryKeys.analytics.churn(params as Record<string, unknown>),
    queryFn: () => api.analytics.churn(params),
  });
}

/** Popular items ranking. */
export function usePopularItems(limit?: number) {
  return useQuery({
    queryKey: queryKeys.analytics.popular(limit),
    queryFn: () => api.analytics.popularItems(limit),
  });
}

/** Cohort retention data. */
export function useCohorts() {
  return useQuery({
    queryKey: queryKeys.analytics.cohorts,
    queryFn: () => api.analytics.cohorts(),
  });
}
