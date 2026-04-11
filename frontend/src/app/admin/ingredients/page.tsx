"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronUp, ChevronDown, ChevronRight } from "lucide-react";
import { useIngredients } from "@/hooks";

type SortBy = "name" | "usage_count";
type SortDir = "asc" | "desc";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    active: { bg: "#D1FAE5", text: "#065F46", label: "Active" },
    draft: { bg: "#FEF3C7", text: "#92400E", label: "Draft" },
    archived: { bg: "#F3F4F6", text: "#6B7280", label: "Deactivated" },
  };
  const s = styles[status] ?? styles.draft;
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  );
}

function SortIcon({
  field,
  sortBy,
  sortDir,
}: {
  field: SortBy;
  sortBy: SortBy;
  sortDir: SortDir;
}) {
  if (field !== sortBy) return null;
  return sortDir === "asc" ? (
    <ChevronUp size={13} />
  ) : (
    <ChevronDown size={13} />
  );
}

export default function IngredientsPage() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const query = useIngredients({
    page,
    per_page: 50,
    search: search || undefined,
    sort_by: sortBy,
    sort_dir: sortDir,
  });
  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.ceil(total / 50);

  function toggleSort(field: SortBy) {
    if (field === sortBy) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
    setPage(1);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "'DM Serif Display', serif", color: "#1A1A2E" }}
        >
          Ingredient Inventory
        </h1>
        <p className="mt-0.5 text-sm" style={{ color: "#6B7280" }}>
          {total} ingredient{total !== 1 ? "s" : ""} across all menu items
        </p>
      </div>

      {/* Search + sort controls */}
      <div
        className="rounded-xl bg-white p-4 shadow-sm"
        style={{ border: "1px solid #E5E7EB" }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "#9CA3AF" }}
            />
            <input
              type="text"
              placeholder="Search ingredients..."
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
                } as React.CSSProperties
              }
            />
          </div>
          <div
            className="flex items-center gap-2 text-sm"
            style={{ color: "#6B7280" }}
          >
            <span className="font-medium">Sort by:</span>
            <button
              onClick={() => toggleSort("name")}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 font-medium transition-colors"
              style={
                sortBy === "name"
                  ? { backgroundColor: "#1A1A2E", color: "#FFFFFF" }
                  : { backgroundColor: "#F3F4F6", color: "#6B7280" }
              }
            >
              Name <SortIcon field="name" sortBy={sortBy} sortDir={sortDir} />
            </button>
            <button
              onClick={() => toggleSort("usage_count")}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 font-medium transition-colors"
              style={
                sortBy === "usage_count"
                  ? { backgroundColor: "#1A1A2E", color: "#FFFFFF" }
                  : { backgroundColor: "#F3F4F6", color: "#6B7280" }
              }
            >
              Usage{" "}
              <SortIcon field="usage_count" sortBy={sortBy} sortDir={sortDir} />
            </button>
          </div>
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
                  Ingredient
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "#6B7280" }}
                  onClick={() => toggleSort("usage_count")}
                >
                  <span className="inline-flex items-center gap-1">
                    Used In{" "}
                    <SortIcon
                      field="usage_count"
                      sortBy={sortBy}
                      sortDir={sortDir}
                    />
                  </span>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "#6B7280" }}
                >
                  Default Unit
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "#6B7280" }}
                >
                  Description
                </th>
                <th className="px-4 py-3 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "#F3F4F6" }}>
              {query.isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5} className="px-4 py-3">
                        <div
                          className="h-5 animate-pulse rounded"
                          style={{ backgroundColor: "#F3F4F6" }}
                        />
                      </td>
                    </tr>
                  ))
                : items.map((ingredient) => {
                    const isExpanded = expandedId === ingredient.id;
                    const usageCount = ingredient.used_in_products.length;
                    return (
                      <React.Fragment key={ingredient.id}>
                        <motion.tr
                          layout
                          className={`transition-colors ${usageCount > 0 ? "cursor-pointer hover:bg-gray-50" : ""}`}
                          onClick={() =>
                            usageCount > 0 &&
                            setExpandedId(isExpanded ? null : ingredient.id)
                          }
                        >
                          {/* Name */}
                          <td className="px-4 py-3">
                            <span
                              className="font-medium"
                              style={{ color: "#1A1A2E" }}
                            >
                              {ingredient.name}
                            </span>
                          </td>
                          {/* Usage count */}
                          <td className="px-4 py-3">
                            {usageCount > 0 ? (
                              <span
                                className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                                style={{
                                  backgroundColor: "#DBEAFE",
                                  color: "#1E40AF",
                                }}
                              >
                                {usageCount} item{usageCount !== 1 ? "s" : ""}
                              </span>
                            ) : (
                              <span
                                className="text-xs"
                                style={{ color: "#9CA3AF" }}
                              >
                                Unused
                              </span>
                            )}
                          </td>
                          {/* Unit */}
                          <td
                            className="px-4 py-3 text-sm"
                            style={{ color: "#6B7280" }}
                          >
                            {ingredient.default_unit ?? (
                              <span style={{ color: "#D1D5DB" }}>—</span>
                            )}
                          </td>
                          {/* Description */}
                          <td
                            className="px-4 py-3 text-sm"
                            style={{ color: "#6B7280" }}
                          >
                            {ingredient.description ? (
                              <span className="max-w-xs truncate block">
                                {ingredient.description}
                              </span>
                            ) : (
                              <span style={{ color: "#D1D5DB" }}>—</span>
                            )}
                          </td>
                          {/* Expand toggle */}
                          <td className="px-4 py-3 text-right">
                            {usageCount > 0 && (
                              <ChevronRight
                                size={15}
                                className="ml-auto transition-transform"
                                style={{
                                  color: "#9CA3AF",
                                  transform: isExpanded
                                    ? "rotate(90deg)"
                                    : "rotate(0deg)",
                                }}
                              />
                            )}
                          </td>
                        </motion.tr>

                        {/* Expanded: menu items using this ingredient */}
                        <AnimatePresence>
                          {isExpanded && (
                            <tr>
                              <td colSpan={5} className="px-0 py-0">
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div
                                    className="flex flex-wrap gap-2 px-4 py-3"
                                    style={{
                                      backgroundColor: "#F9FAFB",
                                      borderTop: "1px solid #F3F4F6",
                                    }}
                                  >
                                    <span
                                      className="mr-1 self-center text-xs font-medium"
                                      style={{ color: "#9CA3AF" }}
                                    >
                                      Used in:
                                    </span>
                                    {ingredient.used_in_products.map((prod) => (
                                      <div
                                        key={prod.id}
                                        className="flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium"
                                        style={{
                                          backgroundColor: "#FFFFFF",
                                          border: "1px solid #E5E7EB",
                                          color: "#1A1A2E",
                                        }}
                                      >
                                        {prod.name}
                                        <StatusBadge status={prod.status} />
                                      </div>
                                    ))}
                                  </div>
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    );
                  })}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {!query.isLoading && items.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-base font-medium" style={{ color: "#6B7280" }}>
              No ingredients found.
            </p>
            <p className="mt-1 text-sm" style={{ color: "#9CA3AF" }}>
              Ingredients are added when creating or editing menu items.
            </p>
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
    </div>
  );
}
