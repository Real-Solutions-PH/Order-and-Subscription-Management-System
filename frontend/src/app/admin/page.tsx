"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Repeat,
  BarChart3,
  Package,
  Heart,
  Clock,
  AlertCircle,
  ChefHat,
  Truck,
  CheckCircle2,
  Activity,
  ChevronUp,
  ChevronDown,
  Target,
  Timer,
  Trash2,
  Pause,
  RefreshCw,
  Star,
  Flame,
  Snowflake,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import {
  orders,
  analyticsData,
  formatPeso,
  customerBehaviorData,
  demandPlanningData,
} from "@/lib/mock-data";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useDashboardMetrics,
  useMRRBreakdown,
  usePopularItems,
  useCohorts,
  useOrders,
} from "@/hooks";
import { SkeletonKPI, SkeletonChart } from "@/components/ui/skeleton";

const statusColors: Record<string, { bg: string; text: string }> = {
  new: { bg: "#DBEAFE", text: "#1E40AF" },
  preparing: { bg: "#FEF3C7", text: "#92400E" },
  ready: { bg: "#D1FAE5", text: "#065F46" },
  delivering: { bg: "#DBEAFE", text: "#1E40AF" },
  delivered: { bg: "#D1FAE5", text: "#065F46" },
  cancelled: { bg: "#FEE2E2", text: "#991B1B" },
};

const calculateTrend = (current: number, previous: number) => {
  if (previous === 0) return 0;
  const diff = ((current - previous) / previous) * 100;
  return diff > 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`;
};

// overviewKpis and subscriptionKpis are now defined inside the component to use displayAnalytics

const ltvTrendData = [
  { month: "Oct", ltv: 12800 },
  { month: "Nov", ltv: 13200 },
  { month: "Dec", ltv: 13900 },
  { month: "Jan", ltv: 14500 },
  { month: "Feb", ltv: 14800 },
  { month: "Mar", ltv: 15200 },
];

const retentionMetrics = [
  { label: "Pause Rate", value: "8.3%", bar: 8.3 },
  { label: "Avg Pause Duration", value: "1.4 weeks", bar: 14 },
  { label: "Win-back Rate", value: "62%", bar: 62 },
];

const totalSubscribers = analyticsData.planDistribution.reduce(
  (s, p) => s + p.value,
  0,
);

function getCohortColor(value: number | undefined): string {
  if (value === undefined) return "transparent";
  if (value >= 90) return "#059669";
  if (value >= 80) return "#10B981";
  if (value >= 70) return "#34D399";
  if (value >= 60) return "#F4A261";
  if (value >= 50) return "#E76F51";
  return "#DC2626";
}

function getCohortTextColor(value: number | undefined): string {
  if (value === undefined) return "transparent";
  if (value >= 80) return "#FFFFFF";
  if (value >= 60) return "#1A1A2E";
  return "#FFFFFF";
}

const cohortColumns = ["m1", "m2", "m3", "m4", "m5", "m6"] as const;

const renderCustomLabel = ({ cx, cy }: { cx: number; cy: number }) => {
  return (
    <text
      x={cx}
      y={cy}
      textAnchor="middle"
      dominantBaseline="central"
      style={{ fontSize: 20, fontWeight: 700, fill: "#1A1A2E" }}
    >
      {totalSubscribers}
    </text>
  );
};

type Tab = "overview" | "subscriptions" | "operations";

type SortKey =
  | "name"
  | "sold"
  | "costPerUnit"
  | "marginPct"
  | "revenue"
  | "pricePerUnit"
  | "cookMins"
  | "packMins";

function SortIcon({
  column,
  sortConfig,
}: {
  column: SortKey;
  sortConfig: { key: SortKey; direction: "asc" | "desc" };
}) {
  if (sortConfig.key !== column) return <div className="w-4" />;
  return sortConfig.direction === "asc" ? (
    <ChevronUp size={14} />
  ) : (
    <ChevronDown size={14} />
  );
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // ─── TanStack Query hooks ───
  const dashboardQuery = useDashboardMetrics();
  const mrrQuery = useMRRBreakdown();
  usePopularItems(10);
  const cohortsQuery = useCohorts();
  const ordersQuery = useOrders();

  // Merge API data with mock fallback
  const dashMetrics = dashboardQuery.data;
  const displayAnalytics = {
    ...analyticsData,
    // Override with API data when available
    ...(dashMetrics
      ? {
          mrr: Number(dashMetrics.mrr),
          activeSubscribers: dashMetrics.active_subscribers,
          churnRate: dashMetrics.churn_rate,
          avgOrderValue: Number(dashMetrics.aov),
          todayRevenue: Number(dashMetrics.total_revenue),
        }
      : {}),
  };

  // Use API orders when available, fall back to mock
  const displayOrders = ordersQuery.data?.items ?? orders;

  // ─── KPI card definitions (use displayAnalytics) ───
  const overviewKpis = [
    {
      label: "Today's Gross Sales",
      value: formatPeso(displayAnalytics.todayGrossSales),
      lastMonthValue: formatPeso(displayAnalytics.todayGrossSalesLastMonth),
      trend: calculateTrend(
        displayAnalytics.todayGrossSales,
        displayAnalytics.todayGrossSalesLastMonth,
      ),
      trendUp:
        displayAnalytics.todayGrossSales >
        displayAnalytics.todayGrossSalesLastMonth,
      icon: DollarSign,
      iconBg: "#F0FDF4",
      iconColor: "#16A34A",
    },
    {
      label: "Net Sales",
      value: formatPeso(displayAnalytics.todayNetSales),
      lastMonthValue: formatPeso(displayAnalytics.todayNetSalesLastMonth),
      trend: calculateTrend(
        displayAnalytics.todayNetSales,
        displayAnalytics.todayNetSalesLastMonth,
      ),
      trendUp:
        displayAnalytics.todayNetSales >
        displayAnalytics.todayNetSalesLastMonth,
      icon: Activity,
      iconBg: "#ECFDF5",
      iconColor: "#059669",
    },
    {
      label: "Total Meals",
      value: displayAnalytics.todayTotalMeals.toString(),
      lastMonthValue: displayAnalytics.todayTotalMealsLastMonth.toString(),
      trend: calculateTrend(
        displayAnalytics.todayTotalMeals,
        displayAnalytics.todayTotalMealsLastMonth,
      ),
      trendUp:
        displayAnalytics.todayTotalMeals >
        displayAnalytics.todayTotalMealsLastMonth,
      icon: Package,
      iconBg: "#FFFBEB",
      iconColor: "#D97706",
    },
    {
      label: "MRR",
      value: formatPeso(displayAnalytics.mrr),
      lastMonthValue: formatPeso(displayAnalytics.mrrLastMonth),
      trend: calculateTrend(
        displayAnalytics.mrr,
        displayAnalytics.mrrLastMonth,
      ),
      trendUp: displayAnalytics.mrr > displayAnalytics.mrrLastMonth,
      icon: Repeat,
      iconBg: "#F5F3FF",
      iconColor: "#7C3AED",
    },
    {
      label: "Churn Rate",
      value: `${displayAnalytics.churnRate}%`,
      lastMonthValue: `${displayAnalytics.churnRateLastMonth}%`,
      trend: `${(displayAnalytics.churnRate - displayAnalytics.churnRateLastMonth).toFixed(1)}%`,
      trendUp: displayAnalytics.churnRate < displayAnalytics.churnRateLastMonth,
      icon: BarChart3,
      iconBg: "#FEF2F2",
      iconColor: "#DC2626",
    },
    {
      label: "Active Subscribers",
      value: displayAnalytics.activeSubscribers.toString(),
      lastMonthValue: displayAnalytics.activeSubscribersLastMonth.toString(),
      trend: `+${displayAnalytics.activeSubscribers - displayAnalytics.activeSubscribersLastMonth}`,
      trendUp:
        displayAnalytics.activeSubscribers >
        displayAnalytics.activeSubscribersLastMonth,
      icon: Users,
      iconBg: "#EFF6FF",
      iconColor: "#2563EB",
    },
    {
      label: "CAC",
      value: formatPeso(displayAnalytics.cac),
      lastMonthValue: formatPeso(displayAnalytics.cacLastMonth),
      trend: calculateTrend(
        displayAnalytics.cac,
        displayAnalytics.cacLastMonth,
      ),
      trendUp: displayAnalytics.cac < displayAnalytics.cacLastMonth,
      icon: Target,
      iconBg: "#FFF7ED",
      iconColor: "#EA580C",
    },
    {
      label: "CAC Payback",
      value: `${displayAnalytics.cacPaybackMonths} mo`,
      lastMonthValue: `${displayAnalytics.cacPaybackMonthsLastMonth} mo`,
      trend: `${(displayAnalytics.cacPaybackMonths - displayAnalytics.cacPaybackMonthsLastMonth).toFixed(1)} mo`,
      trendUp:
        displayAnalytics.cacPaybackMonths <
        displayAnalytics.cacPaybackMonthsLastMonth,
      icon: Timer,
      iconBg: "#FDF4FF",
      iconColor: "#A855F7",
    },
  ];

  const subscriptionKpis = [
    {
      label: "Active Subscriptions",
      value: displayAnalytics.activeSubscribers.toString(),
      lastMonthValue: displayAnalytics.activeSubscribersLastMonth.toString(),
      trend: `+${displayAnalytics.activeSubscribers - displayAnalytics.activeSubscribersLastMonth}`,
      trendUp:
        displayAnalytics.activeSubscribers >
        displayAnalytics.activeSubscribersLastMonth,
      icon: Users,
      iconBg: "#D1FAE5",
      iconColor: "#059669",
    },
    {
      label: "MRR",
      value: formatPeso(displayAnalytics.mrr),
      lastMonthValue: formatPeso(displayAnalytics.mrrLastMonth),
      trend: calculateTrend(
        displayAnalytics.mrr,
        displayAnalytics.mrrLastMonth,
      ),
      trendUp: displayAnalytics.mrr > displayAnalytics.mrrLastMonth,
      icon: Repeat,
      iconBg: "#EDE9FE",
      iconColor: "#7C3AED",
    },
    {
      label: "Churn Rate",
      value: `${displayAnalytics.churnRate}%`,
      lastMonthValue: `${displayAnalytics.churnRateLastMonth}%`,
      trend: `${(displayAnalytics.churnRate - displayAnalytics.churnRateLastMonth).toFixed(1)}%`,
      trendUp: displayAnalytics.churnRate < displayAnalytics.churnRateLastMonth,
      icon: BarChart3,
      iconBg: "#FEF3C7",
      iconColor: "#D97706",
    },
    {
      label: "Avg LTV",
      value: formatPeso(displayAnalytics.avgLTV),
      trend: "+5%",
      trendUp: true,
      icon: Heart,
      iconBg: "#FCE7F3",
      iconColor: "#DB2777",
    },
  ];

  // Sorting state for Menu Contribution table
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: "asc" | "desc";
  }>({
    key: "revenue",
    direction: "desc",
  });

  const sortedContribution = useMemo(() => {
    const sortableData = [...displayAnalytics.menuContribution];
    sortableData.sort(
      (
        a: Record<string, number | string>,
        b: Record<string, number | string>,
      ) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      },
    );
    return sortableData;
  }, [sortConfig, displayAnalytics.menuContribution]);

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }));
  };

  // Count orders by status
  const statusCounts = (displayOrders as Array<{ status: string }>).reduce(
    (acc: Record<string, number>, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const orderStatuses = [
    {
      label: "New Orders",
      key: "new",
      icon: AlertCircle,
      description: "Awaiting confirmation",
    },
    {
      label: "Preparing",
      key: "preparing",
      icon: ChefHat,
      description: "In the kitchen",
    },
    {
      label: "Ready for Pick-up",
      key: "ready",
      icon: Package,
      description: "Waiting for courier",
    },
    {
      label: "Out for Delivery",
      key: "delivering",
      icon: Truck,
      description: "On the way to customer",
    },
    {
      label: "Delivered",
      key: "delivered",
      icon: CheckCircle2,
      description: "Journey completed",
    },
  ];

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "subscriptions", label: "Subscription Analytics" },
    { key: "operations", label: "Operations & Fulfillment" },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ color: "#1A1A2E", fontFamily: "'DM Serif Display', serif" }}
        >
          Dashboard
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#6B7280" }}>
          Welcome back. Here&apos;s your business overview for today.
        </p>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 rounded-lg p-1"
        style={{ backgroundColor: "#F3F4F6" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="rounded-md px-4 py-2 text-sm font-medium transition-colors duration-150"
            style={{
              backgroundColor:
                activeTab === tab.key ? "#FFFFFF" : "transparent",
              color: activeTab === tab.key ? "#1A1A2E" : "#6B7280",
              boxShadow:
                activeTab === tab.key ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <TooltipProvider>
          {/* Live Operational Flow */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="rounded-2xl p-6"
            style={{
              backgroundColor: "#FFFFFF",
              boxShadow:
                "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
              border: "1px solid #F3F4F6",
            }}
          >
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: "#1B4332" }}
                >
                  <Activity size={20} className="text-white" />
                </div>
                <div>
                  <h2
                    className="text-lg font-bold"
                    style={{ color: "#1A1A2E" }}
                  >
                    Live Operational Flow
                  </h2>
                  <p className="text-sm" style={{ color: "#6B7280" }}>
                    Real-time order progression for today
                  </p>
                </div>
              </div>

              <div
                className="flex items-center gap-2 rounded-full border px-3 py-1.5"
                style={{ borderColor: "#E5E7EB", backgroundColor: "#F9FAFB" }}
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-red-500">
                  Live
                </span>
                <div className="mx-1 h-3 w-px bg-gray-300"></div>
                <span className="text-[10px] font-medium text-gray-500">
                  AUTO-SYNC ACTIVE
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {orderStatuses.map((s) => {
                const colors = statusColors[s.key];
                const Icon = s.icon;
                const count = statusCounts[s.key] || 0;
                const isActive = ["new", "preparing", "delivering"].includes(
                  s.key,
                );

                return (
                  <motion.div
                    key={s.key}
                    whileHover={{ y: -4 }}
                    className="relative flex flex-col items-start overflow-hidden rounded-xl border p-4 transition-all"
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderColor: "#F3F4F6",
                    }}
                  >
                    {/* Background Accent */}
                    <div
                      className="absolute right-[-10px] top-[-10px] h-20 w-20 opacity-[0.03]"
                      style={{ color: colors.text }}
                    >
                      <Icon size={80} />
                    </div>

                    <div className="mb-3 flex w-full items-center justify-between">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${colors.bg}` }}
                      >
                        <Icon size={18} style={{ color: colors.text }} />
                      </div>
                      {isActive && (
                        <div className="flex gap-1">
                          <div
                            className="h-1 w-1 animate-pulse rounded-full"
                            style={{ backgroundColor: colors.text }}
                          ></div>
                          <div
                            className="h-1 w-1 animate-pulse rounded-full delay-75"
                            style={{ backgroundColor: colors.text }}
                          ></div>
                          <div
                            className="h-1 w-1 animate-pulse rounded-full delay-150"
                            style={{ backgroundColor: colors.text }}
                          ></div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col">
                      <motion.span
                        key={count}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-3xl font-black"
                        style={{ color: "#1A1A2E" }}
                      >
                        {count}
                      </motion.span>
                      <span
                        className="text-xs font-bold uppercase tracking-wide"
                        style={{ color: colors.text }}
                      >
                        {s.label}
                      </span>
                      <p className="mt-1 text-[10px] italic leading-tight text-gray-400">
                        {s.description}
                      </p>
                    </div>

                    {/* Progress Indicator */}
                    <div className="mt-4 h-1 w-full rounded-full bg-gray-100">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: count > 0 ? "100%" : "0%" }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: colors.text, opacity: 0.2 }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
          {/* KPI Cards */}
          {dashboardQuery.isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonKPI key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
              {overviewKpis.map((kpi, i) => {
                const Icon = kpi.icon;
                return (
                  <Tooltip key={kpi.label}>
                    <TooltipTrigger asChild>
                      <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05, duration: 0.3 }}
                        className="rounded-xl p-4 cursor-help"
                        style={{
                          backgroundColor: "#FFFFFF",
                          boxShadow: "var(--shadow-card)",
                          border: "1px solid #E5E7EB",
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div
                            className="flex h-9 w-9 items-center justify-center rounded-lg"
                            style={{ backgroundColor: kpi.iconBg }}
                          >
                            <Icon size={18} style={{ color: kpi.iconColor }} />
                          </div>
                          <span
                            className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider"
                            style={{
                              color: kpi.trendUp ? "#059669" : "#DC2626",
                            }}
                          >
                            {kpi.trendUp ? (
                              <TrendingUp size={12} />
                            ) : (
                              <TrendingDown size={12} />
                            )}
                            {kpi.trend}
                          </span>
                        </div>
                        <p
                          className="mt-3 text-xl font-bold tracking-tight"
                          style={{ color: "#1A1A2E" }}
                        >
                          {kpi.value}
                        </p>
                        <p
                          className="mt-0.5 text-[11px] font-medium"
                          style={{ color: "#6B7280" }}
                        >
                          {kpi.label}
                        </p>
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      align="center"
                      className="flex flex-col gap-1 p-2"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-gray-500">Current</span>
                        <span className="font-bold text-slate-900">
                          {kpi.value}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-1">
                        <span className="text-gray-500">Last Month</span>
                        <span className="font-semibold text-slate-700">
                          {kpi.lastMonthValue}
                        </span>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          )}

          {/* Charts Row */}
          {dashboardQuery.isLoading ? (
            <div className="grid grid-cols-1 gap-6">
              <SkeletonChart />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {/* Revenue Chart */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.3 }}
                className="rounded-xl p-5"
                style={{
                  backgroundColor: "#FFFFFF",
                  boxShadow: "var(--shadow-card)",
                  border: "1px solid #E5E7EB",
                }}
              >
                <h2
                  className="mb-4 text-base font-semibold"
                  style={{ color: "#1A1A2E" }}
                >
                  Revenue (Last 30 Days)
                </h2>
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={displayAnalytics.revenueData}>
                      <defs>
                        <linearGradient
                          id="gradSubscription"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#1B4332"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="#1B4332"
                            stopOpacity={0}
                          />
                        </linearGradient>
                        <linearGradient
                          id="gradAlaCarte"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#E76F51"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="#E76F51"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: "#6B7280" }}
                        tickLine={false}
                        axisLine={{ stroke: "#E5E7EB" }}
                      />
                      <YAxis
                        yAxisId="revenue"
                        tick={{ fontSize: 11, fill: "#6B7280" }}
                        tickLine={false}
                        axisLine={{ stroke: "#E5E7EB" }}
                        tickFormatter={(v: number) =>
                          `${(v / 1000).toFixed(0)}k`
                        }
                      />
                      <YAxis
                        yAxisId="efficiency"
                        orientation="right"
                        tick={{ fontSize: 11, fill: "#6B7280" }}
                        tickLine={false}
                        axisLine={{ stroke: "#E5E7EB" }}
                        tickFormatter={(v: number) => v.toFixed(2)}
                        label={{
                          value: "Meals / Labor Cost",
                          angle: 90,
                          position: "insideRight",
                          style: { fontSize: 10, fill: "#6B7280" },
                        }}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "#FFFFFF",
                          border: "1px solid #E5E7EB",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(value, name) => {
                          if (name === "Labor Efficiency")
                            return [Number(value).toFixed(3), name];
                          return [formatPeso(Number(value)), name];
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                      <Bar
                        yAxisId="efficiency"
                        dataKey="laborEfficiency"
                        fill="#264653"
                        opacity={0.2}
                        name="Labor Efficiency"
                        barSize={14}
                      />
                      <Area
                        yAxisId="revenue"
                        type="monotone"
                        dataKey="subscription"
                        stroke="#1B4332"
                        strokeWidth={2}
                        fill="url(#gradSubscription)"
                        name="Subscription"
                      />
                      <Area
                        yAxisId="revenue"
                        type="monotone"
                        dataKey="alaCarte"
                        stroke="#E76F51"
                        strokeWidth={2}
                        fill="url(#gradAlaCarte)"
                        name="A La Carte"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </div>
          )}

          {/* Menu Profitability & Performance */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            className="rounded-xl p-5"
            style={{
              backgroundColor: "#FFFFFF",
              boxShadow: "var(--shadow-card)",
              border: "1px solid #E5E7EB",
            }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2
                  className="text-base font-semibold"
                  style={{ color: "#1A1A2E" }}
                >
                  Menu Profitability & Performance
                </h2>
                <p className="mt-0.5 text-xs" style={{ color: "#6B7280" }}>
                  Ranked by{" "}
                  {sortConfig.key === "name"
                    ? "name"
                    : sortConfig.key === "revenue"
                      ? "revenue"
                      : "selected metric"}{" "}
                  — this week
                </p>
              </div>
            </div>
            <div className="overflow-x-auto" style={{ maxHeight: 480 }}>
              <table className="w-full text-sm" style={{ minWidth: 700 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #E5E7EB" }}>
                    <th
                      className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "#6B7280" }}
                    >
                      #
                    </th>
                    <th
                      className="cursor-pointer px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider transition-colors hover:bg-gray-50"
                      onClick={() => handleSort("name")}
                      style={{ color: "#6B7280" }}
                    >
                      <div className="flex items-center gap-1">
                        Meal <SortIcon column="name" sortConfig={sortConfig} />
                      </div>
                    </th>
                    <th
                      className="cursor-pointer px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider transition-colors hover:bg-gray-50"
                      onClick={() => handleSort("sold")}
                      style={{ color: "#6B7280" }}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Sold <SortIcon column="sold" sortConfig={sortConfig} />
                      </div>
                    </th>
                    <th
                      className="cursor-pointer px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider transition-colors hover:bg-gray-50"
                      onClick={() => handleSort("pricePerUnit")}
                      style={{ color: "#6B7280" }}
                    >
                      <div className="flex items-center justify-end gap-1">
                        AOV{" "}
                        <SortIcon
                          column="pricePerUnit"
                          sortConfig={sortConfig}
                        />
                      </div>
                    </th>
                    <th
                      className="cursor-pointer px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider transition-colors hover:bg-gray-50"
                      onClick={() => handleSort("costPerUnit")}
                      style={{ color: "#6B7280" }}
                    >
                      <div className="flex items-center justify-end gap-1">
                        COGS{" "}
                        <SortIcon
                          column="costPerUnit"
                          sortConfig={sortConfig}
                        />
                      </div>
                    </th>
                    <th
                      className="cursor-pointer px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider transition-colors hover:bg-gray-50"
                      onClick={() => handleSort("marginPct")}
                      style={{ color: "#6B7280" }}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Gross Margin{" "}
                        <SortIcon column="marginPct" sortConfig={sortConfig} />
                      </div>
                    </th>
                    <th
                      className="cursor-pointer px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider transition-colors hover:bg-gray-50"
                      onClick={() => handleSort("revenue")}
                      style={{ color: "#6B7280" }}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Revenue{" "}
                        <SortIcon column="revenue" sortConfig={sortConfig} />
                      </div>
                    </th>
                    <th
                      className="cursor-pointer px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider transition-colors hover:bg-gray-50"
                      onClick={() => handleSort("cookMins")}
                      style={{ color: "#6B7280" }}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Cook{" "}
                        <SortIcon column="cookMins" sortConfig={sortConfig} />
                      </div>
                    </th>
                    <th
                      className="cursor-pointer px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider transition-colors hover:bg-gray-50"
                      onClick={() => handleSort("packMins")}
                      style={{ color: "#6B7280" }}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Pack{" "}
                        <SortIcon column="packMins" sortConfig={sortConfig} />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedContribution.map((item, i) => {
                    const topRevenue = Math.max(
                      ...displayAnalytics.menuContribution.map(
                        (m) => m.revenue,
                      ),
                    );
                    const revenueBarPct = (item.revenue / topRevenue) * 100;
                    const isTop3 = i < 3;
                    return (
                      <tr
                        key={item.name}
                        style={{
                          borderBottom: "1px solid #F3F4F6",
                          backgroundColor: isTop3 ? "#F0FDF4" : "transparent",
                        }}
                      >
                        <td
                          className="px-3 py-2.5 text-left text-xs font-bold"
                          style={{ color: isTop3 ? "#1B4332" : "#6B7280" }}
                        >
                          {i + 1}
                        </td>
                        <td
                          className="px-3 py-2.5 font-medium"
                          style={{ color: "#1A1A2E" }}
                        >
                          {item.name}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold">
                          {item.sold}
                        </td>
                        <td
                          className="px-3 py-2.5 text-right text-xs font-semibold"
                          style={{ color: "#1A1A2E" }}
                        >
                          {formatPeso(item.pricePerUnit)}
                        </td>
                        <td
                          className="px-3 py-2.5 text-right text-xs font-semibold"
                          style={{ color: "#6B7280" }}
                        >
                          {formatPeso(item.costPerUnit)}
                        </td>
                        <td
                          className="px-3 py-2.5 text-right text-xs font-semibold"
                          style={{
                            color: item.marginPct >= 55 ? "#065F46" : "#991B1B",
                          }}
                        >
                          {item.marginPct.toFixed(1)}%
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div
                              className="h-2 rounded-full"
                              style={{
                                width: `${Math.max(revenueBarPct, 8)}%`,
                                maxWidth: 80,
                                backgroundColor: "#2D6A4F",
                                opacity: 0.35,
                              }}
                            />
                            <span
                              className="font-semibold"
                              style={{
                                color: "#1A1A2E",
                                minWidth: 64,
                                textAlign: "right",
                              }}
                            >
                              {formatPeso(item.revenue)}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right text-xs text-gray-500">
                          {item.cookMins}m
                        </td>
                        <td className="px-3 py-2.5 text-right text-xs text-gray-500">
                          {item.packMins}m
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        </TooltipProvider>
      )}

      {activeTab === "subscriptions" && (
        <TooltipProvider>
          {/* Subscription KPI Cards */}
          {dashboardQuery.isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonKPI key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {subscriptionKpis.map((kpi, i) => {
                const Icon = kpi.icon;
                return (
                  <Tooltip key={kpi.label}>
                    <TooltipTrigger asChild>
                      <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05, duration: 0.3 }}
                        className="rounded-xl p-5 cursor-help"
                        style={{
                          backgroundColor: "#FFFFFF",
                          boxShadow: "var(--shadow-card)",
                          border: "1px solid #E5E7EB",
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-lg"
                            style={{ backgroundColor: kpi.iconBg }}
                          >
                            <Icon size={20} style={{ color: kpi.iconColor }} />
                          </div>
                          {kpi.label === "Churn Rate" ? (
                            <div className="relative h-10 w-10">
                              <svg viewBox="0 0 36 36" className="h-10 w-10">
                                <path
                                  d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                                  fill="none"
                                  stroke="#E5E7EB"
                                  strokeWidth="3"
                                />
                                <path
                                  d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                                  fill="none"
                                  stroke="#D97706"
                                  strokeWidth="3"
                                  strokeDasharray={`${displayAnalytics.churnRate}, 100`}
                                  strokeLinecap="round"
                                />
                              </svg>
                            </div>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 text-xs font-medium"
                              style={{
                                color: kpi.trendUp ? "#059669" : "#DC2626",
                              }}
                            >
                              {kpi.trendUp ? (
                                <TrendingUp size={14} />
                              ) : (
                                <TrendingDown size={14} />
                              )}
                              {kpi.trend}
                            </span>
                          )}
                        </div>
                        <p
                          className="mt-3 text-2xl font-bold"
                          style={{ color: "#1A1A2E" }}
                        >
                          {kpi.value}
                        </p>
                        <p
                          className="mt-1 text-xs"
                          style={{ color: "#6B7280" }}
                        >
                          {kpi.label}
                          {kpi.label === "Churn Rate" && kpi.trendUp && (
                            <span style={{ color: "#059669" }}>
                              {" "}
                              ({kpi.trend})
                            </span>
                          )}
                          {kpi.label === "Churn Rate" && !kpi.trendUp && (
                            <span style={{ color: "#DC2626" }}>
                              {" "}
                              ({kpi.trend})
                            </span>
                          )}
                        </p>
                      </motion.div>
                    </TooltipTrigger>
                    {kpi.lastMonthValue && (
                      <TooltipContent
                        side="top"
                        align="center"
                        className="flex flex-col gap-1 p-2"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-gray-500">Current</span>
                          <span className="font-bold text-slate-900">
                            {kpi.value}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-1">
                          <span className="text-gray-500">Last Month</span>
                          <span className="font-semibold text-slate-700">
                            {kpi.lastMonthValue}
                          </span>
                        </div>
                      </TooltipContent>
                    )}
                  </Tooltip>
                );
              })}
            </div>
          )}

          {/* Charts Row 1 */}
          {mrrQuery.isLoading ? (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <SkeletonChart />
              <SkeletonChart />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {/* New vs Churned */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="rounded-xl p-5"
                style={{
                  backgroundColor: "#FFFFFF",
                  boxShadow: "var(--shadow-card)",
                  border: "1px solid #E5E7EB",
                }}
              >
                <h2
                  className="mb-4 text-base font-semibold"
                  style={{ color: "#1A1A2E" }}
                >
                  New vs Churned Subscribers
                </h2>
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={displayAnalytics.subscriberTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        dataKey="week"
                        tick={{ fontSize: 11, fill: "#6B7280" }}
                        tickLine={false}
                        axisLine={{ stroke: "#E5E7EB" }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#6B7280" }}
                        tickLine={false}
                        axisLine={{ stroke: "#E5E7EB" }}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "#FFFFFF",
                          border: "1px solid #E5E7EB",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                      <Bar
                        dataKey="new"
                        name="New"
                        fill="#059669"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="churned"
                        name="Churned"
                        fill="#DC2626"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Plan Distribution */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.3 }}
                className="rounded-xl p-5"
                style={{
                  backgroundColor: "#FFFFFF",
                  boxShadow: "var(--shadow-card)",
                  border: "1px solid #E5E7EB",
                }}
              >
                <h2
                  className="mb-4 text-base font-semibold"
                  style={{ color: "#1A1A2E" }}
                >
                  Plan Distribution
                </h2>
                <div className="flex items-center gap-4">
                  <div style={{ width: 200, height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={displayAnalytics.planDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                          label={renderCustomLabel}
                          labelLine={false}
                        >
                          {displayAnalytics.planDistribution.map(
                            (entry, index) => (
                              <Cell key={index} fill={entry.color} />
                            ),
                          )}
                        </Pie>
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: "#FFFFFF",
                            border: "1px solid #E5E7EB",
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                          formatter={(value) => [
                            `${value} subscribers (${((Number(value) / totalSubscribers) * 100).toFixed(1)}%)`,
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-3">
                    {displayAnalytics.planDistribution.map((plan) => (
                      <div key={plan.name} className="flex items-center gap-3">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: plan.color }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span
                              className="text-sm font-medium"
                              style={{ color: "#1A1A2E" }}
                            >
                              {plan.name}
                            </span>
                            <span
                              className="text-sm"
                              style={{ color: "#6B7280" }}
                            >
                              {plan.value}
                            </span>
                          </div>
                          <div
                            className="mt-1 h-1.5 w-full rounded-full"
                            style={{ backgroundColor: "#F3F4F6" }}
                          >
                            <div
                              className="h-1.5 rounded-full"
                              style={{
                                backgroundColor: plan.color,
                                width: `${(plan.value / totalSubscribers) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                        <span className="text-xs" style={{ color: "#6B7280" }}>
                          {((plan.value / totalSubscribers) * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* Row 2: Retention Metrics + LTV Trend */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {/* Retention Metrics */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              className="rounded-xl p-5"
              style={{
                backgroundColor: "#FFFFFF",
                boxShadow: "var(--shadow-card)",
                border: "1px solid #E5E7EB",
              }}
            >
              <h2
                className="mb-4 text-base font-semibold"
                style={{ color: "#1A1A2E" }}
              >
                Retention Metrics
              </h2>
              <div className="space-y-5">
                {retentionMetrics.map((metric) => (
                  <div key={metric.label}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm" style={{ color: "#6B7280" }}>
                        {metric.label}
                      </span>
                      <span
                        className="text-lg font-bold"
                        style={{ color: "#1A1A2E" }}
                      >
                        {metric.value}
                      </span>
                    </div>
                    <div
                      className="h-2 w-full rounded-full"
                      style={{ backgroundColor: "#F3F4F6" }}
                    >
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          backgroundColor:
                            metric.label === "Win-back Rate"
                              ? "#059669"
                              : "#2D6A4F",
                          width: `${metric.bar}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* LTV Trend */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.3 }}
              className="rounded-xl p-5"
              style={{
                backgroundColor: "#FFFFFF",
                boxShadow: "var(--shadow-card)",
                border: "1px solid #E5E7EB",
              }}
            >
              <h2
                className="mb-4 text-base font-semibold"
                style={{ color: "#1A1A2E" }}
              >
                LTV Trend (Last 6 Months)
              </h2>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={ltvTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: "#6B7280" }}
                      tickLine={false}
                      axisLine={{ stroke: "#E5E7EB" }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#6B7280" }}
                      tickLine={false}
                      axisLine={{ stroke: "#E5E7EB" }}
                      tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #E5E7EB",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(value) => [
                        formatPeso(Number(value ?? 0)),
                        "LTV",
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="ltv"
                      stroke="#1B4332"
                      strokeWidth={2.5}
                      dot={{ fill: "#1B4332", r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          {/* Cohort Retention Heatmap */}
          {cohortsQuery.isLoading ? (
            <SkeletonChart />
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              className="rounded-xl p-5"
              style={{
                backgroundColor: "#FFFFFF",
                boxShadow: "var(--shadow-card)",
                border: "1px solid #E5E7EB",
              }}
            >
              <h2
                className="mb-4 text-base font-semibold"
                style={{ color: "#1A1A2E" }}
              >
                Cohort Retention Heatmap
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                        style={{ color: "#6B7280" }}
                      >
                        Signup Month
                      </th>
                      {cohortColumns.map((col, i) => (
                        <th
                          key={col}
                          className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider"
                          style={{ color: "#6B7280" }}
                        >
                          Month {i + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayAnalytics.cohortRetention.map((row) => (
                      <tr
                        key={row.month}
                        style={{ borderBottom: "1px solid #F3F4F6" }}
                      >
                        <td
                          className="px-4 py-3 font-medium"
                          style={{ color: "#1A1A2E" }}
                        >
                          {row.month}
                        </td>
                        {cohortColumns.map((col) => {
                          const value = row[col] as number | undefined;
                          return (
                            <td key={col} className="px-2 py-2 text-center">
                              {value !== undefined ? (
                                <span
                                  className="inline-flex h-10 w-16 items-center justify-center rounded-md text-xs font-bold"
                                  style={{
                                    backgroundColor: getCohortColor(value),
                                    color: getCohortTextColor(value),
                                  }}
                                >
                                  {value}%
                                </span>
                              ) : (
                                <span
                                  className="inline-flex h-10 w-16 items-center justify-center rounded-md text-xs"
                                  style={{
                                    backgroundColor: "#F9FAFB",
                                    color: "#D1D5DB",
                                  }}
                                >
                                  --
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Color scale legend */}
              <div className="mt-4 flex items-center justify-end gap-2">
                <span className="text-xs" style={{ color: "#6B7280" }}>
                  Low
                </span>
                <div className="flex gap-0.5">
                  {[
                    "#DC2626",
                    "#E76F51",
                    "#F4A261",
                    "#34D399",
                    "#10B981",
                    "#059669",
                  ].map((color) => (
                    <div
                      key={color}
                      className="h-3 w-6 first:rounded-l last:rounded-r"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <span className="text-xs" style={{ color: "#6B7280" }}>
                  High
                </span>
              </div>
            </motion.div>
          )}

          {/* ─── CUSTOMER BEHAVIOR ─── */}
          <div>
            <h2
              className="mb-4 text-lg font-bold"
              style={{
                color: "#1A1A2E",
                fontFamily: "'DM Serif Display', serif",
              }}
            >
              Customer Behavior
            </h2>

            {/* Behavior KPI row */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
              {[
                {
                  label: "Upgrade Rate",
                  value: `${customerBehaviorData.upgradeRate}%`,
                  prev: `${customerBehaviorData.upgradeRateLastMonth}%`,
                  up:
                    customerBehaviorData.upgradeRate >
                    customerBehaviorData.upgradeRateLastMonth,
                  icon: TrendingUp,
                  iconBg: "#D1FAE5",
                  iconColor: "#059669",
                },
                {
                  label: "Downgrade Rate",
                  value: `${customerBehaviorData.downgradeRate}%`,
                  prev: `${customerBehaviorData.downgradeRateLastMonth}%`,
                  up:
                    customerBehaviorData.downgradeRate <
                    customerBehaviorData.downgradeRateLastMonth,
                  icon: TrendingDown,
                  iconBg: "#FEE2E2",
                  iconColor: "#DC2626",
                },
                {
                  label: "Pause Rate",
                  value: `${customerBehaviorData.pauseRate}%`,
                  prev: `${customerBehaviorData.pauseRateLastMonth}%`,
                  up:
                    customerBehaviorData.pauseRate <
                    customerBehaviorData.pauseRateLastMonth,
                  icon: Pause,
                  iconBg: "#FEF3C7",
                  iconColor: "#D97706",
                },
                {
                  label: "Reactivation Rate",
                  value: `${customerBehaviorData.reactivationRate}%`,
                  prev: `${customerBehaviorData.reactivationRateLastMonth}%`,
                  up:
                    customerBehaviorData.reactivationRate >
                    customerBehaviorData.reactivationRateLastMonth,
                  icon: RefreshCw,
                  iconBg: "#DBEAFE",
                  iconColor: "#2563EB",
                },
                {
                  label: "NPS Score",
                  value: customerBehaviorData.npsScore.toString(),
                  prev: customerBehaviorData.npsLastMonth.toString(),
                  up:
                    customerBehaviorData.npsScore >
                    customerBehaviorData.npsLastMonth,
                  icon: Star,
                  iconBg: "#FDF4FF",
                  iconColor: "#A855F7",
                },
              ].map((kpi, i) => {
                const Icon = kpi.icon;
                return (
                  <Tooltip key={kpi.label}>
                    <TooltipTrigger asChild>
                      <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05, duration: 0.3 }}
                        className="cursor-help rounded-xl p-4"
                        style={{
                          backgroundColor: "#FFFFFF",
                          boxShadow: "var(--shadow-card)",
                          border: "1px solid #E5E7EB",
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div
                            className="flex h-9 w-9 items-center justify-center rounded-lg"
                            style={{ backgroundColor: kpi.iconBg }}
                          >
                            <Icon size={18} style={{ color: kpi.iconColor }} />
                          </div>
                          <span
                            className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider"
                            style={{ color: kpi.up ? "#059669" : "#DC2626" }}
                          >
                            {kpi.up ? (
                              <TrendingUp size={12} />
                            ) : (
                              <TrendingDown size={12} />
                            )}
                          </span>
                        </div>
                        <p
                          className="mt-3 text-xl font-bold tracking-tight"
                          style={{ color: "#1A1A2E" }}
                        >
                          {kpi.value}
                        </p>
                        <p
                          className="mt-0.5 text-[11px] font-medium"
                          style={{ color: "#6B7280" }}
                        >
                          {kpi.label}
                        </p>
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      align="center"
                      className="flex flex-col gap-1 p-2"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-gray-500">Current</span>
                        <span className="font-bold text-slate-900">
                          {kpi.value}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-1">
                        <span className="text-gray-500">Last Month</span>
                        <span className="font-semibold text-slate-700">
                          {kpi.prev}
                        </span>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>

          {/* Plan Upgrade/Downgrade Trend + NPS Breakdown */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.3 }}
              className="rounded-xl p-5"
              style={{
                backgroundColor: "#FFFFFF",
                boxShadow: "var(--shadow-card)",
                border: "1px solid #E5E7EB",
              }}
            >
              <h2
                className="mb-4 text-base font-semibold"
                style={{ color: "#1A1A2E" }}
              >
                Plan Upgrade / Downgrade Trend
              </h2>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={customerBehaviorData.planMovement}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: "#6B7280" }}
                      tickLine={false}
                      axisLine={{ stroke: "#E5E7EB" }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#6B7280" }}
                      tickLine={false}
                      axisLine={{ stroke: "#E5E7EB" }}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #E5E7EB",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <Bar
                      dataKey="upgrades"
                      name="Upgrades"
                      fill="#059669"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="downgrades"
                      name="Downgrades"
                      fill="#DC2626"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* NPS Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.3 }}
              className="rounded-xl p-5"
              style={{
                backgroundColor: "#FFFFFF",
                boxShadow: "var(--shadow-card)",
                border: "1px solid #E5E7EB",
              }}
            >
              <h2
                className="mb-2 text-base font-semibold"
                style={{ color: "#1A1A2E" }}
              >
                NPS / Satisfaction Score
              </h2>
              <p className="mb-4 text-xs" style={{ color: "#6B7280" }}>
                Net Promoter Score breakdown
              </p>
              <div className="flex items-center gap-6">
                <div className="flex flex-col items-center justify-center">
                  <div className="relative flex h-28 w-28 items-center justify-center">
                    <svg viewBox="0 0 36 36" className="h-28 w-28">
                      <path
                        d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#E5E7EB"
                        strokeWidth="3"
                      />
                      <path
                        d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#059669"
                        strokeWidth="3"
                        strokeDasharray={`${customerBehaviorData.npsScore}, 100`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span
                      className="absolute text-2xl font-black"
                      style={{ color: "#1A1A2E" }}
                    >
                      {customerBehaviorData.npsScore}
                    </span>
                  </div>
                  <span
                    className="mt-1 text-xs font-medium"
                    style={{ color: "#059669" }}
                  >
                    Great
                  </span>
                </div>
                <div className="flex-1 space-y-4">
                  {[
                    {
                      label: "Promoters (9-10)",
                      value: customerBehaviorData.npsPromoters,
                      color: "#059669",
                    },
                    {
                      label: "Passives (7-8)",
                      value: customerBehaviorData.npsPassives,
                      color: "#D97706",
                    },
                    {
                      label: "Detractors (0-6)",
                      value: customerBehaviorData.npsDetractors,
                      color: "#DC2626",
                    },
                  ].map((seg) => (
                    <div key={seg.label}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs" style={{ color: "#6B7280" }}>
                          {seg.label}
                        </span>
                        <span
                          className="text-sm font-bold"
                          style={{ color: "#1A1A2E" }}
                        >
                          {seg.value}%
                        </span>
                      </div>
                      <div
                        className="h-2 w-full rounded-full"
                        style={{ backgroundColor: "#F3F4F6" }}
                      >
                        <div
                          className="h-2 rounded-full"
                          style={{
                            backgroundColor: seg.color,
                            width: `${seg.value}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Subscriber Flow (Pause vs Cancel) + Most/Least Popular Meals */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {/* Subscriber Flow */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.3 }}
              className="rounded-xl p-5"
              style={{
                backgroundColor: "#FFFFFF",
                boxShadow: "var(--shadow-card)",
                border: "1px solid #E5E7EB",
              }}
            >
              <h2
                className="mb-2 text-base font-semibold"
                style={{ color: "#1A1A2E" }}
              >
                Subscriber Flow — Pause vs Cancel
              </h2>
              <p className="mb-4 text-xs" style={{ color: "#6B7280" }}>
                Recoverable churn vs permanent churn this month
              </p>
              <div className="space-y-4">
                {[
                  {
                    label: "Paused (Recoverable)",
                    value:
                      customerBehaviorData.subscriberFlow.pausedRecoverable,
                    total:
                      customerBehaviorData.subscriberFlow.pausedRecoverable +
                      customerBehaviorData.subscriberFlow.cancelledChurned,
                    color: "#D97706",
                    icon: Pause,
                  },
                  {
                    label: "Cancelled (Churned)",
                    value: customerBehaviorData.subscriberFlow.cancelledChurned,
                    total:
                      customerBehaviorData.subscriberFlow.pausedRecoverable +
                      customerBehaviorData.subscriberFlow.cancelledChurned,
                    color: "#DC2626",
                    icon: TrendingDown,
                  },
                  {
                    label: "Reactivated (Win-back)",
                    value: customerBehaviorData.subscriberFlow.reactivated,
                    total:
                      customerBehaviorData.subscriberFlow.pausedRecoverable +
                      customerBehaviorData.subscriberFlow.cancelledChurned,
                    color: "#059669",
                    icon: RefreshCw,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  const pct = ((item.value / item.total) * 100).toFixed(1);
                  return (
                    <div key={item.label} className="flex items-center gap-3">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${item.color}15` }}
                      >
                        <Icon size={16} style={{ color: item.color }} />
                      </div>
                      <div className="flex-1">
                        <div className="mb-1 flex items-center justify-between">
                          <span
                            className="text-sm font-medium"
                            style={{ color: "#1A1A2E" }}
                          >
                            {item.label}
                          </span>
                          <span
                            className="text-sm font-bold"
                            style={{ color: "#1A1A2E" }}
                          >
                            {item.value}{" "}
                            <span className="text-xs font-normal text-gray-400">
                              ({pct}%)
                            </span>
                          </span>
                        </div>
                        <div
                          className="h-2 w-full rounded-full"
                          style={{ backgroundColor: "#F3F4F6" }}
                        >
                          <div
                            className="h-2 rounded-full"
                            style={{
                              backgroundColor: item.color,
                              width: `${pct}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Most / Least Popular Meals */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.3 }}
              className="rounded-xl p-5"
              style={{
                backgroundColor: "#FFFFFF",
                boxShadow: "var(--shadow-card)",
                border: "1px solid #E5E7EB",
              }}
            >
              <h2
                className="mb-2 text-base font-semibold"
                style={{ color: "#1A1A2E" }}
              >
                Most & Least Popular Meals
              </h2>
              <p className="mb-3 text-xs" style={{ color: "#6B7280" }}>
                Subscriber meal preferences — informs menu planning
              </p>
              <div
                className="space-y-2"
                style={{ maxHeight: 320, overflowY: "auto" }}
              >
                {[...customerBehaviorData.mealPopularityBySubscribers]
                  .sort((a, b) => b.orders - a.orders)
                  .map((meal, i, arr) => {
                    const maxOrders = arr[0].orders;
                    const isTop3 = i < 3;
                    const isBottom3 = i >= arr.length - 3;
                    return (
                      <div
                        key={meal.name}
                        className="flex items-center gap-3 rounded-lg px-3 py-2"
                        style={{
                          backgroundColor: isTop3
                            ? "#F0FDF4"
                            : isBottom3
                              ? "#FEF2F2"
                              : "transparent",
                        }}
                      >
                        <span
                          className="w-5 text-xs font-bold"
                          style={{
                            color: isTop3
                              ? "#059669"
                              : isBottom3
                                ? "#DC2626"
                                : "#6B7280",
                          }}
                        >
                          {isTop3 ? (
                            <Flame size={14} style={{ color: "#059669" }} />
                          ) : isBottom3 ? (
                            <Snowflake size={14} style={{ color: "#DC2626" }} />
                          ) : (
                            `${i + 1}`
                          )}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span
                              className="text-sm font-medium"
                              style={{ color: "#1A1A2E" }}
                            >
                              {meal.name}
                            </span>
                            <span
                              className="text-xs font-semibold"
                              style={{ color: "#6B7280" }}
                            >
                              {meal.orders} orders
                            </span>
                          </div>
                          <div
                            className="mt-1 h-1.5 w-full rounded-full"
                            style={{ backgroundColor: "#F3F4F6" }}
                          >
                            <div
                              className="h-1.5 rounded-full"
                              style={{
                                backgroundColor: isTop3
                                  ? "#059669"
                                  : isBottom3
                                    ? "#DC2626"
                                    : "#2D6A4F",
                                width: `${(meal.orders / maxOrders) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                        <span className="text-xs" style={{ color: "#D97706" }}>
                          {meal.rating}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </motion.div>
          </div>

          {/* ─── DEMAND PLANNING ─── */}
          <div>
            <h2
              className="mb-4 text-lg font-bold"
              style={{
                color: "#1A1A2E",
                fontFamily: "'DM Serif Display', serif",
              }}
            >
              Demand Planning
            </h2>
          </div>

          {/* Meals by Plan Type */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.3 }}
            className="rounded-xl p-5"
            style={{
              backgroundColor: "#FFFFFF",
              boxShadow: "var(--shadow-card)",
              border: "1px solid #E5E7EB",
            }}
          >
            <h2
              className="mb-2 text-base font-semibold"
              style={{ color: "#1A1A2E" }}
            >
              Meals by Plan Type
            </h2>
            <p className="mb-4 text-xs" style={{ color: "#6B7280" }}>
              Breakdown of meal orders per subscription tier — capacity planning
            </p>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={demandPlanningData.mealsByPlanType}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="plan"
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    tickLine={false}
                    axisLine={{ stroke: "#E5E7EB" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    tickLine={false}
                    axisLine={{ stroke: "#E5E7EB" }}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E5E7EB",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Bar
                    dataKey="garlic"
                    name="Garlic Chicken"
                    fill="#1B4332"
                    radius={[2, 2, 0, 0]}
                    stackId="a"
                  />
                  <Bar
                    dataKey="adobo"
                    name="Chicken Adobo"
                    fill="#2D6A4F"
                    stackId="a"
                  />
                  <Bar
                    dataKey="salmon"
                    name="Salmon Teriyaki"
                    fill="#40916C"
                    stackId="a"
                  />
                  <Bar
                    dataKey="korean"
                    name="Korean BBQ"
                    fill="#E76F51"
                    stackId="a"
                  />
                  <Bar
                    dataKey="others"
                    name="Others"
                    fill="#D1D5DB"
                    radius={[2, 2, 0, 0]}
                    stackId="a"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Demand Forecast vs Actual + Peak Order Days */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.3 }}
              className="rounded-xl p-5"
              style={{
                backgroundColor: "#FFFFFF",
                boxShadow: "var(--shadow-card)",
                border: "1px solid #E5E7EB",
              }}
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2
                    className="text-base font-semibold"
                    style={{ color: "#1A1A2E" }}
                  >
                    Demand Forecast vs Actual
                  </h2>
                  <p className="mt-0.5 text-xs" style={{ color: "#6B7280" }}>
                    Helps reduce waste and stockouts
                  </p>
                </div>
                <div
                  className="flex items-center gap-2 rounded-full px-3 py-1"
                  style={{ backgroundColor: "#F0FDF4" }}
                >
                  <Target size={12} style={{ color: "#059669" }} />
                  <span
                    className="text-xs font-bold"
                    style={{ color: "#059669" }}
                  >
                    {demandPlanningData.forecastAccuracy}% accuracy
                  </span>
                </div>
              </div>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={demandPlanningData.demandForecast}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="week"
                      tick={{ fontSize: 11, fill: "#6B7280" }}
                      tickLine={false}
                      axisLine={{ stroke: "#E5E7EB" }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#6B7280" }}
                      tickLine={false}
                      axisLine={{ stroke: "#E5E7EB" }}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #E5E7EB",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <Line
                      type="monotone"
                      dataKey="forecast"
                      name="Forecast"
                      stroke="#2D6A4F"
                      strokeWidth={2}
                      strokeDasharray="6 3"
                      dot={{ fill: "#2D6A4F", r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      name="Actual"
                      stroke="#E76F51"
                      strokeWidth={2.5}
                      dot={{ fill: "#E76F51", r: 4 }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75, duration: 0.3 }}
              className="rounded-xl p-5"
              style={{
                backgroundColor: "#FFFFFF",
                boxShadow: "var(--shadow-card)",
                border: "1px solid #E5E7EB",
              }}
            >
              <h2
                className="mb-2 text-base font-semibold"
                style={{ color: "#1A1A2E" }}
              >
                Peak Order Days
              </h2>
              <p className="mb-4 text-xs" style={{ color: "#6B7280" }}>
                Staffing and delivery route optimization
              </p>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={demandPlanningData.peakOrderDays}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 11, fill: "#6B7280" }}
                      tickLine={false}
                      axisLine={{ stroke: "#E5E7EB" }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#6B7280" }}
                      tickLine={false}
                      axisLine={{ stroke: "#E5E7EB" }}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #E5E7EB",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="orders" name="Orders" radius={[6, 6, 0, 0]}>
                      {demandPlanningData.peakOrderDays.map((entry, index) => {
                        const max = Math.max(
                          ...demandPlanningData.peakOrderDays.map(
                            (d) => d.orders,
                          ),
                        );
                        return (
                          <Cell
                            key={index}
                            fill={entry.orders === max ? "#E76F51" : "#2D6A4F"}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          {/* Peak Order Hours */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.3 }}
            className="rounded-xl p-5"
            style={{
              backgroundColor: "#FFFFFF",
              boxShadow: "var(--shadow-card)",
              border: "1px solid #E5E7EB",
            }}
          >
            <h2
              className="mb-2 text-base font-semibold"
              style={{ color: "#1A1A2E" }}
            >
              Peak Order Hours
            </h2>
            <p className="mb-4 text-xs" style={{ color: "#6B7280" }}>
              Hourly order distribution — delivery and kitchen scheduling
            </p>
            <div style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={demandPlanningData.peakOrderHours}>
                  <defs>
                    <linearGradient
                      id="gradPeakHours"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#1B4332" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#1B4332" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    tickLine={false}
                    axisLine={{ stroke: "#E5E7EB" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    tickLine={false}
                    axisLine={{ stroke: "#E5E7EB" }}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E5E7EB",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value) => [`${value} orders`]}
                  />
                  <Area
                    type="monotone"
                    dataKey="orders"
                    stroke="#1B4332"
                    strokeWidth={2.5}
                    fill="url(#gradPeakHours)"
                    dot={{ fill: "#1B4332", r: 3 }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </TooltipProvider>
      )}

      {activeTab === "operations" && (
        <TooltipProvider>
          {/* Operations KPI Cards */}
          {dashboardQuery.isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonKPI key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Order Fulfillment Rate",
                  value: `${displayAnalytics.orderFulfillmentRate}%`,
                  lastMonthValue: `${displayAnalytics.orderFulfillmentRateLastMonth}%`,
                  trend: calculateTrend(
                    displayAnalytics.orderFulfillmentRate,
                    displayAnalytics.orderFulfillmentRateLastMonth,
                  ),
                  trendUp:
                    displayAnalytics.orderFulfillmentRate >
                    displayAnalytics.orderFulfillmentRateLastMonth,
                  icon: CheckCircle2,
                  iconBg: "#D1FAE5",
                  iconColor: "#059669",
                  description: "% of orders delivered on time",
                },
                {
                  label: "Avg Prep Time",
                  value: `${displayAnalytics.avgPrepTimeMinutes} min`,
                  lastMonthValue: `${displayAnalytics.avgPrepTimeMinutesLastMonth} min`,
                  trend: calculateTrend(
                    displayAnalytics.avgPrepTimeMinutes,
                    displayAnalytics.avgPrepTimeMinutesLastMonth,
                  ),
                  trendUp:
                    displayAnalytics.avgPrepTimeMinutes <
                    displayAnalytics.avgPrepTimeMinutesLastMonth,
                  icon: Clock,
                  iconBg: "#FEF3C7",
                  iconColor: "#D97706",
                  description: "Kitchen efficiency per order",
                },
                {
                  label: "Food Waste",
                  value: `${displayAnalytics.foodWastePercent}%`,
                  lastMonthValue: `${displayAnalytics.foodWastePercentLastMonth}%`,
                  trend: calculateTrend(
                    displayAnalytics.foodWastePercent,
                    displayAnalytics.foodWastePercentLastMonth,
                  ),
                  trendUp:
                    displayAnalytics.foodWastePercent <
                    displayAnalytics.foodWastePercentLastMonth,
                  icon: Trash2,
                  iconBg: "#FEE2E2",
                  iconColor: "#DC2626",
                  description: "Over-prepped ingredients vs. orders",
                },
                {
                  label: "Delivery Success Rate",
                  value: `${displayAnalytics.deliverySuccessRate}%`,
                  lastMonthValue: `${displayAnalytics.deliverySuccessRateLastMonth}%`,
                  trend: calculateTrend(
                    displayAnalytics.deliverySuccessRate,
                    displayAnalytics.deliverySuccessRateLastMonth,
                  ),
                  trendUp:
                    displayAnalytics.deliverySuccessRate >
                    displayAnalytics.deliverySuccessRateLastMonth,
                  icon: Truck,
                  iconBg: "#DBEAFE",
                  iconColor: "#2563EB",
                  description: "Successful deliveries as % of total",
                },
              ].map((kpi, i) => {
                const Icon = kpi.icon;
                return (
                  <Tooltip key={kpi.label}>
                    <TooltipTrigger asChild>
                      <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05, duration: 0.3 }}
                        className="rounded-xl p-5 cursor-help"
                        style={{
                          backgroundColor: "#FFFFFF",
                          boxShadow: "var(--shadow-card)",
                          border: "1px solid #E5E7EB",
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-lg"
                            style={{ backgroundColor: kpi.iconBg }}
                          >
                            <Icon size={20} style={{ color: kpi.iconColor }} />
                          </div>
                          <span
                            className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider"
                            style={{
                              color: kpi.trendUp ? "#059669" : "#DC2626",
                            }}
                          >
                            {kpi.trendUp ? (
                              <TrendingUp size={12} />
                            ) : (
                              <TrendingDown size={12} />
                            )}
                            {kpi.trend}
                          </span>
                        </div>
                        <p
                          className="mt-3 text-2xl font-bold tracking-tight"
                          style={{ color: "#1A1A2E" }}
                        >
                          {kpi.value}
                        </p>
                        <p
                          className="mt-0.5 text-[11px] font-medium"
                          style={{ color: "#6B7280" }}
                        >
                          {kpi.label}
                        </p>
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      align="center"
                      className="flex flex-col gap-1 p-2"
                    >
                      <p className="text-xs text-gray-500">{kpi.description}</p>
                      <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-1">
                        <span className="text-gray-500">Last month</span>
                        <span className="font-bold text-slate-900">
                          {kpi.lastMonthValue}
                        </span>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          )}

          {/* Fulfillment Trend Chart */}
          {ordersQuery.isLoading ? (
            <SkeletonChart />
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="rounded-2xl p-6"
              style={{
                backgroundColor: "#FFFFFF",
                boxShadow:
                  "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
                border: "1px solid #F3F4F6",
              }}
            >
              <h2
                className="mb-1 text-lg font-bold"
                style={{ color: "#1A1A2E" }}
              >
                Weekly Fulfillment Trends
              </h2>
              <p className="mb-4 text-sm" style={{ color: "#6B7280" }}>
                8-week rolling view of key operational metrics
              </p>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={displayAnalytics.fulfillmentTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 12, fill: "#6B7280" }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#6B7280" }}
                    domain={[0, 100]}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #E5E7EB",
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="fulfillment"
                    stroke="#059669"
                    strokeWidth={2}
                    name="Fulfillment %"
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="delivery"
                    stroke="#2563EB"
                    strokeWidth={2}
                    name="Delivery %"
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="waste"
                    stroke="#DC2626"
                    strokeWidth={2}
                    name="Waste %"
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Prep Time by Meal */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.3 }}
              className="rounded-2xl p-6"
              style={{
                backgroundColor: "#FFFFFF",
                boxShadow:
                  "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
                border: "1px solid #F3F4F6",
              }}
            >
              <h2
                className="mb-1 text-lg font-bold"
                style={{ color: "#1A1A2E" }}
              >
                Prep Time by Meal
              </h2>
              <p className="mb-4 text-sm" style={{ color: "#6B7280" }}>
                Average preparation time (minutes) per meal
              </p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={displayAnalytics.dailyPrepBreakdown}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 12, fill: "#6B7280" }}
                    unit=" min"
                  />
                  <YAxis
                    dataKey="meal"
                    type="category"
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    width={140}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #E5E7EB",
                      fontSize: 12,
                    }}
                    formatter={(value) => [`${value} min`, "Prep Time"]}
                  />
                  <Bar
                    dataKey="prepTime"
                    fill="#D97706"
                    radius={[0, 6, 6, 0]}
                    barSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Delivery Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="rounded-2xl p-6"
              style={{
                backgroundColor: "#FFFFFF",
                boxShadow:
                  "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
                border: "1px solid #F3F4F6",
              }}
            >
              <h2
                className="mb-1 text-lg font-bold"
                style={{ color: "#1A1A2E" }}
              >
                Delivery Breakdown
              </h2>
              <p className="mb-4 text-sm" style={{ color: "#6B7280" }}>
                Today&apos;s delivery outcome distribution
              </p>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={[
                      {
                        name: "On Time",
                        value: displayAnalytics.deliveryBreakdown.onTime,
                        color: "#059669",
                      },
                      {
                        name: "Late",
                        value: displayAnalytics.deliveryBreakdown.late,
                        color: "#D97706",
                      },
                      {
                        name: "Failed",
                        value: displayAnalytics.deliveryBreakdown.failed,
                        color: "#DC2626",
                      },
                      {
                        name: "Returned",
                        value: displayAnalytics.deliveryBreakdown.returned,
                        color: "#6B7280",
                      },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({
                      name,
                      percent,
                    }: {
                      name?: string;
                      percent?: number;
                    }) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {[
                      {
                        name: "On Time",
                        value: displayAnalytics.deliveryBreakdown.onTime,
                        color: "#059669",
                      },
                      {
                        name: "Late",
                        value: displayAnalytics.deliveryBreakdown.late,
                        color: "#D97706",
                      },
                      {
                        name: "Failed",
                        value: displayAnalytics.deliveryBreakdown.failed,
                        color: "#DC2626",
                      },
                      {
                        name: "Returned",
                        value: displayAnalytics.deliveryBreakdown.returned,
                        color: "#6B7280",
                      },
                    ].map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #E5E7EB",
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </motion.div>
          </div>

          {/* Waste per Meal Table */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.3 }}
            className="rounded-2xl p-6"
            style={{
              backgroundColor: "#FFFFFF",
              boxShadow:
                "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
              border: "1px solid #F3F4F6",
            }}
          >
            <h2 className="mb-1 text-lg font-bold" style={{ color: "#1A1A2E" }}>
              Food Waste by Meal
            </h2>
            <p className="mb-4 text-sm" style={{ color: "#6B7280" }}>
              Ingredient waste breakdown to identify over-prepping patterns
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "2px solid #E5E7EB" }}>
                    <th
                      className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "#6B7280" }}
                    >
                      Meal
                    </th>
                    <th
                      className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "#6B7280" }}
                    >
                      Orders
                    </th>
                    <th
                      className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "#6B7280" }}
                    >
                      Prep Time
                    </th>
                    <th
                      className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "#6B7280" }}
                    >
                      Waste (kg)
                    </th>
                    <th
                      className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "#6B7280" }}
                    >
                      Waste/Order
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayAnalytics.dailyPrepBreakdown.map((item, idx) => (
                    <tr
                      key={item.meal}
                      style={{
                        borderBottom: "1px solid #F3F4F6",
                        backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#F9FAFB",
                      }}
                    >
                      <td
                        className="px-3 py-2.5 font-medium"
                        style={{ color: "#1A1A2E" }}
                      >
                        {item.meal}
                      </td>
                      <td
                        className="px-3 py-2.5 text-right"
                        style={{ color: "#6B7280" }}
                      >
                        {item.orders}
                      </td>
                      <td
                        className="px-3 py-2.5 text-right"
                        style={{ color: "#6B7280" }}
                      >
                        {item.prepTime} min
                      </td>
                      <td
                        className="px-3 py-2.5 text-right font-medium"
                        style={{
                          color: item.wasteKg >= 1.5 ? "#DC2626" : "#059669",
                        }}
                      >
                        {item.wasteKg} kg
                      </td>
                      <td
                        className="px-3 py-2.5 text-right"
                        style={{ color: "#6B7280" }}
                      >
                        {((item.wasteKg / item.orders) * 1000).toFixed(0)}g
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </TooltipProvider>
      )}
    </div>
  );
}
