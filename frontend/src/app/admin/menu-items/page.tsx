"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  X,
  Loader2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { useProducts, useProductMutations } from "@/hooks";
import { useAuthContext } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import Modal from "@/components/Modal";
import MealImage from "@/components/MealImage";
import { SkeletonRow } from "@/components/ui/skeleton";
import type {
  ProductResponse,
  ProductCreate,
  ProductUpdate,
  ProductIngredientAdd,
  ProductIngredientResponse,
} from "@/lib/api-client";
import { api } from "@/lib/api-client";
import { ALL_TAGS, ALL_ALLERGENS } from "@/lib/constants";

type StatusFilter = "all" | "active" | "draft" | "archived";
type SortField = "name" | "price" | "status" | "created_at";
type SortDir = "asc" | "desc";

// ── Status badge ─────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    active: { bg: "#D1FAE5", text: "#065F46", label: "Active" },
    draft: { bg: "#FEF3C7", text: "#92400E", label: "Draft" },
    inactive: { bg: "#FEE2E2", text: "#991B1B", label: "Inactive" },
    archived: { bg: "#F3F4F6", text: "#6B7280", label: "Archived" },
  };
  const s = styles[status] ?? styles.draft;
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  );
}

// ── Sort icon ─────────────────────────────────────────────────────────

function SortIcon({
  field,
  sortField,
  sortDir,
}: {
  field: SortField;
  sortField: SortField;
  sortDir: SortDir;
}) {
  if (field !== sortField) return null;
  return sortDir === "asc" ? (
    <ChevronUp size={13} />
  ) : (
    <ChevronDown size={13} />
  );
}

// ── Helpers ──────────────────────────────────────────────────────────

function getPrice(product: ProductResponse): number {
  const v = product.variants.find((v) => v.is_default) ?? product.variants[0];
  return v ? Number(v.price) : 0;
}
function formatPeso(n: number) {
  return "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 2 });
}
function getMeta(product: ProductResponse) {
  return (product.metadata ?? {}) as Record<string, unknown>;
}

// ── Ingredient row in form ────────────────────────────────────────────

interface IngredientRow {
  id?: string;  // set if already saved to the backend
  uid: string;  // client-side stable key for React (always set, even for unsaved rows)
  name: string;
  quantity: string;
  unit: string;
  notes: string;
}

// ── Main component ────────────────────────────────────────────────────

export default function MenuItemsPage() {
  const { isSuperAdmin } = useAuthContext();
  const { showToast } = useToast();

  // ── Query state ──────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const productsQuery = useProducts({
    page,
    per_page: 20,
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    sort_by: sortField !== "price" ? sortField : undefined, // price sort is client-side (not a backend param)
    sort_dir: sortDir,
    tag: tagFilter ?? undefined,
  });

  const {
    createProduct,
    updateProduct,
    deleteProduct,
    activateProduct,
    deactivateProduct,
    addIngredient,
    updateIngredient,
    removeIngredient,
    isCreating,
    isUpdating,
    isDeleting,
    togglingIds,
  } = useProductMutations();

  // ── Modal state ──────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductResponse | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<ProductResponse | null>(
    null,
  );
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // ── Form state ───────────────────────────────────────────────────
  const [form, setForm] = useState({
    name: "",
    description: "",
    short_description: "",
    sku: "",
    status: "draft" as string,
    is_subscribable: false,
    is_standalone: true,
    price: "",
    compare_at_price: "",
    imageUrl: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    tags: [] as string[],
    allergens: [] as string[],
  });
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
  const [newIngredient, setNewIngredient] = useState<IngredientRow>({
    uid: "",
    name: "",
    quantity: "",
    unit: "",
    notes: "",
  });

  function resetForm() {
    setForm({
      name: "",
      description: "",
      short_description: "",
      sku: "",
      status: "draft",
      is_subscribable: false,
      is_standalone: true,
      price: "",
      compare_at_price: "",
      imageUrl: "",
      calories: "",
      protein: "",
      carbs: "",
      fat: "",
      tags: [],
      allergens: [],
    });
    setIngredients([]);
    setNewIngredient({ uid: "", name: "", quantity: "", unit: "", notes: "" });
  }

  function openCreate() {
    resetForm();
    setEditingProduct(null);
    setModalOpen(true);
  }

  function openEdit(product: ProductResponse) {
    const meta = getMeta(product);
    const defaultVariant =
      product.variants.find((v) => v.is_default) ?? product.variants[0];
    const primaryImage =
      product.images.find((img) => img.is_primary) ?? product.images[0];
    setForm({
      name: product.name,
      description: product.description ?? "",
      short_description: product.short_description ?? "",
      sku: product.sku ?? "",
      status: product.status,
      is_subscribable: product.is_subscribable,
      is_standalone: product.is_standalone,
      price: defaultVariant ? String(defaultVariant.price) : "",
      compare_at_price: defaultVariant?.compare_at_price
        ? String(defaultVariant.compare_at_price)
        : "",
      imageUrl: primaryImage?.url ?? "",
      calories: String((meta.calories as number) ?? ""),
      protein: String((meta.protein as number) ?? ""),
      carbs: String((meta.carbs as number) ?? ""),
      fat: String((meta.fat as number) ?? ""),
      tags: (meta.tags as string[]) ?? [],
      allergens: (meta.allergens as string[]) ?? [],
    });
    setIngredients(
      (product.product_ingredients ?? []).map((pi: ProductIngredientResponse) => ({
        id: pi.id,
        uid: pi.id,
        name: pi.ingredient.name,
        quantity: pi.quantity != null ? String(pi.quantity) : "",
        unit: pi.unit ?? "",
        notes: pi.notes ?? "",
      })),
    );
    setNewIngredient({ name: "", quantity: "", unit: "", notes: "" });
    setEditingProduct(product);
    setModalOpen(true);
  }

  // ── Save handler ─────────────────────────────────────────────────
  async function handleSave() {
    if (!form.name.trim()) {
      showToast("Name is required", "error");
      return;
    }

    const metadata: Record<string, unknown> = {};
    if (form.calories) metadata.calories = Number(form.calories);
    if (form.protein) metadata.protein = Number(form.protein);
    if (form.carbs) metadata.carbs = Number(form.carbs);
    if (form.fat) metadata.fat = Number(form.fat);
    if (form.tags.length) metadata.tags = form.tags;
    if (form.allergens.length) metadata.allergens = form.allergens;

    try {
      let savedProduct: ProductResponse;

      if (editingProduct) {
        const updateData: ProductUpdate = {
          name: form.name,
          description: form.description || undefined,
          short_description: form.short_description || undefined,
          sku: form.sku || undefined,
          status: form.status,
          is_subscribable: form.is_subscribable,
          is_standalone: form.is_standalone,
          metadata: Object.keys(metadata).length ? metadata : undefined,
        };
        savedProduct = await updateProduct({
          id: editingProduct.id,
          data: updateData,
        });

        // Sync ingredients: remove deleted ones (parallel)
        const existingIds = new Set(
          ingredients.filter((i) => i.id).map((i) => i.id!),
        );
        const originalIds = new Set(
          (editingProduct.product_ingredients ?? []).map((pi) => pi.id),
        );
        await Promise.all(
          [...originalIds]
            .filter((origId) => !existingIds.has(origId))
            .map((origId) =>
              removeIngredient({ productId: editingProduct.id, itemId: origId }),
            ),
        );

        // Update existing ingredient quantities/units/notes (parallel)
        await Promise.all(
          ingredients
            .filter((ing) => ing.id)
            .map((ing) =>
              updateIngredient({
                productId: editingProduct.id,
                itemId: ing.id!,
                data: {
                  quantity: ing.quantity ? Number(ing.quantity) : null,
                  unit: ing.unit || null,
                  notes: ing.notes || null,
                },
              }),
            ),
        );

        // Add new ones (no id) — sequential to avoid duplicate-name race conditions
        for (const ing of ingredients) {
          if (!ing.id && ing.name.trim()) {
            await addIngredient({
              productId: editingProduct.id,
              data: {
                name: ing.name,
                quantity: ing.quantity ? Number(ing.quantity) : undefined,
                unit: ing.unit || undefined,
                notes: ing.notes || undefined,
              } as ProductIngredientAdd,
            });
          }
        }
        showToast(`"${form.name}" updated successfully`);
      } else {
        const createData: ProductCreate = {
          name: form.name,
          description: form.description || undefined,
          short_description: form.short_description || undefined,
          sku: form.sku || undefined,
          status: form.status,
          is_subscribable: form.is_subscribable,
          is_standalone: form.is_standalone,
          metadata: Object.keys(metadata).length ? metadata : undefined,
        };
        savedProduct = await createProduct(createData);

        // Add default variant if price provided
        if (form.price) {
          await api.products.addVariant(savedProduct.id, {
            name: "Default",
            sku: `${savedProduct.id}-default`,
            price: Number(form.price),
            is_default: true,
          });
        }

        // Add ingredients
        for (const ing of ingredients) {
          if (ing.name.trim()) {
            await addIngredient({
              productId: savedProduct.id,
              data: {
                name: ing.name,
                quantity: ing.quantity ? Number(ing.quantity) : undefined,
                unit: ing.unit || undefined,
                notes: ing.notes || undefined,
              } as ProductIngredientAdd,
            });
          }
        }
        showToast(`"${form.name}" created successfully`);
      }

      setModalOpen(false);
      resetForm();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      showToast(msg, "error");
    }
  }

  // ── Delete handler ───────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteProduct(deleteTarget.id);
      showToast(`"${deleteTarget.name}" deleted`);
      setDeleteModalOpen(false);
      setDeleteTarget(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete";
      showToast(msg, "error");
    }
  }

  // ── Toggle status ────────────────────────────────────────────────
  async function handleToggleStatus(product: ProductResponse) {
    try {
      if (product.status === "active") {
        await deactivateProduct(product.id);
        showToast(`"${product.name}" deactivated`);
      } else {
        await activateProduct(product.id);
        showToast(`"${product.name}" activated`);
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to update status";
      showToast(msg, "error");
    }
  }

  // ── Ingredient management in form ────────────────────────────────
  function addIngredientRow() {
    if (!newIngredient.name.trim()) return;
    setIngredients((prev) => [
      ...prev,
      { ...newIngredient, uid: crypto.randomUUID() },
    ]);
    setNewIngredient({ name: "", quantity: "", unit: "", notes: "", uid: "" });
  }

  function removeIngredientRow(idx: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateIngredientRow(
    idx: number,
    field: keyof IngredientRow,
    value: string,
  ) {
    setIngredients((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)),
    );
  }

  // ── Toggle tag/allergen ──────────────────────────────────────────
  function toggleTag(tag: string) {
    setForm((f) => ({
      ...f,
      tags: f.tags.includes(tag)
        ? f.tags.filter((t) => t !== tag)
        : [...f.tags, tag],
    }));
  }
  function toggleAllergen(a: string) {
    setForm((f) => ({
      ...f,
      allergens: f.allergens.includes(a)
        ? f.allergens.filter((x) => x !== a)
        : [...f.allergens, a],
    }));
  }

  // ── Sort toggle ──────────────────────────────────────────────────
  const toggleSort = useCallback(
    (field: SortField) => {
      if (field === sortField) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      else setSortDir("asc");
      setSortField(field);
    },
    [sortField],
  );

  // Tag filter and name/status/created_at sort are passed to the API.
  // Price sort remains client-side (no backend support for variant-price ordering).
  const rawItems = productsQuery.data?.items ?? [];
  const sortedItems =
    sortField === "price"
      ? [...rawItems].sort((a, b) => {
          const cmp = getPrice(a) - getPrice(b);
          return sortDir === "asc" ? cmp : -cmp;
        })
      : rawItems;

  const total = productsQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const statusTabs: { label: string; value: StatusFilter }[] = [
    { label: "All", value: "all" },
    { label: "Active", value: "active" },
    { label: "Draft", value: "draft" },
    { label: "Deactivated", value: "archived" },
  ];

  const isBusy = isCreating || isUpdating;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{
              fontFamily: "'DM Serif Display', serif",
              color: "#1A1A2E",
            }}
          >
            Menu Items
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "#6B7280" }}>
            {total} item{total !== 1 ? "s" : ""} in catalog
          </p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: "#40916C" }}
          >
            <Plus size={16} />
            Add Menu Item
          </button>
        )}
      </div>

      {/* Filters */}
      <div
        className="rounded-xl bg-white p-4 shadow-sm"
        style={{ border: "1px solid #E5E7EB" }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "#9CA3AF" }}
            />
            <input
              type="text"
              aria-label="Search menu items"
              placeholder="Search menu items..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2"
              style={
                {
                  border: "1px solid #E5E7EB",
                  color: "#1A1A2E",
                  "--tw-ring-color": "#40916C",
                } as React.CSSProperties
              }
            />
          </div>
          {/* Tag filter */}
          <select
            value={tagFilter ?? ""}
            onChange={(e) => {
              setTagFilter(e.target.value || null);
              setPage(1);
            }}
            className="rounded-lg py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2"
            style={{ border: "1px solid #E5E7EB", color: "#1A1A2E" }}
          >
            <option value="">All Tags</option>
            {ALL_TAGS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        {/* Status tabs */}
        <div className="mt-3 flex flex-wrap gap-1">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatusFilter(tab.value);
                setPage(1);
              }}
              className="rounded-full px-3 py-1 text-sm font-medium transition-colors"
              style={
                statusFilter === tab.value
                  ? { backgroundColor: "#1A1A2E", color: "#FFFFFF" }
                  : { backgroundColor: "#F3F4F6", color: "#6B7280" }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div
        className="overflow-hidden rounded-xl bg-white shadow-sm"
        style={{ border: "1px solid #E5E7EB" }}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead
              style={{
                backgroundColor: "#F9FAFB",
                borderBottom: "1px solid #E5E7EB",
              }}
            >
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "#6B7280" }}
                >
                  Item
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "#6B7280" }}
                  onClick={() => toggleSort("status")}
                  aria-sort={sortField === "status" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                >
                  <span className="inline-flex items-center gap-1">
                    Status{" "}
                    <SortIcon
                      field="status"
                      sortField={sortField}
                      sortDir={sortDir}
                    />
                  </span>
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "#6B7280" }}
                  onClick={() => toggleSort("price")}
                  aria-sort={sortField === "price" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                >
                  <span className="inline-flex items-center gap-1">
                    Price{" "}
                    <SortIcon
                      field="price"
                      sortField={sortField}
                      sortDir={sortDir}
                    />
                  </span>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "#6B7280" }}
                >
                  Tags
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "#6B7280" }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "#F3F4F6" }}>
              {productsQuery.isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5} className="px-4 py-3">
                        <SkeletonRow />
                      </td>
                    </tr>
                  ))
                : productsQuery.isError
                  ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-red-500">
                        Failed to load menu items. Please refresh and try again.
                      </td>
                    </tr>
                  )
                : sortedItems.map((product) => {
                    const meta = getMeta(product);
                    const tags = (meta.tags as string[]) ?? [];
                    const primaryImage =
                      product.images.find((img) => img.is_primary) ??
                      product.images[0];
                    return (
                      <motion.tr
                        key={product.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="transition-colors hover:bg-gray-50"
                      >
                        {/* Item */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="h-10 w-14 flex-shrink-0 overflow-hidden rounded-md"
                              style={{ border: "1px solid #E5E7EB" }}
                            >
                              <MealImage
                                src={
                                  primaryImage?.url ??
                                  "/images/meals/placeholder.png"
                                }
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <div>
                              <p
                                className="font-medium"
                                style={{ color: "#1A1A2E" }}
                              >
                                {product.name}
                              </p>
                              {product.short_description && (
                                <p
                                  className="mt-0.5 max-w-xs truncate text-xs"
                                  style={{ color: "#9CA3AF" }}
                                >
                                  {product.short_description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        {/* Status */}
                        <td className="px-4 py-3">
                          <StatusBadge status={product.status} />
                        </td>
                        {/* Price */}
                        <td
                          className="px-4 py-3 font-medium"
                          style={{ color: "#1A1A2E" }}
                        >
                          {(() => {
                            const price = getPrice(product);
                            return price > 0 ? (
                              formatPeso(price)
                            ) : (
                              <span style={{ color: "#9CA3AF" }}>—</span>
                            );
                          })()}
                        </td>
                        {/* Tags */}
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                                style={{
                                  backgroundColor: "#D1FAE5",
                                  color: "#065F46",
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                            {tags.length > 3 && (
                              <span
                                className="rounded-full px-2 py-0.5 text-[10px]"
                                style={{
                                  backgroundColor: "#F3F4F6",
                                  color: "#6B7280",
                                }}
                              >
                                +{tags.length - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEdit(product)}
                              title="Edit"
                              className="rounded-lg p-1.5 transition-colors hover:bg-gray-100"
                              style={{ color: "#6B7280" }}
                            >
                              <Pencil size={15} />
                            </button>
                            {isSuperAdmin && (
                              <>
                                <button
                                  onClick={() => handleToggleStatus(product)}
                                  disabled={togglingIds.has(product.id)}
                                  role="switch"
                                  aria-checked={product.status === "active"}
                                  aria-label={
                                    product.status === "active"
                                      ? `Deactivate ${product.name}`
                                      : `Activate ${product.name}`
                                  }
                                  title={
                                    product.status === "active"
                                      ? "Deactivate"
                                      : "Activate"
                                  }
                                  className="rounded-lg p-1.5 transition-colors hover:bg-gray-100 disabled:opacity-40"
                                  style={{
                                    color:
                                      product.status === "active"
                                        ? "#40916C"
                                        : "#9CA3AF",
                                  }}
                                >
                                  {product.status === "active" ? (
                                    <ToggleRight size={18} />
                                  ) : (
                                    <ToggleLeft size={18} />
                                  )}
                                </button>
                                <button
                                  onClick={() => {
                                    setDeleteTarget(product);
                                    setDeleteModalOpen(true);
                                  }}
                                  title="Delete"
                                  className="rounded-lg p-1.5 transition-colors hover:bg-red-50"
                                  style={{ color: "#EF4444" }}
                                >
                                  <Trash2 size={15} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {!productsQuery.isLoading && sortedItems.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-base font-medium" style={{ color: "#6B7280" }}>
              No menu items found.
            </p>
            {isSuperAdmin && (
              <button
                onClick={openCreate}
                className="mt-3 text-sm font-semibold underline"
                style={{ color: "#40916C" }}
              >
                Add your first item
              </button>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: "1px solid #E5E7EB" }}
          >
            <p className="text-sm" style={{ color: "#6B7280" }}>
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 hover:bg-gray-100"
                style={{ border: "1px solid #E5E7EB", color: "#6B7280" }}
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 hover:bg-gray-100"
                style={{ border: "1px solid #E5E7EB", color: "#6B7280" }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ─────────────────────────────────────────── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
        title={
          editingProduct
            ? isSuperAdmin
              ? "Edit Menu Item"
              : "View Menu Item"
            : "Add Menu Item"
        }
        size="lg"
      >
        <div className="max-h-[75vh] space-y-5 overflow-y-auto pr-1">
          {/* Basic info */}
          <section>
            <h3
              className="mb-3 text-sm font-semibold uppercase tracking-wide"
              style={{ color: "#6B7280" }}
            >
              Basic Info
            </h3>
            <div className="space-y-3">
              <div>
                <label
                  className="mb-1 block text-sm font-medium"
                  style={{ color: "#1A1A2E" }}
                >
                  Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  disabled={!isSuperAdmin}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 disabled:bg-gray-50"
                  style={{ border: "1px solid #E5E7EB", color: "#1A1A2E" }}
                />
              </div>
              <div>
                <label
                  className="mb-1 block text-sm font-medium"
                  style={{ color: "#1A1A2E" }}
                >
                  Description
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  disabled={!isSuperAdmin}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 disabled:bg-gray-50"
                  style={{ border: "1px solid #E5E7EB", color: "#1A1A2E" }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className="mb-1 block text-sm font-medium"
                    style={{ color: "#1A1A2E" }}
                  >
                    Short Description
                  </label>
                  <input
                    type="text"
                    value={form.short_description}
                    disabled={!isSuperAdmin}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        short_description: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none disabled:bg-gray-50"
                    style={{ border: "1px solid #E5E7EB", color: "#1A1A2E" }}
                  />
                </div>
                <div>
                  <label
                    className="mb-1 block text-sm font-medium"
                    style={{ color: "#1A1A2E" }}
                  >
                    SKU
                  </label>
                  <input
                    type="text"
                    value={form.sku}
                    disabled={!isSuperAdmin}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, sku: e.target.value }))
                    }
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none disabled:bg-gray-50"
                    style={{ border: "1px solid #E5E7EB", color: "#1A1A2E" }}
                  />
                </div>
              </div>
              <div>
                <label
                  className="mb-1 block text-sm font-medium"
                  style={{ color: "#1A1A2E" }}
                >
                  Image URL
                </label>
                <input
                  type="text"
                  value={form.imageUrl}
                  disabled={!isSuperAdmin}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, imageUrl: e.target.value }))
                  }
                  placeholder="https://..."
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none disabled:bg-gray-50"
                  style={{ border: "1px solid #E5E7EB", color: "#1A1A2E" }}
                />
              </div>
            </div>
          </section>

          {/* Settings + Status */}
          <section>
            <h3
              className="mb-3 text-sm font-semibold uppercase tracking-wide"
              style={{ color: "#6B7280" }}
            >
              Settings
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  className="mb-1 block text-sm font-medium"
                  style={{ color: "#1A1A2E" }}
                >
                  Status
                </label>
                <select
                  value={form.status}
                  disabled={!isSuperAdmin}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, status: e.target.value }))
                  }
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none disabled:bg-gray-50"
                  style={{ border: "1px solid #E5E7EB", color: "#1A1A2E" }}
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <label
                  className="flex cursor-pointer items-center gap-2 text-sm"
                  style={{ color: "#1A1A2E" }}
                >
                  <input
                    type="checkbox"
                    checked={form.is_subscribable}
                    disabled={!isSuperAdmin}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        is_subscribable: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded"
                  />
                  Subscribable
                </label>
                <label
                  className="flex cursor-pointer items-center gap-2 text-sm"
                  style={{ color: "#1A1A2E" }}
                >
                  <input
                    type="checkbox"
                    checked={form.is_standalone}
                    disabled={!isSuperAdmin}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        is_standalone: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded"
                  />
                  Standalone (Ala Carte)
                </label>
              </div>
            </div>
          </section>

          {/* Nutritional info */}
          <section>
            <h3
              className="mb-3 text-sm font-semibold uppercase tracking-wide"
              style={{ color: "#6B7280" }}
            >
              Nutritional Info
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(["calories", "protein", "carbs", "fat"] as const).map(
                (field) => (
                  <div key={field}>
                    <label
                      className="mb-1 block text-xs capitalize"
                      style={{ color: "#6B7280" }}
                    >
                      {field} {field === "calories" ? "(kcal)" : "(g)"}
                    </label>
                    <input
                      type="number"
                      value={form[field]}
                      disabled={!isSuperAdmin}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, [field]: e.target.value }))
                      }
                      className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none disabled:bg-gray-50"
                      style={{ border: "1px solid #E5E7EB", color: "#1A1A2E" }}
                    />
                  </div>
                ),
              )}
            </div>
          </section>

          {/* Dietary Tags */}
          <section>
            <h3
              className="mb-3 text-sm font-semibold uppercase tracking-wide"
              style={{ color: "#6B7280" }}
            >
              Dietary Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {ALL_TAGS.map((tag) => (
                <label
                  key={tag}
                  className="flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: form.tags.includes(tag)
                      ? "#D1FAE5"
                      : "#F3F4F6",
                    color: form.tags.includes(tag) ? "#065F46" : "#6B7280",
                    border: form.tags.includes(tag)
                      ? "1px solid #6EE7B7"
                      : "1px solid #E5E7EB",
                    opacity: isSuperAdmin ? 1 : 0.7,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.tags.includes(tag)}
                    onChange={() => isSuperAdmin && toggleTag(tag)}
                    className="sr-only"
                  />
                  {tag}
                </label>
              ))}
            </div>
          </section>

          {/* Allergens */}
          <section>
            <h3
              className="mb-3 text-sm font-semibold uppercase tracking-wide"
              style={{ color: "#6B7280" }}
            >
              Allergens
            </h3>
            <div className="flex flex-wrap gap-2">
              {ALL_ALLERGENS.map((a) => (
                <label
                  key={a}
                  className="flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: form.allergens.includes(a)
                      ? "#FEE2E2"
                      : "#F3F4F6",
                    color: form.allergens.includes(a) ? "#991B1B" : "#6B7280",
                    border: form.allergens.includes(a)
                      ? "1px solid #FCA5A5"
                      : "1px solid #E5E7EB",
                    opacity: isSuperAdmin ? 1 : 0.7,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.allergens.includes(a)}
                    onChange={() => isSuperAdmin && toggleAllergen(a)}
                    className="sr-only"
                  />
                  {a}
                </label>
              ))}
            </div>
          </section>

          {/* Recipe / Ingredients */}
          <section>
            <h3
              className="mb-3 text-sm font-semibold uppercase tracking-wide"
              style={{ color: "#6B7280" }}
            >
              Recipe / Ingredients
            </h3>

            {/* Existing ingredient rows */}
            {ingredients.length > 0 && (
              <div
                className="mb-3 overflow-hidden rounded-lg"
                style={{ border: "1px solid #E5E7EB" }}
              >
                <table className="min-w-full text-xs">
                  <thead style={{ backgroundColor: "#F9FAFB" }}>
                    <tr>
                      <th
                        className="px-3 py-2 text-left font-semibold"
                        style={{ color: "#6B7280" }}
                      >
                        Ingredient
                      </th>
                      <th
                        className="px-3 py-2 text-left font-semibold"
                        style={{ color: "#6B7280" }}
                      >
                        Qty
                      </th>
                      <th
                        className="px-3 py-2 text-left font-semibold"
                        style={{ color: "#6B7280" }}
                      >
                        Unit
                      </th>
                      <th
                        className="px-3 py-2 text-left font-semibold"
                        style={{ color: "#6B7280" }}
                      >
                        Notes
                      </th>
                      {isSuperAdmin && <th className="px-3 py-2" />}
                    </tr>
                  </thead>
                  <tbody
                    className="divide-y"
                    style={{ borderColor: "#F3F4F6" }}
                  >
                    {ingredients.map((row, idx) => (
                      <tr key={row.uid || row.id || idx}>
                        <td className="px-3 py-2">
                          {isSuperAdmin ? (
                            <input
                              type="text"
                              value={row.name}
                              onChange={(e) =>
                                updateIngredientRow(idx, "name", e.target.value)
                              }
                              className="w-full rounded px-2 py-1 text-xs focus:outline-none"
                              style={{ border: "1px solid #E5E7EB" }}
                            />
                          ) : (
                            <span style={{ color: "#1A1A2E" }}>{row.name}</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {isSuperAdmin ? (
                            <input
                              type="number"
                              value={row.quantity}
                              onChange={(e) =>
                                updateIngredientRow(
                                  idx,
                                  "quantity",
                                  e.target.value,
                                )
                              }
                              className="w-20 rounded px-2 py-1 text-xs focus:outline-none"
                              style={{ border: "1px solid #E5E7EB" }}
                            />
                          ) : (
                            <span>{row.quantity || "—"}</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {isSuperAdmin ? (
                            <input
                              type="text"
                              value={row.unit}
                              onChange={(e) =>
                                updateIngredientRow(idx, "unit", e.target.value)
                              }
                              placeholder="g, ml..."
                              className="w-20 rounded px-2 py-1 text-xs focus:outline-none"
                              style={{ border: "1px solid #E5E7EB" }}
                            />
                          ) : (
                            <span>{row.unit || "—"}</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {isSuperAdmin ? (
                            <input
                              type="text"
                              value={row.notes}
                              onChange={(e) =>
                                updateIngredientRow(
                                  idx,
                                  "notes",
                                  e.target.value,
                                )
                              }
                              className="w-full rounded px-2 py-1 text-xs focus:outline-none"
                              style={{ border: "1px solid #E5E7EB" }}
                            />
                          ) : (
                            <span>{row.notes || "—"}</span>
                          )}
                        </td>
                        {isSuperAdmin && (
                          <td className="px-3 py-2">
                            <button
                              onClick={() => removeIngredientRow(idx)}
                              className="text-red-400 hover:text-red-600"
                            >
                              <X size={13} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Add ingredient row */}
            {isSuperAdmin && (
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[120px]">
                  <label
                    className="mb-1 block text-xs"
                    style={{ color: "#6B7280" }}
                  >
                    Ingredient name
                  </label>
                  <input
                    type="text"
                    value={newIngredient.name}
                    onChange={(e) =>
                      setNewIngredient((n) => ({ ...n, name: e.target.value }))
                    }
                    onKeyDown={(e) => e.key === "Enter" && addIngredientRow()}
                    placeholder="e.g. Chicken breast"
                    className="w-full rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1"
                    style={{ border: "1px solid #E5E7EB" }}
                  />
                </div>
                <div className="w-20">
                  <label
                    className="mb-1 block text-xs"
                    style={{ color: "#6B7280" }}
                  >
                    Qty
                  </label>
                  <input
                    type="number"
                    value={newIngredient.quantity}
                    onChange={(e) =>
                      setNewIngredient((n) => ({
                        ...n,
                        quantity: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                    style={{ border: "1px solid #E5E7EB" }}
                  />
                </div>
                <div className="w-20">
                  <label
                    className="mb-1 block text-xs"
                    style={{ color: "#6B7280" }}
                  >
                    Unit
                  </label>
                  <input
                    type="text"
                    value={newIngredient.unit}
                    onChange={(e) =>
                      setNewIngredient((n) => ({ ...n, unit: e.target.value }))
                    }
                    placeholder="g, ml..."
                    className="w-full rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                    style={{ border: "1px solid #E5E7EB" }}
                  />
                </div>
                <div className="flex-1 min-w-[100px]">
                  <label
                    className="mb-1 block text-xs"
                    style={{ color: "#6B7280" }}
                  >
                    Notes
                  </label>
                  <input
                    type="text"
                    value={newIngredient.notes}
                    onChange={(e) =>
                      setNewIngredient((n) => ({ ...n, notes: e.target.value }))
                    }
                    className="w-full rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                    style={{ border: "1px solid #E5E7EB" }}
                  />
                </div>
                <button
                  onClick={addIngredientRow}
                  disabled={!newIngredient.name.trim()}
                  className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-colors disabled:opacity-40"
                  style={{ backgroundColor: "#40916C" }}
                >
                  <Plus size={14} /> Add
                </button>
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div
          className="mt-4 flex justify-end gap-3 pt-4"
          style={{ borderTop: "1px solid #E5E7EB" }}
        >
          <button
            onClick={() => {
              setModalOpen(false);
              resetForm();
            }}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-100"
            style={{ color: "#6B7280", border: "1px solid #E5E7EB" }}
          >
            Cancel
          </button>
          {isSuperAdmin && (
            <button
              onClick={handleSave}
              disabled={isBusy}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "#1B4332" }}
            >
              {isBusy && <Loader2 size={14} className="animate-spin" />}
              {editingProduct ? "Save Changes" : "Create Item"}
            </button>
          )}
        </div>
      </Modal>

      {/* ── Delete Confirmation Modal ───────────────────────────────────── */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeleteTarget(null);
        }}
        title="Delete Menu Item"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm" style={{ color: "#6B7280" }}>
            Are you sure you want to permanently delete{" "}
            <strong>&ldquo;{deleteTarget?.name}&rdquo;</strong>? This action
            cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setDeleteModalOpen(false);
                setDeleteTarget(null);
              }}
              className="rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-100"
              style={{ color: "#6B7280", border: "1px solid #E5E7EB" }}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "#EF4444" }}
            >
              {isDeleting && <Loader2 size={14} className="animate-spin" />}
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
