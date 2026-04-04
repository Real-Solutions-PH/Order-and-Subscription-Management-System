'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { queryKeys } from './query-keys';

interface OrderListParams {
  status?: string;
  skip?: number;
  limit?: number;
}

/** Order list (paginated, filterable by status). */
export function useOrders(params?: OrderListParams) {
  return useQuery({
    queryKey: queryKeys.orders.list(params as Record<string, unknown>),
    queryFn: () => api.orders.list(params),
  });
}

/** Single order detail. */
export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.orders.detail(id!),
    queryFn: () => api.orders.get(id!),
    enabled: !!id,
  });
}

/** Order mutations: checkout, update status, cancel. */
export function useOrderMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.orders.all });

  const checkout = useMutation({
    mutationFn: (data: { delivery_address_id?: string; delivery_slot_id?: string; payment_method: string; promo_code?: string; notes?: string }) =>
      api.orders.checkout(data),
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: queryKeys.cart });
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
      api.orders.updateStatus(id, { status, notes }),
    onSuccess: invalidate,
  });

  const cancelOrder = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.orders.cancel(id, { reason }),
    onSuccess: invalidate,
  });

  return {
    checkout: checkout.mutateAsync,
    updateStatus: updateStatus.mutateAsync,
    cancelOrder: cancelOrder.mutateAsync,
    isCheckingOut: checkout.isPending,
    isUpdatingStatus: updateStatus.isPending,
  };
}
