'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type ProductCreate, type ProductUpdate } from '@/lib/api-client';
import { queryKeys } from './query-keys';

interface ProductListParams {
  skip?: number;
  limit?: number;
  status?: string;
  is_subscribable?: boolean;
  is_standalone?: boolean;
  category_id?: string;
  q?: string;
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
  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.products.all });

  const createProduct = useMutation({
    mutationFn: (data: ProductCreate) => api.products.create(data),
    onSuccess: invalidate,
  });

  const updateProduct = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProductUpdate }) => api.products.update(id, data),
    onSuccess: invalidate,
  });

  const archiveProduct = useMutation({
    mutationFn: (id: string) => api.products.archive(id),
    onSuccess: invalidate,
  });

  return {
    createProduct: createProduct.mutateAsync,
    updateProduct: updateProduct.mutateAsync,
    archiveProduct: archiveProduct.mutateAsync,
    isCreating: createProduct.isPending,
    isUpdating: updateProduct.isPending,
  };
}

/** Active catalog query. */
export function useActiveCatalog() {
  return useQuery({
    queryKey: queryKeys.catalogs.active,
    queryFn: () => api.catalogs.getActive(),
  });
}
