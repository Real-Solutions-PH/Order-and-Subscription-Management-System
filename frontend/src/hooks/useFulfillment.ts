"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "./query-keys";

/** Delivery zones list. */
export function useDeliveryZones() {
  return useQuery({
    queryKey: queryKeys.deliveryZones,
    queryFn: () => api.fulfillment.listZones(),
  });
}

/** Available delivery slots for a zone+date. */
export function useDeliverySlots(
  zoneId: string | undefined,
  date: string | undefined,
) {
  return useQuery({
    queryKey: queryKeys.deliverySlots(zoneId!, date!),
    queryFn: () => api.fulfillment.listSlots({ zone_id: zoneId!, date: date! }),
    enabled: !!zoneId && !!date,
  });
}

/** User's addresses. */
export function useAddresses() {
  return useQuery({
    queryKey: queryKeys.addresses,
    queryFn: () => api.fulfillment.listAddresses(),
  });
}

/** Production report for a date (admin). */
export function useProductionReport(date: string) {
  return useQuery({
    queryKey: queryKeys.productionReport(date),
    queryFn: () => api.fulfillment.getProductionReport(date),
  });
}

/** Fulfillment mutations. */
export function useFulfillmentMutations() {
  const qc = useQueryClient();

  const createAddress = useMutation({
    mutationFn: (data: {
      label: string;
      line_1: string;
      line_2?: string;
      city: string;
      province: string;
      postal_code: string;
      is_default?: boolean;
      notes?: string;
    }) => api.fulfillment.createAddress(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.addresses }),
  });

  const updateAddress = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<{
        label: string;
        line_1: string;
        line_2: string | null;
        city: string;
        province: string;
        postal_code: string;
        is_default: boolean;
        notes: string | null;
      }>;
    }) => api.fulfillment.updateAddress(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.addresses }),
  });

  const deleteAddress = useMutation({
    mutationFn: (id: string) => api.fulfillment.deleteAddress(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.addresses }),
  });

  const createZone = useMutation({
    mutationFn: (data: {
      name: string;
      delivery_fee: number;
      boundaries: Record<string, unknown>;
      cutoff_hours: number;
    }) => api.fulfillment.createZone(data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.deliveryZones }),
  });

  const updateFulfillmentStatus = useMutation({
    mutationFn: ({
      id,
      status,
      notes,
    }: {
      id: string;
      status: string;
      notes?: string;
    }) => api.fulfillment.updateFulfillmentStatus(id, { status, notes }),
  });

  return {
    createAddress: createAddress.mutateAsync,
    updateAddress: updateAddress.mutateAsync,
    deleteAddress: deleteAddress.mutateAsync,
    createZone: createZone.mutateAsync,
    updateFulfillmentStatus: updateFulfillmentStatus.mutateAsync,
    isCreatingAddress: createAddress.isPending,
    isUpdatingAddress: updateAddress.isPending,
    isDeletingAddress: deleteAddress.isPending,
  };
}
