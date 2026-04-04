'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, ChevronDown, Sparkles, Clock } from 'lucide-react';
import { meals, dietaryFilters, formatPeso, type Meal } from '@/lib/mock-data';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import MealCard from '@/components/MealCard';
import { useProducts } from '@/hooks';
import { SkeletonMealCard } from '@/components/ui/skeleton';
import type { ProductResponse } from '@/lib/api-client';

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

export default function LandingPage() {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [isSticky, setIsSticky] = useState(false);
  const filterBarRef = useRef<HTMLDivElement>(null);
  const menuGridRef = useRef<HTMLDivElement>(null);
  const { addItem, itemCount, total } = useCart();
  const { showToast } = useToast();

  // Fetch products from API, fall back to mock data
  const productsQuery = useProducts({ status: 'active' });
  const apiMeals = productsQuery.data?.items.map(mapProductToMeal);
  const mealsData = apiMeals && apiMeals.length > 0 ? apiMeals : meals;
  const isLoadingMeals = productsQuery.isLoading;

  // Sticky filter bar detection
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsSticky(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: '-64px 0px 0px 0px' }
    );
    if (filterBarRef.current) {
      observer.observe(filterBarRef.current);
    }
    return () => observer.disconnect();
  }, []);

  const toggleFilter = (filter: string) => {
    setActiveFilters(prev =>
      prev.includes(filter)
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  const filteredMeals = activeFilters.length === 0
    ? mealsData
    : mealsData.filter(meal =>
        activeFilters.some(filter => meal.tags.includes(filter))
      );

  const handleAddToCart = (meal: typeof meals[0]) => {
    addItem(meal);
    showToast(`${meal.name} added to cart`, 'success');
  };

  const scrollToMenu = () => {
    menuGridRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-linear-[135deg] from-primary to-primary-light">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
          <div className="relative z-10 max-w-2xl">
            {/* Weekly menu badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 bg-surface/15 border border-surface/25"
            >
              <Clock size={14} className="text-accent-light" />
              <span className="text-sm font-medium text-surface">
                Week of April 7 — Menu closes Thu 6PM
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-surface"
            >
              Your kitchen, simplified.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-5 text-lg sm:text-xl leading-relaxed text-surface/85"
            >
              Fresh, chef-prepared meals delivered to your door. Build a custom meal plan or order a la carte.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-8 flex flex-wrap gap-4"
            >
              <Link
                href="/meal-plan"
                className="inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-semibold text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.02] bg-accent"
              >
                <Sparkles size={18} />
                Build Your Meal Plan
              </Link>
              <button
                onClick={scrollToMenu}
                className="inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-semibold transition-all duration-200 hover:bg-white/10 text-surface"
                style={{ border: '2px solid rgba(254,250,224,0.4)' }}
              >
                Order A La Carte
                <ChevronDown size={18} />
              </button>
            </motion.div>
          </div>

          {/* Decorative circles */}
          <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full opacity-10 bg-primary-lighter" />
          <div
            className="absolute -bottom-10 right-40 h-48 w-48 rounded-full opacity-10 bg-accent-light"
          />
        </div>
      </section>

      {/* Sentinel for sticky detection */}
      <div ref={filterBarRef} className="h-0" />

      {/* Sticky Filter Bar */}
      <div
        className={`sticky top-16 z-40 transition-shadow duration-200 bg-surface-white border-b border-border ${
          isSticky ? 'shadow-md' : ''
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-2 pb-1">
            <span className="mr-1 shrink-0 text-sm font-medium text-text-secondary">
              Filter:
            </span>
            {dietaryFilters.map(filter => {
              const isActive = activeFilters.includes(filter);
              return (
                <button
                  key={filter}
                  onClick={() => toggleFilter(filter)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-primary text-white'
                      : 'bg-transparent text-text-primary border border-border'
                  }`}
                >
                  {filter}
                </button>
              );
            })}
            {activeFilters.length > 0 && (
              <button
                onClick={() => setActiveFilters([])}
                className="shrink-0 text-sm font-medium underline transition-colors duration-150 text-accent"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Menu Grid */}
      <section ref={menuGridRef} className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold sm:text-3xl text-text-primary">
              This Week&apos;s Menu
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {filteredMeals.length} meal{filteredMeals.length !== 1 ? 's' : ''} available
            </p>
          </div>
        </div>

        <motion.div
          layout
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          <AnimatePresence mode="popLayout">
            {isLoadingMeals
              ? Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonMealCard key={i} />
                ))
              : filteredMeals.map(meal => (
                  <motion.div
                    key={meal.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.25 }}
                  >
                    <MealCard meal={meal} onAdd={handleAddToCart} />
                  </motion.div>
                ))}
          </AnimatePresence>
        </motion.div>

        {filteredMeals.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-lg font-medium text-text-secondary">
              No meals match your filters.
            </p>
            <button
              onClick={() => setActiveFilters([])}
              className="mt-3 text-sm font-semibold underline text-accent"
            >
              Clear filters
            </button>
          </div>
        )}
      </section>

      {/* Sticky Bottom Cart Bar (mobile) */}
      <AnimatePresence>
        {itemCount > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-accent"
          >
            <Link
              href="/checkout"
              className="flex items-center justify-between px-5 py-4"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ShoppingCart size={22} className="text-white" />
                  <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold bg-primary text-white">
                    {itemCount}
                  </span>
                </div>
                <span className="text-sm font-medium text-white">
                  {itemCount} item{itemCount !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-white">{formatPeso(total)}</span>
                <span className="rounded-lg px-3 py-1.5 text-sm font-semibold bg-primary text-white">
                  View Cart
                </span>
              </div>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
