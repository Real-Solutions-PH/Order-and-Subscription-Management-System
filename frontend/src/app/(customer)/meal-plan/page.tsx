'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Star,
  Zap,
  Clock,
  ShoppingBag,
} from 'lucide-react';
import { meals, planTiers, timeSlots, formatPeso, Meal } from '@/lib/mock-data';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { useProducts, useSubscriptionPlans } from '@/hooks';
import { SkeletonMealCard, Skeleton } from '@/components/ui/skeleton';
import type { ProductResponse } from '@/lib/api-client';

interface SelectedMeal {
  meal: Meal;
  quantity: number;
  addOns: { name: string; price: number }[];
}

function mapProductToMeal(p: ProductResponse): Meal {
  const meta = (p.metadata ?? {}) as Record<string, unknown>;
  const defaultVariant = p.variants.find(v => v.is_default) ?? p.variants[0];
  const primaryImage = p.images.find(img => img.is_primary) ?? p.images[0];
  return {
    id: typeof meta.legacy_id === 'number' ? meta.legacy_id : 0,
    name: p.name,
    price: defaultVariant ? Number(defaultVariant.price) : 0,
    calories: (meta.calories as number) ?? 0,
    protein: (meta.protein as number) ?? 0,
    carbs: (meta.carbs as number) ?? 0,
    fat: (meta.fat as number) ?? 0,
    tags: (meta.tags as string[]) ?? [],
    image: primaryImage?.url ?? '/images/meals/placeholder.png',
    description: p.description ?? '',
    allergens: (meta.allergens as string[]) ?? [],
    ingredients: (meta.ingredients as string[]) ?? [],
  };
}

const ADD_ON_OPTIONS = [
  { name: 'Extra Protein', price: 50 },
  { name: 'Swap Rice for Cauliflower Rice', price: 30 },
  { name: 'Add Sauce Pack', price: 15 },
];

export default function MealPlanPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedMeals, setSelectedMeals] = useState<SelectedMeal[]>([]);
  const [frequency, setFrequency] = useState<'weekly' | 'biweekly'>('weekly');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [expandedMealId, setExpandedMealId] = useState<number | null>(null);
  const { addItem } = useCart();
  const { showToast } = useToast();

  const productsQuery = useProducts({ status: 'active' });
  const plansQuery = useSubscriptionPlans();

  const apiMeals = productsQuery.data?.items.map(mapProductToMeal);
  const mealsData = apiMeals && apiMeals.length > 0 ? apiMeals : meals;
  const isLoadingMeals = productsQuery.isLoading;

  const displayPlans = plansQuery.data?.length
    ? plansQuery.data.flatMap(plan =>
        plan.tiers.map(tier => ({
          id: tier.items_per_cycle,
          meals: tier.items_per_cycle,
          price: Number(tier.price),
          perMeal: Math.round(Number(tier.price) / tier.items_per_cycle),
          savings: 0,
          label: tier.name,
        }))
      )
    : planTiers;

  const selectedPlan = displayPlans.find(p => p.id === selectedPlanId);
  const totalMealsSelected = selectedMeals.reduce((sum, m) => sum + m.quantity, 0);

  const addOnsTotal = useMemo(
    () =>
      selectedMeals.reduce(
        (sum, m) =>
          sum + m.addOns.reduce((a, addon) => a + addon.price, 0) * m.quantity,
        0
      ),
    [selectedMeals]
  );

  const subtotal = selectedPlan ? selectedPlan.price + addOnsTotal : 0;
  const savings = selectedPlan
    ? selectedMeals.reduce((sum, m) => sum + m.meal.price * m.quantity, 0) - selectedPlan.price
    : 0;

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const steps = [
    { num: 1, label: 'Choose Plan' },
    { num: 2, label: 'Pick Meals' },
    { num: 3, label: 'Customize' },
    { num: 4, label: 'Delivery' },
  ];

  function getMealQuantity(mealId: number) {
    return selectedMeals.find(m => m.meal.id === mealId)?.quantity || 0;
  }

  function updateMealQuantity(meal: Meal, delta: number) {
    if (!selectedPlan) return;
    const current = getMealQuantity(meal.id);
    const newQty = current + delta;

    if (newQty < 0) return;
    if (delta > 0 && totalMealsSelected >= selectedPlan.meals) {
      showToast(`You can only select ${selectedPlan.meals} meals`, 'warning');
      return;
    }

    if (newQty === 0) {
      setSelectedMeals(prev => prev.filter(m => m.meal.id !== meal.id));
    } else if (current === 0) {
      setSelectedMeals(prev => [...prev, { meal, quantity: 1, addOns: [] }]);
    } else {
      setSelectedMeals(prev =>
        prev.map(m => (m.meal.id === meal.id ? { ...m, quantity: newQty } : m))
      );
    }
  }

  function toggleAddOn(mealId: number, addOn: { name: string; price: number }) {
    setSelectedMeals(prev =>
      prev.map(m => {
        if (m.meal.id !== mealId) return m;
        const hasAddon = m.addOns.some(a => a.name === addOn.name);
        return {
          ...m,
          addOns: hasAddon
            ? m.addOns.filter(a => a.name !== addOn.name)
            : [...m.addOns, addOn],
        };
      })
    );
  }

  function toggleDay(day: string) {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  }

  function canProceed() {
    switch (currentStep) {
      case 1:
        return selectedPlanId !== null;
      case 2:
        return selectedPlan ? totalMealsSelected === selectedPlan.meals : false;
      case 3:
        return true;
      case 4:
        return selectedDays.length > 0 && selectedTimeSlot !== '';
      default:
        return false;
    }
  }

  function handleProceedToCheckout() {
    selectedMeals.forEach(sm => {
      addItem(sm.meal, sm.quantity);
    });
    showToast('Meal plan added to cart!', 'success');
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="bg-primary">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <h1
            className="font-display text-3xl font-bold text-text-inverse sm:text-4xl"
          >
            Build Your Meal Plan
          </h1>
          <p className="mt-2 text-base text-surface-cream">
            Choose a plan, pick your meals, and we handle the rest.
          </p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="bg-white border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {steps.map((step, idx) => (
              <React.Fragment key={step.num}>
                <button
                  onClick={() => {
                    if (step.num < currentStep) setCurrentStep(step.num);
                  }}
                  className="flex items-center gap-2"
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                      currentStep >= step.num
                        ? 'bg-primary text-surface-white'
                        : 'bg-border text-text-secondary'
                    }`}
                  >
                    {currentStep > step.num ? <Check size={16} /> : step.num}
                  </div>
                  <span
                    className={`hidden text-sm font-medium sm:block ${
                      currentStep >= step.num ? 'text-text-primary' : 'text-text-secondary'
                    }`}
                  >
                    {step.label}
                  </span>
                </button>
                {idx < steps.length - 1 && (
                  <div
                    className={`mx-2 h-0.5 flex-1 ${
                      currentStep > step.num ? 'bg-primary' : 'bg-border'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Content + Summary */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:flex lg:gap-8 lg:px-8">
        {/* Main Content */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            {/* Step 1: Choose Plan */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h2
                  className="mb-6 text-xl font-bold text-text-primary"
                >
                  Choose Your Plan
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {plansQuery.isLoading
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton
                          key={i}
                          className="h-52 w-full rounded-2xl"
                        />
                      ))
                    : displayPlans.map(plan => {
                    const isSelected = selectedPlanId === plan.id;
                    const badge =
                      plan.meals === 10
                        ? 'Popular'
                        : plan.meals === 15
                        ? 'Best Value'
                        : null;
                    return (
                      <motion.button
                        key={plan.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setSelectedPlanId(plan.id);
                          setSelectedMeals([]);
                        }}
                        className={`relative rounded-2xl p-6 text-left transition-all duration-200 border-2 ${
                          isSelected
                            ? 'bg-primary-subtle border-primary'
                            : 'bg-surface-white border-border'
                        }`}
                      >
                        {badge && (
                          <span
                            className={`absolute -top-3 right-4 flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold text-white ${
                              badge === 'Popular' ? 'bg-accent' : 'bg-success'
                            }`}
                          >
                            {badge === 'Popular' ? (
                              <Star size={12} />
                            ) : (
                              <Zap size={12} />
                            )}
                            {badge}
                          </span>
                        )}

                        {isSelected && (
                          <div
                            className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-primary"
                          >
                            <Check size={14} className="text-white" />
                          </div>
                        )}

                        <p className="text-sm font-medium text-text-secondary">
                          {plan.label}
                        </p>
                        <p
                          className="mt-1 text-3xl font-bold text-text-primary"
                        >
                          {plan.meals} meals
                        </p>
                        <p className="mt-1 text-sm text-text-secondary">
                          per week
                        </p>

                        <div className="mt-4 border-t border-border">
                          <div className="mt-4 flex items-baseline gap-1">
                            <span
                              className="text-2xl font-bold text-primary"
                            >
                              {formatPeso(plan.price)}
                            </span>
                            <span className="text-sm text-text-secondary">
                              /week
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-text-secondary">
                            {formatPeso(plan.perMeal)} per meal
                          </p>
                          {plan.savings > 0 && (
                            <p
                              className="mt-2 text-sm font-semibold text-success"
                            >
                              Save {plan.savings}% vs a la carte
                            </p>
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Step 2: Pick Meals */}
            {currentStep === 2 && selectedPlan && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-6">
                  <h2
                    className="text-xl font-bold text-text-primary"
                  >
                    Pick Your Meals
                  </h2>
                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary">
                        {totalMealsSelected} of {selectedPlan.meals} meals selected
                      </span>
                      <span
                        className={`font-semibold ${
                          totalMealsSelected === selectedPlan.meals
                            ? 'text-success'
                            : 'text-primary'
                        }`}
                      >
                        {totalMealsSelected === selectedPlan.meals
                          ? 'All meals selected!'
                          : `${selectedPlan.meals - totalMealsSelected} more to go`}
                      </span>
                    </div>
                    <div
                      className="mt-2 h-3 overflow-hidden rounded-full bg-border"
                    >
                      <motion.div
                        className="h-full rounded-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{
                          width: `${(totalMealsSelected / selectedPlan.meals) * 100}%`,
                        }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {isLoadingMeals
                    ? Array.from({ length: 6 }).map((_, i) => (
                        <SkeletonMealCard key={i} />
                      ))
                    : mealsData.map(meal => {
                    const qty = getMealQuantity(meal.id);
                    const isSelected = qty > 0;
                    return (
                      <motion.div
                        key={meal.id}
                        whileHover={{ scale: 1.01 }}
                        className={`relative overflow-hidden rounded-2xl bg-white transition-shadow hover:shadow-lg border-2 shadow-sm ${
                          isSelected
                            ? 'border-primary'
                            : 'border-transparent'
                        }`}
                      >
                        {/* Checkmark overlay */}
                        {isSelected && (
                          <div
                            className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-success"
                          >
                            <Check size={16} className="text-white" />
                          </div>
                        )}

                        <div className="relative aspect-16/10">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={meal.image}
                            alt={meal.name}
                            className="h-full w-full object-cover"
                          />
                          {meal.tags.length > 0 && (
                            <div className="absolute left-2 top-2 flex flex-wrap gap-1">
                              {meal.tags.slice(0, 2).map(tag => (
                                <span
                                  key={tag}
                                  className="rounded-full px-2 py-0.5 text-xs font-medium text-white bg-primary-dark"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="p-4">
                          <h3
                            className="text-sm font-semibold leading-snug text-text-primary"
                          >
                            {meal.name}
                          </h3>
                          <div
                            className="mt-1 flex gap-3 text-xs text-text-secondary"
                          >
                            <span>{meal.calories} cal</span>
                            <span>{meal.protein}g protein</span>
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            <span
                              className="font-bold text-primary"
                            >
                              {formatPeso(meal.price)}
                            </span>

                            {/* Quantity selector */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateMealQuantity(meal, -1)}
                                disabled={qty === 0}
                                className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-30 ${
                                  qty > 0
                                    ? 'bg-primary text-surface-white'
                                    : 'bg-border text-text-secondary'
                                }`}
                              >
                                <Minus size={14} />
                              </button>
                              <span
                                className="w-6 text-center text-sm font-bold text-text-primary"
                              >
                                {qty}
                              </span>
                              <button
                                onClick={() => updateMealQuantity(meal, 1)}
                                disabled={totalMealsSelected >= selectedPlan.meals}
                                className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors disabled:opacity-30 bg-accent"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Step 3: Customize */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h2
                  className="mb-6 text-xl font-bold text-text-primary"
                >
                  Customize Your Meals
                </h2>

                {selectedMeals.length === 0 ? (
                  <p className="text-text-secondary">No meals selected.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedMeals.map(sm => {
                      const isExpanded = expandedMealId === sm.meal.id;
                      return (
                        <div
                          key={sm.meal.id}
                          className="overflow-hidden rounded-xl bg-white border border-border"
                        >
                          <button
                            onClick={() =>
                              setExpandedMealId(isExpanded ? null : sm.meal.id)
                            }
                            className="flex w-full items-center justify-between p-4 text-left"
                          >
                            <div className="flex items-center gap-3">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={sm.meal.image}
                                alt={sm.meal.name}
                                className="h-12 w-12 rounded-lg object-cover"
                              />
                              <div>
                                <p
                                  className="text-sm font-semibold text-text-primary"
                                >
                                  {sm.meal.name}
                                </p>
                                <p className="text-xs text-text-secondary">
                                  Qty: {sm.quantity} &middot;{' '}
                                  {formatPeso(sm.meal.price * sm.quantity)}
                                  {sm.addOns.length > 0 &&
                                    ` + ${formatPeso(
                                      sm.addOns.reduce((a, b) => a + b.price, 0) *
                                        sm.quantity
                                    )} add-ons`}
                                </p>
                              </div>
                            </div>
                            <ChevronRight
                              size={18}
                              className={`text-text-secondary transition-transform duration-200 ${
                                isExpanded ? 'rotate-90' : ''
                              }`}
                            />
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
                                  className="px-4 pb-4 border-t border-border"
                                >
                                  <p
                                    className="mb-3 mt-3 text-sm font-medium text-text-primary"
                                  >
                                    Add-ons (per serving)
                                  </p>
                                  {ADD_ON_OPTIONS.map(addon => {
                                    const isChecked = sm.addOns.some(
                                      a => a.name === addon.name
                                    );
                                    return (
                                      <label
                                        key={addon.name}
                                        className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-gray-50"
                                      >
                                        <div className="flex items-center gap-3">
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() =>
                                              toggleAddOn(sm.meal.id, addon)
                                            }
                                            className="h-4 w-4 rounded accent-primary"
                                          />
                                          <span
                                            className="text-sm text-text-primary"
                                          >
                                            {addon.name}
                                          </span>
                                        </div>
                                        <span
                                          className="text-sm font-medium text-success"
                                        >
                                          +{formatPeso(addon.price)}
                                        </span>
                                      </label>
                                    );
                                  })}
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
            )}

            {/* Step 4: Delivery Schedule */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h2
                  className="mb-6 text-xl font-bold text-text-primary"
                >
                  Delivery Schedule
                </h2>

                {/* Frequency toggle */}
                <div className="mb-8">
                  <p
                    className="mb-3 text-sm font-medium text-text-primary"
                  >
                    Delivery Frequency
                  </p>
                  <div
                    className="inline-flex overflow-hidden rounded-xl border border-border"
                  >
                    {(['weekly', 'biweekly'] as const).map(freq => (
                      <button
                        key={freq}
                        onClick={() => setFrequency(freq)}
                        className={`px-6 py-2.5 text-sm font-medium transition-colors ${
                          frequency === freq
                            ? 'bg-primary text-surface-white'
                            : 'bg-surface-white text-text-primary'
                        }`}
                      >
                        {freq === 'weekly' ? 'Weekly' : 'Bi-weekly'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Day selector */}
                <div className="mb-8">
                  <p
                    className="mb-3 text-sm font-medium text-text-primary"
                  >
                    Preferred Delivery Day(s)
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {days.map(day => {
                      const isSelected = selectedDays.includes(day);
                      return (
                        <button
                          key={day}
                          onClick={() => toggleDay(day)}
                          className={`flex h-14 w-14 items-center justify-center rounded-xl text-sm font-semibold transition-all duration-150 ${
                            isSelected
                              ? 'bg-primary text-surface-white'
                              : 'bg-surface-white text-text-primary border border-border'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time slot selector */}
                <div>
                  <p
                    className="mb-3 text-sm font-medium text-text-primary"
                  >
                    Preferred Time Slot
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {timeSlots.map(slot => {
                      const isSelected = selectedTimeSlot === slot;
                      return (
                        <button
                          key={slot}
                          onClick={() => setSelectedTimeSlot(slot)}
                          className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-150 ${
                            isSelected
                              ? 'bg-primary text-surface-white'
                              : 'bg-surface-white text-text-primary border border-border'
                          }`}
                        >
                          <Clock size={14} />
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Summary Sidebar */}
        <div className="mt-8 lg:mt-0 lg:w-80 lg:shrink-0">
          <div
            className="sticky top-24 rounded-2xl bg-white p-6 border border-border shadow-sm"
          >
            <h3
              className="text-lg font-bold text-text-primary"
            >
              Plan Summary
            </h3>

            {selectedPlan ? (
              <>
                <div
                  className="mt-3 rounded-lg px-3 py-2 bg-primary-subtle"
                >
                  <p className="text-sm font-semibold text-primary">
                    {selectedPlan.label} — {selectedPlan.meals} meals/week
                  </p>
                </div>

                {/* Selected meals list */}
                {selectedMeals.length > 0 && (
                  <div
                    className="mt-4 max-h-48 overflow-y-auto border-t border-border"
                  >
                    {selectedMeals.map(sm => (
                      <div
                        key={sm.meal.id}
                        className="flex items-center justify-between py-2 text-sm border-b border-muted"
                      >
                        <div className="flex-1 pr-2">
                          <p
                            className="font-medium leading-tight text-text-primary"
                          >
                            {sm.meal.name}
                          </p>
                          {sm.addOns.length > 0 && (
                            <p className="text-xs text-success">
                              +{sm.addOns.map(a => a.name).join(', ')}
                            </p>
                          )}
                        </div>
                        <span className="text-text-secondary">x{sm.quantity}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Totals */}
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Plan price</span>
                    <span className="text-text-primary">
                      {formatPeso(selectedPlan.price)}
                    </span>
                  </div>
                  {addOnsTotal > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Add-ons</span>
                      <span className="text-text-primary">
                        {formatPeso(addOnsTotal)}
                      </span>
                    </div>
                  )}
                  {savings > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-success">Subscription savings</span>
                      <span className="font-semibold text-success">
                        -{formatPeso(savings)}
                      </span>
                    </div>
                  )}
                  <div
                    className="flex justify-between pt-2 text-base font-bold border-t border-border"
                  >
                    <span className="text-text-primary">Total</span>
                    <span className="text-primary">{formatPeso(subtotal)}</span>
                  </div>
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm text-text-secondary">
                Select a plan to get started.
              </p>
            )}

            {/* Navigation buttons */}
            <div className="mt-6 space-y-3">
              {currentStep === 4 ? (
                <Link
                  href="/checkout"
                  onClick={handleProceedToCheckout}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-base font-semibold text-white transition-opacity hover:opacity-90 ${
                    canProceed() ? 'bg-accent pointer-events-auto' : 'bg-gray-300 pointer-events-none'
                  }`}
                >
                  <ShoppingBag size={18} />
                  Proceed to Checkout
                </Link>
              ) : (
                <button
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  disabled={!canProceed()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40 bg-accent"
                >
                  Continue
                  <ChevronRight size={18} />
                </button>
              )}

              {currentStep > 1 && (
                <button
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-base font-semibold transition-colors hover:bg-gray-50 text-text-primary border border-border"
                >
                  <ChevronLeft size={18} />
                  Back
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
