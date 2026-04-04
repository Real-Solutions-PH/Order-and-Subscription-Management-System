/**
 * Mock-data layer — types + seed data.
 *
 * The actual data now lives in seed-data.json (single source of truth).
 * This file re-exports everything so existing imports keep working while
 * pages are progressively migrated to the TanStack-powered hooks.
 */
import seedData from './seed-data.json';

// ---------------------------------------------------------------------------
// Type definitions (unchanged)
// ---------------------------------------------------------------------------
export interface Meal {
  id: number;
  name: string;
  price: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  tags: string[];
  image: string;
  description: string;
  allergens: string[];
  ingredients: string[];
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  planType: string;
  status: 'active' | 'paused' | 'churned' | 'at_risk';
  monthsSubscribed: number;
  ltv: number;
  joinDate: string;
  lastOrder: string;
  notes: string[];
  address: string;
  dietaryPreferences: string[];
  isVIP?: boolean;
  isCorporate?: boolean;
}

export interface Order {
  id: string;
  customerId: number;
  customerName: string;
  items: { mealId: number; mealName: string; quantity: number; price: number; customizations?: string[] }[];
  total: number;
  status: 'new' | 'preparing' | 'ready' | 'delivering' | 'delivered' | 'cancelled';
  deliveryDate: string;
  deliverySlot: string;
  paymentMethod: string;
  paymentStatus: 'paid' | 'pending' | 'failed';
  address: string;
  notes: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Data from seed JSON
// ---------------------------------------------------------------------------
export const meals: Meal[] = seedData.meals as Meal[];
export const customers: Customer[] = seedData.customers as Customer[];
export const orders: Order[] = seedData.orders as Order[];
export const planTiers = seedData.planTiers;
export const deliveryZones = seedData.deliveryZones;
export const dietaryFilters = seedData.dietaryFilters;
export const timeSlots = seedData.timeSlots;
export const paymentMethods = seedData.paymentMethods;
export const analyticsData = {
  ...seedData.analyticsData,
  // Re-generate the random revenue data + subscriber trend that were runtime-computed
  revenueData: Array.from({ length: 30 }, (_, i) => {
    const totalMeals = 40 + Math.floor(Math.random() * 60);
    const laborCost = 800 + Math.floor(Math.random() * 400);
    const workers = 3 + Math.floor(Math.random() * 3);
    return {
      date: `Mar ${i + 1}`,
      subscription: 12000 + Math.floor(Math.random() * 6000),
      alaCarte: 3000 + Math.floor(Math.random() * 4000),
      laborEfficiency: Number.parseFloat((totalMeals / (laborCost * workers)).toFixed(3)),
      totalMeals,
      laborCost,
      workers,
    };
  }),
  subscriberTrend: Array.from({ length: 12 }, (_, i) => ({
    week: `W${i + 1}`,
    new: Math.floor(8 + Math.random() * 12),
    churned: Math.floor(2 + Math.random() * 6),
  })),
};
export const customerBehaviorData = seedData.customerBehaviorData;
export const demandPlanningData = seedData.demandPlanningData;

export function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString()}`;
}
