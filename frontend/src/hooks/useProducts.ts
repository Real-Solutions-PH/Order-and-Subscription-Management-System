"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  api,
  type ProductCreate,
  type ProductIngredientAdd,
  type ProductIngredientUpdate,
  type ProductUpdate,
} from "@/lib/api-client";
import { queryKeys } from "./query-keys";

interface ProductListParams {
  skip?: number;
  limit?: number;
  status?: string;
  is_subscribable?: boolean;
  is_standalone?: boolean;
  category_id?: string;
  q?: string;
  sort_by?: string;
  sort_dir?: string;
  tag?: string;
}

/** Products catalog: list, detail, CRUD. */
export function useProducts(params?: ProductListParams) {
  return useQuery({
    queryKey: queryKeys.products.list(params as Record<string, unknown>),
    queryFn: () => api.products.list(params),
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.products.detail(id!),
    queryFn: () => api.products.get(id!),
    enabled: !!id,
  });
}

export function useProductMutations() {
  const qc = useQueryClient();
  // Track which individual product IDs have a status toggle in flight
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: queryKeys.products.all });
    qc.invalidateQueries({ queryKey: queryKeys.ingredients.all });
  };

  const createProduct = useMutation({
    mutationFn: (data: ProductCreate) => api.products.create(data),
    onSuccess: invalidate,
  });

  const updateProduct = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProductUpdate }) =>
      api.products.update(id, data),
    onSuccess: invalidate,
  });

  const deleteProduct = useMutation({
    mutationFn: (id: string) => api.products.delete(id),
    onSuccess: invalidate,
  });

  const archiveProduct = useMutation({
    mutationFn: (id: string) => api.products.archive(id),
    onSuccess: invalidate,
  });

  const activateProduct = useMutation({
    mutationFn: (id: string) => {
      setTogglingIds((prev) => new Set(prev).add(id));
      return api.products.activate(id);
    },
    onSettled: (_data, _err, id) => {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      invalidate();
    },
  });

  const deactivateProduct = useMutation({
    mutationFn: (id: string) => {
      setTogglingIds((prev) => new Set(prev).add(id));
      return api.products.deactivate(id);
    },
    onSettled: (_data, _err, id) => {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      invalidate();
    },
  });

  const addIngredient = useMutation({
    mutationFn: ({
      productId,
      data,
    }: {
      productId: string;
      data: ProductIngredientAdd;
    }) => api.products.addIngredient(productId, data),
    onSuccess: invalidate,
  });

  const updateIngredient = useMutation({
    mutationFn: ({
      productId,
      itemId,
      data,
    }: {
      productId: string;
      itemId: string;
      data: ProductIngredientUpdate;
    }) => api.products.updateIngredient(productId, itemId, data),
    onSuccess: invalidate,
  });

  const removeIngredient = useMutation({
    mutationFn: ({
      productId,
      itemId,
    }: {
      productId: string;
      itemId: string;
    }) => api.products.removeIngredient(productId, itemId),
    onSuccess: invalidate,
  });

  return {
    createProduct: createProduct.mutateAsync,
    updateProduct: updateProduct.mutateAsync,
    deleteProduct: deleteProduct.mutateAsync,
    archiveProduct: archiveProduct.mutateAsync,
    activateProduct: activateProduct.mutateAsync,
    deactivateProduct: deactivateProduct.mutateAsync,
    addIngredient: addIngredient.mutateAsync,
    updateIngredient: updateIngredient.mutateAsync,
    removeIngredient: removeIngredient.mutateAsync,
    isCreating: createProduct.isPending,
    isUpdating: updateProduct.isPending,
    isDeleting: deleteProduct.isPending,
    /** Set of product IDs currently having their status toggled. */
    togglingIds,
  };
}

/** Active catalog query. */
export function useActiveCatalog() {
  return useQuery({
    queryKey: queryKeys.catalogs.active,
    queryFn: () => api.catalogs.getActive(),
  });
}
