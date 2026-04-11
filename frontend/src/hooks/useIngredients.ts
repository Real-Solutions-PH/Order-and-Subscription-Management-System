"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

interface IngredientListParams {
  page?: number;
  per_page?: number;
  search?: string;
  sort_by?: "name" | "usage_count";
  sort_dir?: "asc" | "desc";
}

export function useIngredients(params?: IngredientListParams) {
  return useQuery({
    queryKey: ["ingredients", "list", params],
    queryFn: () => api.ingredients.list(params),
  });
}

export function useIngredient(id: string | undefined) {
  return useQuery({
    queryKey: ["ingredients", "detail", id],
    queryFn: () => api.ingredients.get(id!),
    enabled: !!id,
  });
}
