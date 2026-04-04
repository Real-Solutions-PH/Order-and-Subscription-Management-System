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

interface DragData {
  mealId: number;
  sourceDay?: string; // undefined if from library
}

export default function MenuManagementPage() {
  const { showToast } = useToast();

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
  });

  const filteredMeals = useMemo(() => {
    if (!searchQuery.trim()) return meals;
    const q = searchQuery.toLowerCase();
    return meals.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  const getMealById = (id: number) => meals.find((m) => m.id === id);

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
  }, [showToast]);

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
    });
  }

  function handleSaveMeal() {
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
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'DM Serif Display', serif", color: '#1A1A2E' }}>
            Menu Management
          </h1>
          <p className="mt-1 text-sm" style={{ color: '#6B7280' }}>
            Drag meals from the library or between days to organize your weekly menu.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 shadow-sm" style={{ border: '1px solid #E5E7EB' }}>
            <button onClick={() => setWeekOffset((w) => w - 1)} className="rounded p-1 transition-colors hover:bg-gray-100">
              <ChevronLeft size={18} style={{ color: '#6B7280' }} />
            </button>
            <span className="min-w-[180px] text-center text-sm font-medium" style={{ color: '#1A1A2E' }}>
              {getWeekLabel(weekOffset)}
            </span>
            <button onClick={() => setWeekOffset((w) => w + 1)} className="rounded p-1 transition-colors hover:bg-gray-100">
              <ChevronRight size={18} style={{ color: '#6B7280' }} />
            </button>
          </div>
          <button
            onClick={() => setPublishModalOpen(true)}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: '#E76F51' }}
          >
            Publish Menu
          </button>
        </div>
      </div>

      {/* Main content: Calendar + Library */}
      <div className="flex flex-col gap-6 xl:flex-row">
        {/* Weekly Calendar */}
        <div className="flex-1">
          <div className="rounded-xl bg-white p-4 shadow-sm" style={{ border: '1px solid #E5E7EB' }}>
            <h2 className="mb-4 text-lg font-semibold" style={{ color: '#1A1A2E' }}>
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
                    className="rounded-lg p-3 transition-all duration-200"
                    style={{
                      border: isOver ? '2px solid #40916C' : '1px solid #E5E7EB',
                      backgroundColor: isOver ? '#ECFDF5' : '#FAFAFA',
                      minHeight: 200,
                    }}
                  >
                    <div className="mb-2 text-center">
                      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#6B7280' }}>
                        {FULL_DAYS[idx]}
                      </span>
                      <div className="mt-0.5 text-[10px]" style={{ color: '#9CA3AF' }}>
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
                            className="group relative cursor-grab rounded-md bg-white p-2 shadow-sm active:cursor-grabbing"
                            style={{ border: '1px solid #E5E7EB' }}
                          >
                            <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-50">
                              <GripVertical size={12} style={{ color: '#9CA3AF' }} />
                            </div>
                            <button
                              onClick={() => openMealEditor(meal)}
                              className="w-full text-left"
                            >
                              <img
                                src={meal.image}
                                alt={meal.name}
                                className="mb-1 h-12 w-full rounded object-cover pointer-events-none"
                                draggable={false}
                              />
                              <p className="text-xs font-medium leading-tight" style={{ color: '#1A1A2E' }}>
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
                          className="flex items-center justify-center rounded-md border-2 border-dashed py-3"
                          style={{ borderColor: '#40916C', backgroundColor: '#D1FAE5' }}
                        >
                          <Plus size={16} style={{ color: '#059669' }} />
                          <span className="ml-1 text-xs font-medium" style={{ color: '#059669' }}>Drop here</span>
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
          <div className="rounded-xl bg-white p-4 shadow-sm" style={{ border: '1px solid #E5E7EB' }}>
            <h2 className="mb-1 text-lg font-semibold" style={{ color: '#1A1A2E' }}>
              Meal Library
            </h2>
            <p className="mb-3 text-xs" style={{ color: '#9CA3AF' }}>
              Drag meals onto calendar days
            </p>
            <div className="relative mb-3">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#6B7280' }} />
              <input
                type="text"
                placeholder="Search meals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg py-2 pl-9 pr-3 text-sm transition-all duration-200 focus:outline-none focus:ring-2"
                style={{ border: '1px solid #E5E7EB', color: '#1A1A2E', '--tw-ring-color': '#1B4332' } as React.CSSProperties}
              />
            </div>
            <div className="max-h-[600px] space-y-2 overflow-y-auto pr-1">
              {filteredMeals.map((meal) => (
                <div
                  key={meal.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, meal.id)}
                  className="flex cursor-grab items-start gap-3 rounded-lg p-2 transition-all duration-150 hover:bg-gray-50 hover:shadow-sm active:cursor-grabbing active:shadow-md"
                  style={{ border: '1px solid #E5E7EB' }}
                >
                  <div className="flex flex-shrink-0 items-center self-center">
                    <GripVertical size={14} style={{ color: '#D1D5DB' }} />
                  </div>
                  <img
                    src={meal.image}
                    alt={meal.name}
                    className="h-12 w-12 flex-shrink-0 rounded object-cover pointer-events-none"
                    draggable={false}
                    onClick={() => openMealEditor(meal)}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className="cursor-pointer truncate text-sm font-medium hover:underline"
                      style={{ color: '#1A1A2E' }}
                      onClick={() => openMealEditor(meal)}
                    >
                      {meal.name}
                    </p>
                    <p className="text-xs" style={{ color: '#6B7280' }}>
                      {formatPeso(meal.price)}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {meal.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="rounded-full px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}>
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
      <div className="rounded-xl bg-white p-4 shadow-sm" style={{ border: '1px solid #E5E7EB' }}>
        <h2 className="mb-3 text-lg font-semibold" style={{ color: '#1A1A2E' }}>
          Menu History
        </h2>
        <div className="space-y-2">
          {menuHistory.map((week, idx) => (
            <div key={idx} className="rounded-lg" style={{ border: '1px solid #E5E7EB' }}>
              <button
                onClick={() => setExpandedHistory(expandedHistory === idx ? null : idx)}
                className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium" style={{ color: '#1A1A2E' }}>
                    Week of {week.weekLabel}
                  </span>
                  <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>
                    {week.mealCount} meals
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {expandedHistory !== idx && (
                    <span className="text-xs" style={{ color: '#6B7280' }}>View</span>
                  )}
                  {expandedHistory === idx ? <ChevronUp size={16} style={{ color: '#6B7280' }} /> : <ChevronDown size={16} style={{ color: '#6B7280' }} />}
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
                    <div className="border-t px-3 pb-3 pt-2" style={{ borderColor: '#E5E7EB' }}>
                      <div className="flex flex-wrap gap-2">
                        {week.meals.map((name) => (
                          <span key={name} className="rounded-md px-2 py-1 text-xs font-medium" style={{ backgroundColor: '#F3F4F6', color: '#1A1A2E' }}>
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
          <p className="text-sm" style={{ color: '#6B7280' }}>
            This will notify <strong>127 subscribers</strong> about the new menu for{' '}
            <strong>{getWeekLabel(weekOffset)}</strong>. Publish?
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setPublishModalOpen(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-100"
              style={{ color: '#6B7280', border: '1px solid #E5E7EB' }}
            >
              Cancel
            </button>
            <button
              onClick={handlePublish}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: '#E76F51' }}
            >
              Publish Menu
            </button>
          </div>
        </div>
      </Modal>

      {/* Meal Editor Modal */}
      <Modal isOpen={editingMeal !== null} onClose={() => setEditingMeal(null)} title="Edit Meal" size="lg">
        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: '#1A1A2E' }}>Name</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg px-3 py-2 text-sm transition-all duration-200 focus:outline-none focus:ring-2"
              style={{ border: '1px solid #E5E7EB', color: '#1A1A2E', '--tw-ring-color': '#1B4332' } as React.CSSProperties}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: '#1A1A2E' }}>Description</label>
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full rounded-lg px-3 py-2 text-sm transition-all duration-200 focus:outline-none focus:ring-2"
              style={{ border: '1px solid #E5E7EB', color: '#1A1A2E', '--tw-ring-color': '#1B4332' } as React.CSSProperties}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: '#1A1A2E' }}>Price</label>
            <input
              type="number"
              value={editForm.price}
              onChange={(e) => setEditForm((f) => ({ ...f, price: Number(e.target.value) }))}
              className="w-full rounded-lg px-3 py-2 text-sm transition-all duration-200 focus:outline-none focus:ring-2"
              style={{ border: '1px solid #E5E7EB', color: '#1A1A2E', '--tw-ring-color': '#1B4332' } as React.CSSProperties}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: '#1A1A2E' }}>Photo</label>
            <div
              className="flex items-center justify-center rounded-lg py-8"
              style={{ border: '2px dashed #E5E7EB', backgroundColor: '#F9FAFB' }}
            >
              <div className="text-center">
                <Upload size={24} className="mx-auto mb-2" style={{ color: '#6B7280' }} />
                <p className="text-sm" style={{ color: '#6B7280' }}>Drop image here or click to upload</p>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>PNG, JPG up to 5MB</p>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium" style={{ color: '#1A1A2E' }}>Nutritional Info</label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(['calories', 'protein', 'carbs', 'fat'] as const).map((field) => (
                <div key={field}>
                  <label className="mb-1 block text-xs capitalize" style={{ color: '#6B7280' }}>
                    {field} {field === 'calories' ? '(kcal)' : '(g)'}
                  </label>
                  <input
                    type="number"
                    value={editForm[field]}
                    onChange={(e) => setEditForm((f) => ({ ...f, [field]: Number(e.target.value) }))}
                    className="w-full rounded-lg px-3 py-2 text-sm transition-all duration-200 focus:outline-none focus:ring-2"
                    style={{ border: '1px solid #E5E7EB', color: '#1A1A2E', '--tw-ring-color': '#1B4332' } as React.CSSProperties}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium" style={{ color: '#1A1A2E' }}>Dietary Tags</label>
            <div className="flex flex-wrap gap-2">
              {ALL_TAGS.map((tag) => (
                <label key={tag} className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors" style={{
                  backgroundColor: editForm.tags.includes(tag) ? '#D1FAE5' : '#F3F4F6',
                  color: editForm.tags.includes(tag) ? '#065F46' : '#6B7280',
                  border: editForm.tags.includes(tag) ? '1px solid #6EE7B7' : '1px solid #E5E7EB',
                }}>
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
            <label className="mb-2 block text-sm font-medium" style={{ color: '#1A1A2E' }}>Allergens</label>
            <div className="flex flex-wrap gap-2">
              {ALL_ALLERGENS.map((a) => (
                <label key={a} className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors" style={{
                  backgroundColor: editForm.allergens.includes(a) ? '#FEE2E2' : '#F3F4F6',
                  color: editForm.allergens.includes(a) ? '#991B1B' : '#6B7280',
                  border: editForm.allergens.includes(a) ? '1px solid #FCA5A5' : '1px solid #E5E7EB',
                }}>
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
            <label className="text-sm font-medium" style={{ color: '#1A1A2E' }}>Available</label>
            <button
              onClick={() => setEditForm((f) => ({ ...f, available: !f.available }))}
              className="relative h-6 w-11 rounded-full transition-colors"
              style={{ backgroundColor: editForm.available ? '#40916C' : '#D1D5DB' }}
            >
              <span
                className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                style={{ transform: editForm.available ? 'translateX(22px)' : 'translateX(2px)' }}
              />
            </button>
          </div>

          <div className="flex justify-end gap-3 pt-2" style={{ borderTop: '1px solid #E5E7EB' }}>
            <button
              onClick={() => setEditingMeal(null)}
              className="rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-100"
              style={{ color: '#6B7280', border: '1px solid #E5E7EB' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveMeal}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: '#1B4332' }}
            >
              Save Changes
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
