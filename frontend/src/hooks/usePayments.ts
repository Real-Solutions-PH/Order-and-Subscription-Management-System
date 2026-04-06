"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "./query-keys";

/** User's saved payment methods. */
export function usePaymentMethods() {
  return useQuery({
    queryKey: queryKeys.paymentMethods,
    queryFn: () => api.payments.listMethods(),
  });
}

/** Invoices list. */
export function useInvoices(params?: { skip?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.invoices.list(params as Record<string, unknown>),
    queryFn: () => api.payments.listInvoices(params),
  });
}

/** Payment + promo mutations. */
export function usePaymentMutations() {
  const qc = useQueryClient();

  const validatePromo = useMutation({
    mutationFn: (data: { code: string; order_amount: number }) =>
      api.payments.validatePromo(data),
  });

  const createIntent = useMutation({
    mutationFn: (data: { order_id?: string; amount: number }) =>
      api.payments.createIntent(data),
  });

  const saveMethod = useMutation({
    mutationFn: (data: { type: string; display_name: string }) =>
      api.payments.saveMethods(data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.paymentMethods }),
  });

  return {
    validatePromo: validatePromo.mutateAsync,
    createIntent: createIntent.mutateAsync,
    saveMethod: saveMethod.mutateAsync,
    isValidatingPromo: validatePromo.isPending,
  };
}
