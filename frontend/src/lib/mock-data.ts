/**
 * Mock-data layer — types + seed data.
 *
 * The actual data now lives in seed-data.json (single source of truth).
 * This file re-exports everything so existing imports keep working while
 * pages are progressively migrated to the TanStack-powered hooks.
 */
import seedData from "./seed-data.json";

// ---------------------------------------------------------------------------
// Type definitions (unchanged)
// ---------------------------------------------------------------------------
export interface Meal {
  id: number | string;
  name: string;
  price: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  serving_size: string;
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
  status: "active" | "paused" | "churned" | "at_risk";
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
  items: {
    mealId: number;
    mealName: string;
    quantity: number;
    price: number;
    customizations?: string[];
  }[];
  total: number;
  status:
    | "new"
    | "preparing"
    | "ready"
    | "delivering"
    | "delivered"
    | "cancelled";
  deliveryDate: string;
  deliverySlot: string;
  paymentMethod: string;
  paymentStatus: "paid" | "pending" | "failed";
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
      laborEfficiency: Number.parseFloat(
        (totalMeals / (laborCost * workers)).toFixed(3),
      ),
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

// ---------------------------------------------------------------------------
// Empty defaults — used when dev mode is off and API returns no data.
// Typed to match the shape of the mock data so components work without errors.
// ---------------------------------------------------------------------------
type AnalyticsShape = typeof analyticsData;
type CustomerBehaviorShape = typeof customerBehaviorData;
type DemandPlanningShape = typeof demandPlanningData;

export const emptyAnalyticsData: AnalyticsShape = {
  mrr: 0,
  mrrLastMonth: 0,
  activeSubscribers: 0,
  activeSubscribersLastMonth: 0,
  churnRate: 0,
  churnRateLastMonth: 0,
  avgOrderValue: 0,
  todayRevenue: 0,
  todayGrossSales: 0,
  todayGrossSalesLastMonth: 0,
  todayNetSales: 0,
  todayNetSalesLastMonth: 0,
  todayTotalMeals: 0,
  todayTotalMealsLastMonth: 0,
  mostPopularMeal: "—",
  mostPopularCount: 0,
  weeklyMealPopularity: [],
  menuContribution: [],
  planDistribution: [],
  cohortRetention: [],
  avgLTV: 0,
  cac: 0,
  cacLastMonth: 0,
  cacPaybackMonths: 0,
  cacPaybackMonthsLastMonth: 0,
  orderFulfillmentRate: 0,
  orderFulfillmentRateLastMonth: 0,
  avgPrepTimeMinutes: 0,
  avgPrepTimeMinutesLastMonth: 0,
  foodWastePercent: 0,
  foodWastePercentLastMonth: 0,
  deliverySuccessRate: 0,
  deliverySuccessRateLastMonth: 0,
  fulfillmentTrend: [],
  revenueData: [],
  subscriberTrend: [],
  dailyPrepBreakdown: [],
  deliveryBreakdown: { onTime: 0, late: 0, failed: 0, returned: 0 },
};

export const emptyCustomerBehaviorData: CustomerBehaviorShape = {
  upgradeRate: 0,
  upgradeRateLastMonth: 0,
  downgradeRate: 0,
  downgradeRateLastMonth: 0,
  pauseRate: 0,
  pauseRateLastMonth: 0,
  reactivationRate: 0,
  reactivationRateLastMonth: 0,
  npsScore: 0,
  npsLastMonth: 0,
  npsPromoters: 0,
  npsPassives: 0,
  npsDetractors: 0,
  planMovement: [],
  cancelRate: 0,
  cancelRateLastMonth: 0,
  subscriberFlow: { pausedRecoverable: 0, cancelledChurned: 0, reactivated: 0 },
  mealPopularityBySubscribers: [],
};

export const emptyDemandPlanningData: DemandPlanningShape = {
  mealsByPlanType: [],
  forecastAccuracy: 0,
  demandForecast: [],
  peakOrderDays: [],
  peakOrderHours: [],
  wasteReduction: 0,
};
