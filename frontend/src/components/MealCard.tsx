"use client";

import React from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Meal, formatPeso } from "@/lib/mock-data";
import MealImage from "@/components/MealImage";

interface MealCardProps {
  meal: Meal;
  onAdd: (meal: Meal) => void;
  compact?: boolean;
}

export default function MealCard({
  meal,
  onAdd,
  compact = false,
}: MealCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="group overflow-hidden rounded-2xl bg-white transition-all duration-200 hover:shadow-lg"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}
    >
      {/* Image */}
      <div className="relative" style={{ aspectRatio: "16/9" }}>
        <MealImage
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
                className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: 'rgba(27,67,50,0.85)' }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className={compact ? 'p-3' : 'p-4'}>
        <h3
          className={`font-semibold leading-snug ${compact ? 'text-sm' : 'text-base'}`}
          style={{ color: '#1A1A2E' }}
        >
          {meal.name}
        </h3>

        {/* Macros row */}
        <div
          className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs"
          style={{ color: '#6B7280' }}
        >
          <span>{meal.calories} cal</span>
          <span>{meal.protein}g protein</span>
          <span>{meal.carbs}g carbs</span>
          <span>{meal.fat}g fat</span>
        </div>

        {/* Price + Add button */}
        <div className="mt-3 flex items-center justify-between">
          <span
            className={`font-bold ${compact ? 'text-base' : 'text-lg'}`}
            style={{ color: '#1B4332' }}
          >
            {formatPeso(meal.price)}
          </span>
          <button
            onClick={() => onAdd(meal)}
            className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-white transition-colors duration-150 hover:opacity-90"
            style={{ backgroundColor: '#E76F51' }}
          >
            <Plus size={16} />
            Add
          </button>
        </div>
      </div>
    </motion.div>
  );
}
