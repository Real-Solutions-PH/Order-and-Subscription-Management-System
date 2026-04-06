"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type CustomizationInput } from "@/lib/api-client";
import { queryKeys } from "./query-keys";

/**
 * Server-synced cart hook (TanStack-powered).
 *
 * Falls back gracefully when the backend is unreachable —
 * the old CartContext remains the in-memory fallback.
 */
export function useServerCart() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.cart });

  const cartQuery = useQuery({
    queryKey: queryKeys.cart,
    queryFn: () => api.cart.get(),
    retry: false,
  });

  const addItemMutation = useMutation({
    mutationFn: (data: {
      product_variant_id: string;
      quantity: number;
      customizations?: CustomizationInput[];
    }) => api.cart.addItem(data),
    onSuccess: invalidate,
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      api.cart.updateItem(itemId, { quantity }),
    onSuccess: invalidate,
  });

  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) => api.cart.removeItem(itemId),
    onSuccess: invalidate,
  });

  const clearMutation = useMutation({
    mutationFn: () => api.cart.clear(),
    onSuccess: invalidate,
  });

  const applyPromoMutation = useMutation({
    mutationFn: (code: string) => api.cart.applyPromo(code),
    onSuccess: invalidate,
  });

  return {
    cart: cartQuery.data ?? null,
    isLoading: cartQuery.isLoading,
    isError: cartQuery.isError,

    addItem: addItemMutation.mutateAsync,
    updateItem: updateItemMutation.mutateAsync,
    removeItem: removeItemMutation.mutateAsync,
    clearCart: clearMutation.mutateAsync,
    applyPromo: applyPromoMutation.mutateAsync,

    isAdding: addItemMutation.isPending,
    isUpdating: updateItemMutation.isPending,
  };
}
