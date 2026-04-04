'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Printer,
  FileText,
  ChevronDown,
  ChevronUp,
  Package,
  AlertTriangle,
} from 'lucide-react';
import { orders, meals } from '@/lib/mock-data';
import { useProductionReport } from '@/hooks';
import { Skeleton, SkeletonRow } from '@/components/ui/skeleton';

const ingredientData = [
  { ingredient: 'Chicken Breast', totalQty: '12.5 kg', mealsCount: 47 },
  { ingredient: 'Jasmine Rice', totalQty: '8.2 kg', mealsCount: 35 },
  { ingredient: 'Salmon Fillet', totalQty: '3.8 kg', mealsCount: 12 },
  { ingredient: 'Beef Sirloin', totalQty: '5.4 kg', mealsCount: 20 },
  { ingredient: 'Garlic', totalQty: '1.2 kg', mealsCount: 47 },
  { ingredient: 'Butter', totalQty: '2.1 kg', mealsCount: 30 },
  { ingredient: 'Soy Sauce', totalQty: '1.8 L', mealsCount: 25 },
  { ingredient: 'Brown Rice', totalQty: '4.5 kg', mealsCount: 18 },
  { ingredient: 'Quinoa', totalQty: '2.8 kg', mealsCount: 15 },
  { ingredient: 'Tofu', totalQty: '3.2 kg', mealsCount: 10 },
  { ingredient: 'Kimchi', totalQty: '2.0 kg', mealsCount: 8 },
  { ingredient: 'Sweet Potato', totalQty: '3.6 kg', mealsCount: 12 },
];

// Build meal breakdown from today's orders
function getMealBreakdown(selectedDate: string) {
  const todayOrders = orders.filter((o) => o.deliveryDate === selectedDate && o.status !== 'cancelled');
  const mealMap: Record<
    number,
    { name: string; quantity: number; instructions: string[] }
  > = {};

  todayOrders.forEach((order) => {
    order.items.forEach((item) => {
      if (!mealMap[item.mealId]) {
        mealMap[item.mealId] = {
          name: item.mealName,
          quantity: 0,
          instructions: [],
        };
      }
      mealMap[item.mealId].quantity += item.quantity;
      if (order.notes) {
        mealMap[item.mealId].instructions.push(
          `${order.customerName}: ${order.notes}`
        );
      }
    });
  });

  return Object.entries(mealMap).map(([mealId, data]) => {
    const meal = meals.find((m) => m.id === Number(mealId));
    return {
      ...data,
      mealId: Number(mealId),
      ingredients: meal?.ingredients || [],
      allergens: meal?.allergens || [],
    };
  });
}

function getPackingSlips(selectedDate: string) {
  return orders.filter(
    (o) => o.deliveryDate === selectedDate && o.status !== 'cancelled'
  );
}

export default function ProductionPage() {
  const [selectedDate, setSelectedDate] = useState('2026-04-01');
  const [expandedMeals, setExpandedMeals] = useState<Set<number>>(new Set());

  const productionQuery = useProductionReport(selectedDate);
  const isLoadingProduction = productionQuery.isLoading;

  // If API data is available, use it; otherwise fall back to mock-derived data
  const apiProductionItems = productionQuery.data?.items;

  const mealBreakdown = getMealBreakdown(selectedDate);
  const packingSlips = getPackingSlips(selectedDate);

  const totalMeals = apiProductionItems
    ? apiProductionItems.reduce((s, m) => s + m.quantity, 0)
    : mealBreakdown.reduce((s, m) => s + m.quantity, 0);
  const totalOrders = productionQuery.data?.total_orders ?? packingSlips.length;
  const uniqueMeals = apiProductionItems
    ? apiProductionItems.length
    : mealBreakdown.length;

  function toggleMeal(mealId: number) {
    setExpandedMeals((prev) => {
      const next = new Set(prev);
      if (next.has(mealId)) next.delete(mealId);
      else next.add(mealId);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="no-print flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-text-primary font-display">
          Production Report
        </h1>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-lg px-3 py-2.5 text-sm outline-none border border-border text-text-primary"
          />
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 bg-primary"
          >
            <Printer size={16} />
            Print Report
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors hover:opacity-90 bg-surface-white text-primary border border-primary"
          >
            <FileText size={16} />
            Generate Packing Slips
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {isLoadingProduction ? (
          <>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl p-5 text-center space-y-2 bg-surface-white shadow-card border border-border"
              >
                <Skeleton className="mx-auto h-9 w-16" />
                <Skeleton className="mx-auto h-4 w-28" />
              </div>
            ))}
          </>
        ) : (
          [{label: 'Total Meals Today', value: totalMeals},
           {label: 'Total Orders', value: totalOrders},
           {label: 'Unique Meals', value: uniqueMeals},
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="rounded-xl p-5 text-center bg-surface-white shadow-card border border-border"
            >
              <p className="text-3xl font-bold text-primary">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                {stat.label}
              </p>
            </motion.div>
          ))
        )}
      </div>

      {/* Aggregated Ingredient List */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.3 }}
        className="rounded-xl p-5 bg-surface-white shadow-card border border-border"
      >
        <h2 className="mb-4 text-base font-semibold text-text-primary">
          Aggregated Ingredient List
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-border">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Ingredient
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Total Quantity
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Across Meals
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoadingProduction ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonRow key={i} cols={3} />
                ))
              ) : (
                ingredientData.map((row, i) => (
                  <tr
                    key={row.ingredient}
                    className={`border-b border-muted ${i % 2 === 0 ? 'bg-surface-white' : 'bg-gray-50'}`}
                  >
                    <td className="px-4 py-3 font-medium text-text-primary">
                      {row.ingredient}
                    </td>
                    <td className="px-4 py-3 font-medium text-primary">
                      {row.totalQty}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {row.mealsCount} meals
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Meal-by-Meal Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="rounded-xl p-5 bg-surface-white shadow-card border border-border"
      >
        <h2 className="mb-4 text-base font-semibold text-text-primary">
          Meal-by-Meal Breakdown
        </h2>
        {isLoadingProduction ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg p-4 border border-border"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : mealBreakdown.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-secondary">
            No meals scheduled for this date.
          </p>
        ) : (
          <div className="space-y-3">
            {mealBreakdown.map((meal) => {
              const isExpanded = expandedMeals.has(meal.mealId);
              return (
                <div
                  key={meal.mealId}
                  className="rounded-lg overflow-hidden border border-border"
                >
                  <button
                    onClick={() => toggleMeal(meal.mealId)}
                    className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white bg-primary-light">
                        {meal.quantity}
                      </div>
                      <span className="text-sm font-medium text-text-primary">
                        {meal.name}{' '}
                        <span className="text-text-secondary">
                          x {meal.quantity}
                        </span>
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp size={16} className="text-text-secondary" />
                    ) : (
                      <ChevronDown size={16} className="text-text-secondary" />
                    )}
                  </button>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-3 px-4 pb-4 border-t border-border">
                          <div className="pt-3">
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                              Ingredients
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {meal.ingredients.map((ing) => (
                                <span
                                  key={ing}
                                  className="rounded-md px-2 py-1 text-xs bg-muted text-text-primary"
                                >
                                  {ing}
                                </span>
                              ))}
                            </div>
                          </div>
                          {meal.allergens.length > 0 && (
                            <div>
                              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-error">
                                Allergens
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {meal.allergens.map((a) => (
                                  <span
                                    key={a}
                                    className="rounded-md px-2 py-1 text-xs font-medium bg-error-light text-error"
                                  >
                                    {a}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {meal.instructions.length > 0 && (
                            <div>
                              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                                Special Instructions
                              </p>
                              {meal.instructions.map((inst, i) => (
                                <p
                                  key={i}
                                  className="text-xs italic text-warning-dark"
                                >
                                  {inst}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Packing Slips */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.3 }}
      >
        <h2 className="mb-4 text-base font-semibold text-text-primary">
          Packing Slips
        </h2>
        {packingSlips.length === 0 ? (
          <div className="rounded-xl p-8 text-center bg-surface-white shadow-card border border-border">
            <p className="text-sm text-text-secondary">
              No orders for this date.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {packingSlips.map((order) => {
              // Gather allergens for this order
              const orderAllergens = new Set<string>();
              order.items.forEach((item) => {
                const meal = meals.find((m) => m.id === item.mealId);
                meal?.allergens.forEach((a) => orderAllergens.add(a));
              });
              return (
                <div
                  key={order.id}
                  className="rounded-xl p-5 bg-surface-white shadow-card border border-border"
                >
                  {/* Slip header */}
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-text-primary">
                        {order.customerName}
                      </p>
                      <p
                        className="text-xs text-text-secondary"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {order.id}
                      </p>
                    </div>
                    <Package size={16} className="text-text-secondary" />
                  </div>

                  {/* Items */}
                  <div
                    className="mb-3 space-y-1 border-t border-border"
                    style={{ paddingTop: 12 }}
                  >
                    {order.items.map((item, i) => (
                      <div
                        key={i}
                        className="flex justify-between text-xs text-text-primary"
                      >
                        <span>
                          {item.mealName} x{item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Allergens */}
                  {orderAllergens.size > 0 && (
                    <div className="mb-3 flex items-start gap-2 rounded-md p-2 bg-error-light border border-error-200">
                      <AlertTriangle
                        size={14}
                        className="text-error shrink-0 mt-px"
                      />
                      <p className="text-xs font-medium text-error">
                        Allergens: {Array.from(orderAllergens).join(', ')}
                      </p>
                    </div>
                  )}

                  {/* Address */}
                  <p className="mb-3 text-xs text-text-secondary">
                    {order.address}
                  </p>

                  {/* Barcode placeholder */}
                  <div className="flex h-10 items-center justify-center rounded bg-muted border border-dashed border-gray-300">
                    <span
                      className="text-xs font-medium tracking-widest text-text-tertiary"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      BARCODE
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
