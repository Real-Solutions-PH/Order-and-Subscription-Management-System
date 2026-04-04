'use client';

import React, { useState, useMemo, useCallback, DragEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Plus,
  Upload,
  ChevronDown,
  ChevronUp,
  GripVertical,
} from 'lucide-react';
import { meals, formatPeso } from '@/lib/mock-data';
import type { Meal } from '@/lib/mock-data';
import Modal from '@/components/Modal';
import { useToast } from '@/context/ToastContext';
import { useProducts, useProductMutations } from '@/hooks';
import { SkeletonMealCard } from '@/components/ui/skeleton';
import type { ProductResponse } from '@/lib/api-client';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const FULL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const ALL_ALLERGENS = ['Dairy', 'Eggs', 'Gluten', 'Soy', 'Peanuts', 'Fish', 'Shellfish', 'Sesame'];
const ALL_TAGS = [
  'High Protein', 'Keto-Friendly', 'Vegan', 'Vegetarian', 'Gluten-Free',
  'Filipino Classic', 'Dairy-Free', 'Low Carb', 'Diabetic-Friendly',
  'Spicy', 'Filipino Fusion', 'Halal',
];

const initialCalendar: Record<string, number[]> = {
  Mon: [1, 4, 7],
  Tue: [2, 5, 8],
  Wed: [3, 6, 9],
  Thu: [1, 10, 11],
  Fri: [2, 4, 12],
  Sat: [3, 7],
  Sun: [5, 9],
};

function getWeekLabel(offset: number): string {
  const base = new Date(2026, 3, 7);
  const start = new Date(base);
  start.setDate(start.getDate() + offset * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (start.getMonth() === end.getMonth()) {
    return `Week of ${monthNames[start.getMonth()]} ${start.getDate()}-${end.getDate()}`;
  }
  return `Week of ${monthNames[start.getMonth()]} ${start.getDate()} - ${monthNames[end.getMonth()]} ${end.getDate()}`;
}

const menuHistory = [
  { weekLabel: 'Mar 31 - Apr 6', mealCount: 14, meals: ['Garlic Butter Chicken', 'Beef Tapa', 'Salmon Teriyaki Bowl', 'Vegan Buddha Bowl', 'Chicken Adobo'] },
  { weekLabel: 'Mar 24 - Mar 30', mealCount: 12, meals: ['Korean BBQ Beef', 'Mediterranean Quinoa Salad', 'Tofu Sisig', 'Herb-Crusted Pork', 'Shrimp Pad Thai'] },
  { weekLabel: 'Mar 17 - Mar 23', mealCount: 13, meals: ['Chicken Kare-Kare', 'Grilled Fish Sinigang', 'Garlic Butter Chicken', 'Vegan Buddha Bowl', 'Beef Tapa'] },
  { weekLabel: 'Mar 10 - Mar 16', mealCount: 11, meals: ['Salmon Teriyaki Bowl', 'Chicken Adobo', 'Korean BBQ Beef', 'Tofu Sisig', 'Mediterranean Quinoa Salad'] },
];

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

interface DragData {
  mealId: number;
  sourceDay?: string; // undefined if from library
}

export default function MenuManagementPage() {
  const { showToast } = useToast();

  const productsQuery = useProducts();
  const { updateProduct, isUpdating } = useProductMutations();
  const isLoadingProducts = productsQuery.isLoading;

  const apiMeals = productsQuery.data?.items.map(mapProductToMeal);
  const mealsData = apiMeals && apiMeals.length > 0 ? apiMeals : meals;

  const [weekOffset, setWeekOffset] = useState(0);
  const [calendar, setCalendar] = useState<Record<string, number[]>>(initialCalendar);
  const [searchQuery, setSearchQuery] = useState('');
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [expandedHistory, setExpandedHistory] = useState<number | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);

  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    price: 0,
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    tags: [] as string[],
    allergens: [] as string[],
    available: true,
    image: '',
  });

  const filteredMeals = useMemo(() => {
    if (!searchQuery.trim()) return mealsData;
    const q = searchQuery.toLowerCase();
    return mealsData.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [searchQuery, mealsData]);

  const getMealById = useCallback((id: number) => mealsData.find((m) => m.id === id), [mealsData]);

  // --- Drag and Drop ---
  const handleDragStart = useCallback((e: DragEvent, mealId: number, sourceDay?: string) => {
    const data: DragData = { mealId, sourceDay };
    e.dataTransfer.setData('application/json', JSON.stringify(data));
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: DragEvent, day: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDay(day);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverDay(null);
  }, []);

  const handleDrop = useCallback((e: DragEvent, targetDay: string) => {
    e.preventDefault();
    setDragOverDay(null);

    try {
      const data: DragData = JSON.parse(e.dataTransfer.getData('application/json'));
      const { mealId, sourceDay } = data;

      setCalendar((prev) => {
        const updated = { ...prev };

        // Remove from source day if moving between days
        if (sourceDay && sourceDay !== targetDay) {
          updated[sourceDay] = (updated[sourceDay] || []).filter((id) => id !== mealId);
        }

        // Don't add duplicate on same day
        if (sourceDay === targetDay) return prev;

        const targetMeals = updated[targetDay] || [];
        if (!targetMeals.includes(mealId)) {
          updated[targetDay] = [...targetMeals, mealId];
        }

        return updated;
      });

      const meal = getMealById(mealId);
      if (sourceDay && sourceDay !== targetDay) {
        showToast(`Moved ${meal?.name || 'meal'} from ${sourceDay} to ${targetDay}`);
      } else if (!sourceDay) {
        showToast(`Added ${meal?.name || 'meal'} to ${targetDay}`);
      }
    } catch {
      // ignore invalid drag data
    }
  }, [showToast, getMealById]);

  // Remove meal from day
  function handleRemoveFromDay(day: string, mealId: number) {
    setCalendar((prev) => ({
      ...prev,
      [day]: (prev[day] || []).filter((id) => id !== mealId),
    }));
  }

  // Open meal editor
  function openMealEditor(meal: Meal) {
    setEditingMeal(meal);
    setEditForm({
      name: meal.name,
      description: meal.description,
      price: meal.price,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      tags: [...meal.tags],
      allergens: [...meal.allergens],
      available: true,
      image: meal.image,
    });
  }

  async function handleSaveMeal() {
    if (editingMeal) {
      // Try API update if we have a matching product
      const matchingProduct = productsQuery.data?.items.find(
        (p) => p.name === editingMeal.name
      );
      if (matchingProduct) {
        try {
          await updateProduct({
            id: matchingProduct.id,
            data: {
              name: editForm.name,
              description: editForm.description,
              metadata: {
                calories: editForm.calories,
                protein: editForm.protein,
                carbs: editForm.carbs,
                fat: editForm.fat,
                tags: editForm.tags,
                allergens: editForm.allergens,
              },
            },
          });
        } catch {
          // Fall back to local-only update
        }
      }
    }
    showToast(`"${editForm.name}" updated successfully`);
    setEditingMeal(null);
  }

  function handlePublish() {
    setPublishModalOpen(false);
    showToast('Menu published! 127 subscribers notified.');
  }

  function toggleTag(tag: string) {
    setEditForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  }

  function toggleAllergen(a: string) {
    setEditForm((prev) => ({
      ...prev,
      allergens: prev.allergens.includes(a)
        ? prev.allergens.filter((x) => x !== a)
        : [...prev.allergens, a],
    }));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-text-primary">
            Menu Management
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Drag meals from the library or between days to organize your weekly menu.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 shadow-sm border border-border">
            <button onClick={() => setWeekOffset((w) => w - 1)} className="rounded p-1 transition-colors hover:bg-gray-100">
              <ChevronLeft size={18} className="text-text-secondary" />
            </button>
            <span className="min-w-[180px] text-center text-sm font-medium text-text-primary">
              {getWeekLabel(weekOffset)}
            </span>
            <button onClick={() => setWeekOffset((w) => w + 1)} className="rounded p-1 transition-colors hover:bg-gray-100">
              <ChevronRight size={18} className="text-text-secondary" />
            </button>
          </div>
          <button
            onClick={() => setPublishModalOpen(true)}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 bg-accent"
          >
            Publish Menu
          </button>
        </div>
      </div>

      {/* Main content: Calendar + Library */}
      <div className="flex flex-col gap-6 xl:flex-row">
        {/* Weekly Calendar */}
        <div className="flex-1">
          <div className="rounded-xl bg-white p-4 shadow-sm border border-border">
            <h2 className="mb-4 text-lg font-semibold text-text-primary">
              Weekly Calendar
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
              {DAYS.map((day, idx) => {
                const isOver = dragOverDay === day;
                return (
                  <div
                    key={day}
                    onDragOver={(e) => handleDragOver(e, day)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, day)}
                    className={`rounded-lg p-3 transition-all duration-200 ${isOver ? 'border-2 border-primary-lighter bg-emerald-50' : 'border border-border bg-[#FAFAFA]'}`}
                    style={{ minHeight: 200 }}
                  >
                    <div className="mb-2 text-center">
                      <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                        {FULL_DAYS[idx]}
                      </span>
                      <div className="mt-0.5 text-[10px] text-text-tertiary">
                        {(calendar[day] || []).length} meals
                      </div>
                    </div>

                    <div className="space-y-2">
                      {(calendar[day] || []).map((mealId) => {
                        const meal = getMealById(mealId);
                        if (!meal) return null;
                        return (
                          <motion.div
                            key={mealId}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            draggable
                            onDragStart={(e) => handleDragStart(e as unknown as DragEvent, mealId, day)}
                            className="group relative cursor-grab rounded-md bg-white p-2 shadow-sm active:cursor-grabbing border border-border"
                          >
                            <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-50">
                              <GripVertical size={12} className="text-text-tertiary" />
                            </div>
                            <button
                              onClick={() => openMealEditor(meal)}
                              className="w-full text-left"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={meal.image}
                                alt={meal.name}
                                className="mb-1 h-12 w-full rounded object-cover pointer-events-none"
                                draggable={false}
                              />
                              <p className="text-xs font-medium leading-tight text-text-primary">
                                {meal.name.length > 28 ? meal.name.substring(0, 28) + '...' : meal.name}
                              </p>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveFromDay(day, mealId);
                              }}
                              className="absolute -right-1 -top-1 hidden rounded-full bg-red-500 p-0.5 text-white shadow-sm group-hover:block"
                            >
                              <X size={12} />
                            </button>
                          </motion.div>
                        );
                      })}

                      {/* Drop zone indicator */}
                      {isOver && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex items-center justify-center rounded-md border-2 border-dashed py-3 border-primary-lighter bg-success-light"
                        >
                          <Plus size={16} className="text-success" />
                          <span className="ml-1 text-xs font-medium text-success">Drop here</span>
                        </motion.div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Meal Library Sidebar */}
        <div className="w-full xl:w-80">
          <div className="rounded-xl bg-white p-4 shadow-sm border border-border">
            <h2 className="mb-1 text-lg font-semibold text-text-primary">
              Meal Library
            </h2>
            <p className="mb-3 text-xs text-text-tertiary">
              Drag meals onto calendar days
            </p>
            <div className="relative mb-3">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                placeholder="Search meals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg py-2 pl-9 pr-3 text-sm transition-all duration-200 focus:outline-none focus:ring-2 border border-border text-text-primary ring-primary"
              />
            </div>
            <div className="max-h-[600px] space-y-2 overflow-y-auto pr-1">
              {isLoadingProducts ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonMealCard key={i} />
                ))
              ) : filteredMeals.map((meal) => (
                <div
                  key={meal.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, meal.id)}
                  className="flex cursor-grab items-start gap-3 rounded-lg p-2 transition-all duration-150 hover:bg-gray-50 hover:shadow-sm active:cursor-grabbing active:shadow-md border border-border"
                >
                  <div className="flex flex-shrink-0 items-center self-center">
                    <GripVertical size={14} className="text-gray-300" />
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={meal.image}
                    alt={meal.name}
                    className="h-12 w-12 flex-shrink-0 rounded object-cover pointer-events-none"
                    draggable={false}
                    onClick={() => openMealEditor(meal)}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className="cursor-pointer truncate text-sm font-medium hover:underline text-text-primary"
                      onClick={() => openMealEditor(meal)}
                    >
                      {meal.name}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {formatPeso(meal.price)}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {meal.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-success-light text-emerald-800">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Menu History */}
      <div className="rounded-xl bg-white p-4 shadow-sm border border-border">
        <h2 className="mb-3 text-lg font-semibold text-text-primary">
          Menu History
        </h2>
        <div className="space-y-2">
          {menuHistory.map((week, idx) => (
            <div key={idx} className="rounded-lg border border-border">
              <button
                onClick={() => setExpandedHistory(expandedHistory === idx ? null : idx)}
                className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-text-primary">
                    Week of {week.weekLabel}
                  </span>
                  <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-text-secondary">
                    {week.mealCount} meals
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {expandedHistory !== idx && (
                    <span className="text-xs text-text-secondary">View</span>
                  )}
                  {expandedHistory === idx ? <ChevronUp size={16} className="text-text-secondary" /> : <ChevronDown size={16} className="text-text-secondary" />}
                </div>
              </button>
              <AnimatePresence>
                {expandedHistory === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-border px-3 pb-3 pt-2">
                      <div className="flex flex-wrap gap-2">
                        {week.meals.map((name) => (
                          <span key={name} className="rounded-md px-2 py-1 text-xs font-medium bg-muted text-text-primary">
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      {/* Publish Confirmation Modal */}
      <Modal isOpen={publishModalOpen} onClose={() => setPublishModalOpen(false)} title="Publish Menu" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            This will notify <strong>127 subscribers</strong> about the new menu for{' '}
            <strong>{getWeekLabel(weekOffset)}</strong>. Publish?
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setPublishModalOpen(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-100 text-text-secondary border border-border"
            >
              Cancel
            </button>
            <button
              onClick={handlePublish}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 bg-accent"
            >
              Publish Menu
            </button>
          </div>
        </div>
      </Modal>

      {/* Meal Editor Modal */}
      <Modal isOpen={editingMeal !== null} onClose={() => setEditingMeal(null)} title="Edit Meal" size="lg">
        <div className="max-h-[70vh] space-y-4 overflow-y-auto overflow-x-hidden pr-1">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">Name</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg px-3 py-2 text-sm transition-all duration-200 focus:outline-none focus:ring-2 border border-border text-text-primary ring-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">Description</label>
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full rounded-lg px-3 py-2 text-sm transition-all duration-200 focus:outline-none focus:ring-2 border border-border text-text-primary ring-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">Price</label>
            <input
              type="number"
              value={editForm.price}
              onChange={(e) => setEditForm((f) => ({ ...f, price: Number(e.target.value) }))}
              className="w-full rounded-lg px-3 py-2 text-sm transition-all duration-200 focus:outline-none focus:ring-2 border border-border text-text-primary ring-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">Photo</label>
            <div className="flex items-start gap-4">
              {editForm.image && (
                <div className="relative h-24 w-32 flex-shrink-0 overflow-hidden rounded-lg shadow-sm border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={editForm.image} alt="Meal preview" className="h-full w-full object-cover" />
                </div>
              )}
              <div
                className="flex flex-1 cursor-pointer items-center justify-center rounded-lg py-6 transition-colors hover:bg-gray-50 border-2 border-dashed border-border bg-gray-50"
              >
                <div className="text-center">
                  <Upload size={20} className="mx-auto mb-2 text-text-secondary" />
                  <p className="text-sm text-text-secondary">Drop image here or click to upload</p>
                  <p className="text-xs text-text-tertiary">PNG, JPG up to 5MB</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-text-primary">Nutritional Info</label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(['calories', 'protein', 'carbs', 'fat'] as const).map((field) => (
                <div key={field}>
                  <label className="mb-1 block text-xs capitalize text-text-secondary">
                    {field} {field === 'calories' ? '(kcal)' : '(g)'}
                  </label>
                  <input
                    type="number"
                    value={editForm[field]}
                    onChange={(e) => setEditForm((f) => ({ ...f, [field]: Number(e.target.value) }))}
                    className="w-full rounded-lg px-3 py-2 text-sm transition-all duration-200 focus:outline-none focus:ring-2 border border-border text-text-primary ring-primary"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-text-primary">Dietary Tags</label>
            <div className="flex flex-wrap gap-2">
              {ALL_TAGS.map((tag) => (
                <label key={tag} className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors border ${editForm.tags.includes(tag) ? 'bg-success-light text-emerald-800 border-emerald-300' : 'bg-muted text-text-secondary border-border'}`}>
                  <input
                    type="checkbox"
                    checked={editForm.tags.includes(tag)}
                    onChange={() => toggleTag(tag)}
                    className="sr-only"
                  />
                  {tag}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-text-primary">Allergens</label>
            <div className="flex flex-wrap gap-2">
              {ALL_ALLERGENS.map((a) => (
                <label key={a} className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors border ${editForm.allergens.includes(a) ? 'bg-error-light text-red-800 border-red-300' : 'bg-muted text-text-secondary border-border'}`}>
                  <input
                    type="checkbox"
                    checked={editForm.allergens.includes(a)}
                    onChange={() => toggleAllergen(a)}
                    className="sr-only"
                  />
                  {a}
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-text-primary">Available</label>
            <button
              onClick={() => setEditForm((f) => ({ ...f, available: !f.available }))}
              className={`relative flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${editForm.available ? 'bg-primary-lighter' : 'bg-gray-300'}`}
            >
              <span
                className={`absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${editForm.available ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button
              onClick={() => setEditingMeal(null)}
              className="rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-100 text-text-secondary border border-border"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveMeal}
              disabled={isUpdating}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50 bg-primary"
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
