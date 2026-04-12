import type { CartItem } from "@/context/CartContext";

/**
 * Computes the order subtotal.
 * When a meal plan is active, returns the plan's fixed price (planTotal).
 * Otherwise, sums individual item prices.
 */
export function computeOrderSubtotal(
  items: CartItem[],
  planTotal: number | null,
): number {
  if (planTotal !== null && items.length === 0) return 0;
  if (planTotal !== null) return planTotal;
  return items.reduce((sum, i) => sum + i.meal.price * i.quantity, 0);
}
