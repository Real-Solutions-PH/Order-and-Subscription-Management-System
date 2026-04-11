"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useServerCart } from "@/hooks/useCart";
import type { Meal } from "@/lib/mock-data";
import { computeOrderSubtotal } from "@/lib/order-utils";

export interface CartItem {
  meal: Meal;
  quantity: number;
  customizations?: string[];
}

interface CartContextType {
  items: CartItem[];
  addItem: (meal: Meal, quantity?: number) => void;
  removeItem: (mealId: number | string) => void;
  updateQuantity: (mealId: number | string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
  isLoading: boolean;
  planTotal: number | null;
  setPlanTotal: (total: number | null) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

/**
 * CartProvider — uses local state as the primary store.
 * When the backend is connected, server cart mutations fire in the
 * background but local state drives the UI for instant feedback.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [planTotal, setPlanTotal] = useState<number | null>(null);
  const serverCart = useServerCart();

  const addItem = useCallback(
    (meal: Meal, quantity = 1) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.meal.id === meal.id);
        if (existing) {
          return prev.map((i) =>
            i.meal.id === meal.id
              ? { ...i, quantity: i.quantity + quantity }
              : i,
          );
        }
        return [...prev, { meal, quantity }];
      });
      // Fire-and-forget server sync (product_variant_id would be the real UUID in production)
      serverCart
        .addItem({ product_variant_id: String(meal.id), quantity })
        .catch(() => {});
    },
    [serverCart],
  );

  const removeItem = useCallback(
    (mealId: number | string) => {
      const item = items.find((i) => i.meal.id === mealId);
      setItems((prev) => prev.filter((i) => i.meal.id !== mealId));
      if (item) {
        serverCart.removeItem(String(mealId)).catch(() => {});
      }
    },
    [items, serverCart],
  );

  const updateQuantity = useCallback(
    (mealId: number | string, quantity: number) => {
      if (quantity <= 0) {
        setItems((prev) => prev.filter((i) => i.meal.id !== mealId));
        serverCart.removeItem(String(mealId)).catch(() => {});
      } else {
        setItems((prev) =>
          prev.map((i) => (i.meal.id === mealId ? { ...i, quantity } : i)),
        );
        serverCart
          .updateItem({ itemId: String(mealId), quantity })
          .catch(() => {});
      }
    },
    [serverCart],
  );

  const clearCart = useCallback(() => {
    setItems([]);
    setPlanTotal(null);
    serverCart.clearCart().catch(() => {});
  }, [serverCart]);

  const total = computeOrderSubtotal(items, planTotal);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        total,
        itemCount,
        isLoading: serverCart.isLoading,
        planTotal,
        setPlanTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
