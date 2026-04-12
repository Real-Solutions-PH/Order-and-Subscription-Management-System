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
    mutationFn: (data: {
      type: string;
      display_name: string;
      paymongo_method_id?: string;
      last_four?: string;
      card_brand?: string;
      is_default?: boolean;
    }) => api.payments.saveMethods(data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.paymentMethods }),
  });

  const updateMethod = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { display_name?: string; is_default?: boolean };
    }) => api.payments.updateMethod(id, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.paymentMethods }),
  });

  const deleteMethod = useMutation({
    mutationFn: (id: string) => api.payments.deleteMethod(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.paymentMethods }),
  });

  return {
    validatePromo: validatePromo.mutateAsync,
    createIntent: createIntent.mutateAsync,
    saveMethod: saveMethod.mutateAsync,
    updateMethod: updateMethod.mutateAsync,
    deleteMethod: deleteMethod.mutateAsync,
    isValidatingPromo: validatePromo.isPending,
    isSavingMethod: saveMethod.isPending,
    isDeletingMethod: deleteMethod.isPending,
  };
}
