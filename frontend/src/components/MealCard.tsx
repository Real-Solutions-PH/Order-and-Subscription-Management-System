'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Meal, formatPeso } from '@/lib/mock-data';

interface MealCardProps {
  meal: Meal;
  onAdd: (meal: Meal) => void;
  compact?: boolean;
}

export default function MealCard({ meal, onAdd, compact = false }: MealCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="group overflow-hidden rounded-2xl bg-white transition-all duration-200 hover:shadow-lg shadow-card"
    >
      {/* Image */}
      <div className="relative" style={{ aspectRatio: '16/9' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={meal.image}
          alt={meal.name}
          className="h-full w-full object-cover"
        />
        {/* Dietary tags */}
        {meal.tags.length > 0 && (
          <div className="absolute left-2 top-2 flex flex-wrap gap-1">
            {meal.tags.map((tag) => (
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

      {/* Content */}
      <div className={compact ? 'p-3' : 'p-4'}>
        <h3 className={`font-semibold leading-snug text-text-primary ${compact ? 'text-sm' : 'text-base'}`}>
          {meal.name}
        </h3>

        {/* Macros row */}
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-text-secondary">
          <span>{meal.calories} cal</span>
          <span>{meal.protein}g protein</span>
          <span>{meal.carbs}g carbs</span>
          <span>{meal.fat}g fat</span>
        </div>

        {/* Price + Add button */}
        <div className="mt-3 flex items-center justify-between">
          <span className={`font-bold text-primary ${compact ? 'text-base' : 'text-lg'}`}>
            {formatPeso(meal.price)}
          </span>
          <button
            onClick={() => onAdd(meal)}
            className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-white transition-colors duration-150 hover:opacity-90 bg-accent"
          >
            <Plus size={16} />
            Add
          </button>
        </div>
      </div>
    </motion.div>
  );
}
