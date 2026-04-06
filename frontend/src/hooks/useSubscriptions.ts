"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "./query-keys";

/** Subscription plans list. */
export function useSubscriptionPlans() {
  return useQuery({
    queryKey: queryKeys.subscriptionPlans,
    queryFn: () => api.subscriptions.listPlans(),
  });
}

/** Single subscription detail. */
export function useSubscription(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.subscriptions.detail(id!),
    queryFn: () => api.subscriptions.get(id!),
    enabled: !!id,
  });
}

/** Subscription cycles. */
export function useSubscriptionCycles(subId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.subscriptions.cycles(subId!),
    queryFn: () => api.subscriptions.listCycles(subId!),
    enabled: !!subId,
  });
}

/** Subscription mutations: create, pause, resume, cancel, modify, skip cycle, set selections. */
export function useSubscriptionMutations() {
  const qc = useQueryClient();

  const invalidateSub = (id: string) => {
    qc.invalidateQueries({ queryKey: queryKeys.subscriptions.detail(id) });
    qc.invalidateQueries({ queryKey: queryKeys.subscriptions.cycles(id) });
  };

  const createSubscription = useMutation({
    mutationFn: (data: { plan_tier_id: string; payment_method_id?: string }) =>
      api.subscriptions.create(data),
  });

  const pauseSubscription = useMutation({
    mutationFn: ({ id, resume_date }: { id: string; resume_date?: string }) =>
      api.subscriptions.pause(id, resume_date ? { resume_date } : undefined),
    onSuccess: (_, vars) => invalidateSub(vars.id),
  });

  const resumeSubscription = useMutation({
    mutationFn: (id: string) => api.subscriptions.resume(id),
    onSuccess: (_, id) => invalidateSub(id),
  });

  const cancelSubscription = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.subscriptions.cancel(id, { reason }),
    onSuccess: (_, vars) => invalidateSub(vars.id),
  });

  const modifyPlan = useMutation({
    mutationFn: ({
      id,
      new_plan_tier_id,
    }: {
      id: string;
      new_plan_tier_id: string;
    }) => api.subscriptions.modifyPlan(id, { new_plan_tier_id }),
    onSuccess: (_, vars) => invalidateSub(vars.id),
  });

  const skipCycle = useMutation({
    mutationFn: ({ subId, cycleId }: { subId: string; cycleId: string }) =>
      api.subscriptions.skipCycle(subId, cycleId),
    onSuccess: (_, vars) => invalidateSub(vars.subId),
  });

  const setSelections = useMutation({
    mutationFn: ({
      subId,
      cycleId,
      selections,
    }: {
      subId: string;
      cycleId: string;
      selections: { product_variant_id: string; quantity?: number }[];
    }) => api.subscriptions.setSelections(subId, cycleId, selections),
    onSuccess: (_, vars) => invalidateSub(vars.subId),
  });

  return {
    createSubscription: createSubscription.mutateAsync,
    pauseSubscription: pauseSubscription.mutateAsync,
    resumeSubscription: resumeSubscription.mutateAsync,
    cancelSubscription: cancelSubscription.mutateAsync,
    modifyPlan: modifyPlan.mutateAsync,
    skipCycle: skipCycle.mutateAsync,
    setSelections: setSelections.mutateAsync,
    isCreating: createSubscription.isPending,
    isPausing: pauseSubscription.isPending,
    isCancelling: cancelSubscription.isPending,
  };
}
