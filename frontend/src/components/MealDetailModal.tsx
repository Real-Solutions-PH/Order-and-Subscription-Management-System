"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, AlertTriangle } from "lucide-react";
import { Meal, formatPeso } from "@/lib/mock-data";
import MealImage from "@/components/MealImage";

interface MealDetailModalProps {
  meal: Meal | null;
  onClose: () => void;
  onAdd: (meal: Meal) => void;
}

export default function MealDetailModal({
  meal,
  onClose,
  onAdd,
}: MealDetailModalProps) {
  if (!meal) return null;

  const handleAdd = () => {
    onAdd(meal);
    onClose();
  };

  const macros = [
    { label: "Calories", value: meal.calories, unit: "kcal" },
    { label: "Protein", value: meal.protein, unit: "g" },
    { label: "Carbs", value: meal.carbs, unit: "g" },
    { label: "Fat", value: meal.fat, unit: "g" },
    { label: "Fiber", value: meal.fiber, unit: "g" },
    { label: "Sugar", value: meal.sugar, unit: "g" },
    { label: "Sodium", value: meal.sodium, unit: "mg" },
  ];

  return (
    <AnimatePresence>
      {meal && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal panel */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-lg rounded-t-3xl bg-white sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
            style={{ maxHeight: "90dvh", overflowY: "auto" }}
          >
            {/* Image */}
            <div className="relative" style={{ aspectRatio: "16/7" }}>
              <MealImage
                src={meal.image}
                alt={meal.name}
                className="h-full w-full rounded-t-3xl object-cover sm:rounded-t-3xl"
              />
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
                aria-label="Close"
              >
                <X size={16} />
              </button>
              {/* Dietary tags */}
              {meal.tags.length > 0 && (
                <div className="absolute left-3 top-3 flex flex-wrap gap-1">
                  {meal.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                      style={{ backgroundColor: "rgba(27,67,50,0.85)" }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Body */}
            <div className="px-5 pb-8 pt-4">
              {/* Name + serving size */}
              <div className="flex items-start justify-between gap-3">
                <h2
                  className="text-xl font-bold leading-snug"
                  style={{ color: "#1A1A2E" }}
                >
                  {meal.name}
                </h2>
                <span
                  className="mt-0.5 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}
                >
                  {meal.serving_size}
                </span>
              </div>

              {/* Description */}
              {meal.description && (
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "#6B7280" }}>
                  {meal.description}
                </p>
              )}

              {/* Macros grid */}
              <div className="mt-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>
                  Nutrition Facts
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {macros.map(({ label, value, unit }) => (
                    <div
                      key={label}
                      className="rounded-xl p-2.5 text-center"
                      style={{ backgroundColor: "#F9FAFB" }}
                    >
                      <p
                        className="text-sm font-bold"
                        style={{ color: "#1A1A2E" }}
                      >
                        {value}
                        <span className="text-xs font-normal" style={{ color: "#9CA3AF" }}>
                          {unit}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs" style={{ color: "#6B7280" }}>
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Allergens */}
              {meal.allergens.length > 0 && (
                <div className="mt-4">
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>
                    <AlertTriangle size={12} style={{ color: "#F59E0B" }} />
                    Allergens
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {meal.allergens.map((allergen) => (
                      <span
                        key={allergen}
                        className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
                      >
                        {allergen}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Ingredients */}
              {meal.ingredients.length > 0 && (
                <div className="mt-4">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>
                    Main Ingredients
                  </h3>
                  <p className="text-sm" style={{ color: "#374151" }}>
                    {meal.ingredients.join(", ")}
                  </p>
                </div>
              )}

              {/* Price + CTA */}
              <div className="mt-5 flex items-center justify-between">
                <span className="text-2xl font-bold" style={{ color: "#1B4332" }}>
                  {formatPeso(meal.price)}
                </span>
                <button
                  onClick={handleAdd}
                  className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: "#E76F51" }}
                >
                  <Plus size={16} />
                  Add to Cart
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
