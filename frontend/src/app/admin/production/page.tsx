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
        <h1
          className="text-2xl font-bold"
          style={{ color: '#1A1A2E', fontFamily: "'DM Serif Display', serif" }}
        >
          Production Report
        </h1>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-lg px-3 py-2.5 text-sm outline-none"
            style={{ border: '1px solid #E5E7EB', color: '#1A1A2E' }}
          />
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: '#1B4332' }}
          >
            <Printer size={16} />
            Print Report
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors hover:opacity-90"
            style={{
              backgroundColor: '#FFFFFF',
              color: '#1B4332',
              border: '1px solid #1B4332',
            }}
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
                className="rounded-xl p-5 text-center space-y-2"
                style={{
                  backgroundColor: '#FFFFFF',
                  boxShadow: 'var(--shadow-card)',
                  border: '1px solid #E5E7EB',
                }}
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
              className="rounded-xl p-5 text-center"
              style={{
                backgroundColor: '#FFFFFF',
                boxShadow: 'var(--shadow-card)',
                border: '1px solid #E5E7EB',
              }}
            >
              <p
                className="text-3xl font-bold"
                style={{ color: '#1B4332' }}
              >
                {stat.value}
              </p>
              <p className="mt-1 text-sm" style={{ color: '#6B7280' }}>
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
        className="rounded-xl p-5"
        style={{
          backgroundColor: '#FFFFFF',
          boxShadow: 'var(--shadow-card)',
          border: '1px solid #E5E7EB',
        }}
      >
        <h2
          className="mb-4 text-base font-semibold"
          style={{ color: '#1A1A2E' }}
        >
          Aggregated Ingredient List
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: '#6B7280' }}
                >
                  Ingredient
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: '#6B7280' }}
                >
                  Total Quantity
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: '#6B7280' }}
                >
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
                    style={{
                      borderBottom: '1px solid #F3F4F6',
                      backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#F9FAFB',
                    }}
                  >
                    <td
                      className="px-4 py-3 font-medium"
                      style={{ color: '#1A1A2E' }}
                    >
                      {row.ingredient}
                    </td>
                    <td
                      className="px-4 py-3 font-medium"
                      style={{ color: '#1B4332' }}
                    >
                      {row.totalQty}
                    </td>
                    <td className="px-4 py-3" style={{ color: '#6B7280' }}>
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
        className="rounded-xl p-5"
        style={{
          backgroundColor: '#FFFFFF',
          boxShadow: 'var(--shadow-card)',
          border: '1px solid #E5E7EB',
        }}
      >
        <h2
          className="mb-4 text-base font-semibold"
          style={{ color: '#1A1A2E' }}
        >
          Meal-by-Meal Breakdown
        </h2>
        {isLoadingProduction ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg p-4"
                style={{ border: '1px solid #E5E7EB' }}
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : mealBreakdown.length === 0 ? (
          <p className="py-8 text-center text-sm" style={{ color: '#6B7280' }}>
            No meals scheduled for this date.
          </p>
        ) : (
          <div className="space-y-3">
            {mealBreakdown.map((meal) => {
              const isExpanded = expandedMeals.has(meal.mealId);
              return (
                <div
                  key={meal.mealId}
                  className="rounded-lg overflow-hidden"
                  style={{ border: '1px solid #E5E7EB' }}
                >
                  <button
                    onClick={() => toggleMeal(meal.mealId)}
                    className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
                        style={{ backgroundColor: '#2D6A4F' }}
                      >
                        {meal.quantity}
                      </div>
                      <span
                        className="text-sm font-medium"
                        style={{ color: '#1A1A2E' }}
                      >
                        {meal.name}{' '}
                        <span style={{ color: '#6B7280' }}>
                          x {meal.quantity}
                        </span>
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp size={16} style={{ color: '#6B7280' }} />
                    ) : (
                      <ChevronDown size={16} style={{ color: '#6B7280' }} />
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
                        <div
                          className="space-y-3 px-4 pb-4"
                          style={{ borderTop: '1px solid #E5E7EB' }}
                        >
                          <div className="pt-3">
                            <p
                              className="mb-1 text-xs font-semibold uppercase tracking-wider"
                              style={{ color: '#6B7280' }}
                            >
                              Ingredients
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {meal.ingredients.map((ing) => (
                                <span
                                  key={ing}
                                  className="rounded-md px-2 py-1 text-xs"
                                  style={{
                                    backgroundColor: '#F3F4F6',
                                    color: '#1A1A2E',
                                  }}
                                >
                                  {ing}
                                </span>
                              ))}
                            </div>
                          </div>
                          {meal.allergens.length > 0 && (
                            <div>
                              <p
                                className="mb-1 text-xs font-semibold uppercase tracking-wider"
                                style={{ color: '#DC2626' }}
                              >
                                Allergens
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {meal.allergens.map((a) => (
                                  <span
                                    key={a}
                                    className="rounded-md px-2 py-1 text-xs font-medium"
                                    style={{
                                      backgroundColor: '#FEE2E2',
                                      color: '#DC2626',
                                    }}
                                  >
                                    {a}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {meal.instructions.length > 0 && (
                            <div>
                              <p
                                className="mb-1 text-xs font-semibold uppercase tracking-wider"
                                style={{ color: '#6B7280' }}
                              >
                                Special Instructions
                              </p>
                              {meal.instructions.map((inst, i) => (
                                <p
                                  key={i}
                                  className="text-xs italic"
                                  style={{ color: '#92400E' }}
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
        <h2
          className="mb-4 text-base font-semibold"
          style={{ color: '#1A1A2E' }}
        >
          Packing Slips
        </h2>
        {packingSlips.length === 0 ? (
          <div
            className="rounded-xl p-8 text-center"
            style={{
              backgroundColor: '#FFFFFF',
              boxShadow: 'var(--shadow-card)',
              border: '1px solid #E5E7EB',
            }}
          >
            <p className="text-sm" style={{ color: '#6B7280' }}>
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
                  className="rounded-xl p-5"
                  style={{
                    backgroundColor: '#FFFFFF',
                    boxShadow: 'var(--shadow-card)',
                    border: '1px solid #E5E7EB',
                  }}
                >
                  {/* Slip header */}
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <p
                        className="text-sm font-semibold"
                        style={{ color: '#1A1A2E' }}
                      >
                        {order.customerName}
                      </p>
                      <p
                        className="text-xs"
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          color: '#6B7280',
                        }}
                      >
                        {order.id}
                      </p>
                    </div>
                    <Package size={16} style={{ color: '#6B7280' }} />
                  </div>

                  {/* Items */}
                  <div
                    className="mb-3 space-y-1"
                    style={{ borderTop: '1px solid #E5E7EB', paddingTop: 12 }}
                  >
                    {order.items.map((item, i) => (
                      <div
                        key={i}
                        className="flex justify-between text-xs"
                        style={{ color: '#1A1A2E' }}
                      >
                        <span>
                          {item.mealName} x{item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Allergens */}
                  {orderAllergens.size > 0 && (
                    <div
                      className="mb-3 flex items-start gap-2 rounded-md p-2"
                      style={{
                        backgroundColor: '#FEF2F2',
                        border: '1px solid #FECACA',
                      }}
                    >
                      <AlertTriangle
                        size={14}
                        style={{ color: '#DC2626', flexShrink: 0, marginTop: 1 }}
                      />
                      <p className="text-xs font-medium" style={{ color: '#DC2626' }}>
                        Allergens: {Array.from(orderAllergens).join(', ')}
                      </p>
                    </div>
                  )}

                  {/* Address */}
                  <p className="mb-3 text-xs" style={{ color: '#6B7280' }}>
                    {order.address}
                  </p>

                  {/* Barcode placeholder */}
                  <div
                    className="flex h-10 items-center justify-center rounded"
                    style={{
                      backgroundColor: '#F3F4F6',
                      border: '1px dashed #D1D5DB',
                    }}
                  >
                    <span
                      className="text-xs font-medium tracking-widest"
                      style={{
                        color: '#9CA3AF',
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
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
