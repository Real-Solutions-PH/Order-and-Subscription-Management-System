'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Meal } from '@/lib/mock-data';

export interface CartItem {
  meal: Meal;
  quantity: number;
  customizations?: string[];
}

interface CartContextType {
  items: CartItem[];
  addItem: (meal: Meal, quantity?: number) => void;
  removeItem: (mealId: number) => void;
  updateQuantity: (mealId: number, quantity: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((meal: Meal, quantity = 1) => {
    setItems(prev => {
      const existing = prev.find(i => i.meal.id === meal.id);
      if (existing) {
        return prev.map(i => i.meal.id === meal.id ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, { meal, quantity }];
    });
  }, []);

  const removeItem = useCallback((mealId: number) => {
    setItems(prev => prev.filter(i => i.meal.id !== mealId));
  }, []);

  const updateQuantity = useCallback((mealId: number, quantity: number) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(i => i.meal.id !== mealId));
    } else {
      setItems(prev => prev.map(i => i.meal.id === mealId ? { ...i, quantity } : i));
    }
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const total = items.reduce((sum, i) => sum + i.meal.price * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, total, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
}
