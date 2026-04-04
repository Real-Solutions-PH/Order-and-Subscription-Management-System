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
import { useDashboardMetrics, useMRRBreakdown, usePopularItems, useCohorts, useOrders } from '@/hooks';
import { SkeletonKPI, SkeletonChart } from '@/components/ui/skeleton';

const statusColors: Record<string, { bg: string; text: string; dotBg: string }> = {
  new: { bg: "bg-info-light", text: "text-blue-800", dotBg: "bg-blue-800" },
  preparing: { bg: "bg-warning-light", text: "text-warning-dark", dotBg: "bg-warning-dark" },
  ready: { bg: "bg-success-light", text: "text-emerald-800", dotBg: "bg-emerald-800" },
  delivering: { bg: "bg-info-light", text: "text-blue-800", dotBg: "bg-blue-800" },
  delivered: { bg: "bg-success-light", text: "text-emerald-800", dotBg: "bg-emerald-800" },
  cancelled: { bg: "bg-error-light", text: "text-red-800", dotBg: "bg-red-800" },
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

function getCohortBgClass(value: number | undefined): string {
  if (value === undefined) return "bg-transparent";
  if (value >= 90) return "bg-success";
  if (value >= 80) return "bg-emerald-500";
  if (value >= 70) return "bg-emerald-400";
  if (value >= 60) return "bg-accent-light";
  if (value >= 50) return "bg-accent";
  return "bg-error";
}

function getCohortTextClass(value: number | undefined): string {
  if (value === undefined) return "text-transparent";
  if (value >= 80) return "text-surface-white";
  if (value >= 60) return "text-text-primary";
  return "text-surface-white";
}

const cohortColumns = ["m1", "m2", "m3", "m4", "m5", "m6"] as const;

const renderCustomLabel = ({ cx, cy }: { cx: number; cy: number }) => {
  return (
    <text
      x={cx}
      y={cy}
      textAnchor="middle"
      dominantBaseline="central"
      className="fill-text-primary"
      style={{ fontSize: 20, fontWeight: 700 }}
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

function SortIcon({ column, sortConfig }: { column: SortKey; sortConfig: { key: SortKey; direction: "asc" | "desc" } }) {
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
    ...(dashMetrics ? {
      mrr: Number(dashMetrics.mrr),
      activeSubscribers: dashMetrics.active_subscribers,
      churnRate: dashMetrics.churn_rate,
      avgOrderValue: Number(dashMetrics.aov),
      todayRevenue: Number(dashMetrics.total_revenue),
    } : {}),
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
        displayAnalytics.todayGrossSales > displayAnalytics.todayGrossSalesLastMonth,
      icon: DollarSign,
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      label: "Net Sales",
      value: formatPeso(displayAnalytics.todayNetSales),
      lastMonthValue: formatPeso(displayAnalytics.todayNetSalesLastMonth),
      trend: calculateTrend(
        displayAnalytics.todayNetSales,
        displayAnalytics.todayNetSalesLastMonth,
      ),
      trendUp: displayAnalytics.todayNetSales > displayAnalytics.todayNetSalesLastMonth,
      icon: Activity,
      iconBg: "bg-emerald-50",
      iconColor: "text-success",
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
        displayAnalytics.todayTotalMeals > displayAnalytics.todayTotalMealsLastMonth,
      icon: Package,
      iconBg: "bg-amber-50",
      iconColor: "text-warning",
    },
    {
      label: "MRR",
      value: formatPeso(displayAnalytics.mrr),
      lastMonthValue: formatPeso(displayAnalytics.mrrLastMonth),
      trend: calculateTrend(displayAnalytics.mrr, displayAnalytics.mrrLastMonth),
      trendUp: displayAnalytics.mrr > displayAnalytics.mrrLastMonth,
      icon: Repeat,
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600",
    },
    {
      label: "Churn Rate",
      value: `${displayAnalytics.churnRate}%`,
      lastMonthValue: `${displayAnalytics.churnRateLastMonth}%`,
      trend: `${(displayAnalytics.churnRate - displayAnalytics.churnRateLastMonth).toFixed(1)}%`,
      trendUp: displayAnalytics.churnRate < displayAnalytics.churnRateLastMonth,
      icon: BarChart3,
      iconBg: "bg-red-50",
      iconColor: "text-error",
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
      iconBg: "bg-blue-50",
      iconColor: "text-info",
    },
    {
      label: "CAC",
      value: formatPeso(displayAnalytics.cac),
      lastMonthValue: formatPeso(displayAnalytics.cacLastMonth),
      trend: calculateTrend(displayAnalytics.cac, displayAnalytics.cacLastMonth),
      trendUp: displayAnalytics.cac < displayAnalytics.cacLastMonth,
      icon: Target,
      iconBg: "bg-orange-50",
      iconColor: "text-orange-600",
    },
    {
      label: "CAC Payback",
      value: `${displayAnalytics.cacPaybackMonths} mo`,
      lastMonthValue: `${displayAnalytics.cacPaybackMonthsLastMonth} mo`,
      trend: `${(displayAnalytics.cacPaybackMonths - displayAnalytics.cacPaybackMonthsLastMonth).toFixed(1)} mo`,
      trendUp: displayAnalytics.cacPaybackMonths < displayAnalytics.cacPaybackMonthsLastMonth,
      icon: Timer,
      iconBg: "bg-fuchsia-50",
      iconColor: "text-purple-500",
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
      iconBg: "bg-success-light",
      iconColor: "text-success",
    },
    {
      label: "MRR",
      value: formatPeso(displayAnalytics.mrr),
      lastMonthValue: formatPeso(displayAnalytics.mrrLastMonth),
      trend: calculateTrend(displayAnalytics.mrr, displayAnalytics.mrrLastMonth),
      trendUp: displayAnalytics.mrr > displayAnalytics.mrrLastMonth,
      icon: Repeat,
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
    },
    {
      label: "Churn Rate",
      value: `${displayAnalytics.churnRate}%`,
      lastMonthValue: `${displayAnalytics.churnRateLastMonth}%`,
      trend: `${(displayAnalytics.churnRate - displayAnalytics.churnRateLastMonth).toFixed(1)}%`,
      trendUp: displayAnalytics.churnRate < displayAnalytics.churnRateLastMonth,
      icon: BarChart3,
      iconBg: "bg-warning-light",
      iconColor: "text-warning",
    },
    {
      label: "Avg LTV",
      value: formatPeso(displayAnalytics.avgLTV),
      trend: "+5%",
      trendUp: true,
      icon: Heart,
      iconBg: "bg-pink-100",
      iconColor: "text-pink-600",
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
    sortableData.sort((a: Record<string, number | string>, b: Record<string, number | string>) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
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
        <h1 className="text-2xl font-bold text-text-primary font-display">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Welcome back. Here&apos;s your business overview for today.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors duration-150 ${
              activeTab === tab.key
                ? "bg-surface-white text-text-primary shadow-sm"
                : "bg-transparent text-text-secondary"
            }`}
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
            className="rounded-2xl border border-border-light bg-surface-white p-6 shadow-elevated"
          >
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
                  <Activity size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-text-primary">
                    Live Operational Flow
                  </h2>
                  <p className="text-sm text-text-secondary">
                    Real-time order progression for today
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-full border border-border bg-gray-50">
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
                    className="relative flex flex-col items-start overflow-hidden rounded-xl border border-border-light bg-surface-white p-4 transition-all"
                  >
                    {/* Background Accent */}
                    <div
                      className={`absolute right-[-10px] top-[-10px] h-20 w-20 opacity-[0.03] ${colors.text}`}
                    >
                      <Icon size={80} />
                    </div>

                    <div className="mb-3 flex w-full items-center justify-between">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-lg ${colors.bg}`}
                      >
                        <Icon size={18} className={colors.text} />
                      </div>
                      {isActive && (
                        <div className="flex gap-1">
                          <div
                            className={`h-1 w-1 animate-pulse rounded-full ${colors.dotBg}`}
                          ></div>
                          <div
                            className={`h-1 w-1 animate-pulse rounded-full delay-75 ${colors.dotBg}`}
                          ></div>
                          <div
                            className={`h-1 w-1 animate-pulse rounded-full delay-150 ${colors.dotBg}`}
                          ></div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col">
                      <motion.span
                        key={count}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-3xl font-black text-text-primary"
                      >
                        {count}
                      </motion.span>
                      <span
                        className={`text-xs font-bold uppercase tracking-wide ${colors.text}`}
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
                        className={`h-full rounded-full opacity-20 ${colors.dotBg}`}
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
              {Array.from({length: 8}).map((_, i) => <SkeletonKPI key={i} />)}
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
                        className="rounded-xl border border-border bg-surface-white p-4 shadow-card cursor-help"
                      >
                        <div className="flex items-start justify-between">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-lg ${kpi.iconBg}`}
                          >
                            <Icon size={18} className={kpi.iconColor} />
                          </div>
                          <span
                            className={`inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider ${kpi.trendUp ? "text-success" : "text-error"}`}
                          >
                            {kpi.trendUp ? (
                              <TrendingUp size={12} />
                            ) : (
                              <TrendingDown size={12} />
                            )}
                            {kpi.trend}
                          </span>
                        </div>
                        <p className="mt-3 text-xl font-bold tracking-tight text-text-primary">
                          {kpi.value}
                        </p>
                        <p className="mt-0.5 text-[11px] font-medium text-text-secondary">
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
              className="rounded-xl border border-border bg-surface-white p-5 shadow-card"
            >
              <h2 className="mb-4 text-base font-semibold text-text-primary">
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
                      tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <YAxis
                      yAxisId="efficiency"
                      orientation="right"
                      tick={{ fontSize: 11, fill: "#6B7280" }}
                      tickLine={false}
                      axisLine={{ stroke: "#E5E7EB" }}
                      tickFormatter={(v: number) => v.toFixed(2)}
                      label={{ value: "Meals / Labor Cost", angle: 90, position: "insideRight", style: { fontSize: 10, fill: "#6B7280" } }}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #E5E7EB",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(value, name) => {
                        if (name === "Labor Efficiency") return [Number(value).toFixed(3), name];
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
            className="rounded-xl border border-border bg-surface-white p-5 shadow-card"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-text-primary">
                  Menu Profitability & Performance
                </h2>
                <p className="mt-0.5 text-xs text-text-secondary">
                  Ranked by {sortConfig.key === 'name' ? 'name' : sortConfig.key === 'revenue' ? 'revenue' : 'selected metric'} — this week
                </p>
              </div>
            </div>
            <div className="overflow-x-auto" style={{ maxHeight: 480 }}>
              <table className="w-full text-sm" style={{ minWidth: 700 }}>
                <thead>
                  <tr className="border-b-2 border-border">
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">#</th>
                    <th className="cursor-pointer px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary transition-colors hover:bg-gray-50" onClick={() => handleSort("name")}>
                      <div className="flex items-center gap-1">Meal <SortIcon column="name" sortConfig={sortConfig} /></div>
                    </th>
                    <th className="cursor-pointer px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-text-secondary transition-colors hover:bg-gray-50" onClick={() => handleSort("sold")}>
                      <div className="flex items-center justify-end gap-1">Sold <SortIcon column="sold" sortConfig={sortConfig} /></div>
                    </th>
                    <th className="cursor-pointer px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-text-secondary transition-colors hover:bg-gray-50" onClick={() => handleSort("pricePerUnit")}>
                      <div className="flex items-center justify-end gap-1">AOV <SortIcon column="pricePerUnit" sortConfig={sortConfig} /></div>
                    </th>
                    <th className="cursor-pointer px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-text-secondary transition-colors hover:bg-gray-50" onClick={() => handleSort("costPerUnit")}>
                      <div className="flex items-center justify-end gap-1">COGS <SortIcon column="costPerUnit" sortConfig={sortConfig} /></div>
                    </th>
                    <th className="cursor-pointer px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-text-secondary transition-colors hover:bg-gray-50" onClick={() => handleSort("marginPct")}>
                      <div className="flex items-center justify-end gap-1">Gross Margin <SortIcon column="marginPct" sortConfig={sortConfig} /></div>
                    </th>
                    <th className="cursor-pointer px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-text-secondary transition-colors hover:bg-gray-50" onClick={() => handleSort("revenue")}>
                      <div className="flex items-center justify-end gap-1">Revenue <SortIcon column="revenue" sortConfig={sortConfig} /></div>
                    </th>
                    <th className="cursor-pointer px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-text-secondary transition-colors hover:bg-gray-50" onClick={() => handleSort("cookMins")}>
                      <div className="flex items-center justify-end gap-1">Cook <SortIcon column="cookMins" sortConfig={sortConfig} /></div>
                    </th>
                    <th className="cursor-pointer px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-text-secondary transition-colors hover:bg-gray-50" onClick={() => handleSort("packMins")}>
                      <div className="flex items-center justify-end gap-1">Pack <SortIcon column="packMins" sortConfig={sortConfig} /></div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedContribution.map((item, i) => {
                    const topRevenue = Math.max(...displayAnalytics.menuContribution.map((m) => m.revenue));
                    const revenueBarPct = (item.revenue / topRevenue) * 100;
                    const isTop3 = i < 3;
                    return (
                      <tr key={item.name} className={`border-b border-border-light ${isTop3 ? "bg-green-50" : "bg-transparent"}`}>
                        <td className={`px-3 py-2.5 text-left text-xs font-bold ${isTop3 ? "text-primary" : "text-text-secondary"}`}>{i + 1}</td>
                        <td className="px-3 py-2.5 font-medium text-text-primary">{item.name}</td>
                        <td className="px-3 py-2.5 text-right font-semibold">{item.sold}</td>
                        <td className="px-3 py-2.5 text-right text-xs font-semibold text-text-primary">{formatPeso(item.pricePerUnit)}</td>
                        <td className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary">{formatPeso(item.costPerUnit)}</td>
                        <td className={`px-3 py-2.5 text-right text-xs font-semibold ${item.marginPct >= 55 ? "text-emerald-800" : "text-red-800"}`}>{item.marginPct.toFixed(1)}%</td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-2 rounded-full bg-primary-light opacity-35" style={{ width: `${Math.max(revenueBarPct, 8)}%`, maxWidth: 80 }} />
                            <span className="font-semibold text-text-primary" style={{ minWidth: 64, textAlign: "right" }}>{formatPeso(item.revenue)}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right text-xs text-gray-500">{item.cookMins}m</td>
                        <td className="px-3 py-2.5 text-right text-xs text-gray-500">{item.packMins}m</td>
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
              {Array.from({length: 4}).map((_, i) => <SkeletonKPI key={i} />)}
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
                      className="rounded-xl border border-border bg-surface-white p-5 shadow-card cursor-help"
                    >
                      <div className="flex items-start justify-between">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-lg ${kpi.iconBg}`}
                        >
                          <Icon size={20} className={kpi.iconColor} />
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
                            className={`inline-flex items-center gap-1 text-xs font-medium ${kpi.trendUp ? "text-success" : "text-error"}`}
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
                      <p className="mt-3 text-2xl font-bold text-text-primary">
                        {kpi.value}
                      </p>
                      <p className="mt-1 text-xs text-text-secondary">
                        {kpi.label}
                        {kpi.label === "Churn Rate" && kpi.trendUp && (
                          <span className="text-success">
                            {" "}
                            ({kpi.trend})
                          </span>
                        )}
                        {kpi.label === "Churn Rate" && !kpi.trendUp && (
                          <span className="text-error">
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
              className="rounded-xl border border-border bg-surface-white p-5 shadow-card"
            >
              <h2 className="mb-4 text-base font-semibold text-text-primary">
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
              className="rounded-xl border border-border bg-surface-white p-5 shadow-card"
            >
              <h2 className="mb-4 text-base font-semibold text-text-primary">
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
                        {displayAnalytics.planDistribution.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
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
                          <span className="text-sm font-medium text-text-primary">
                            {plan.name}
                          </span>
                          <span className="text-sm text-text-secondary">
                            {plan.value}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                          <div
                            className="h-1.5 rounded-full"
                            style={{
                              backgroundColor: plan.color,
                              width: `${(plan.value / totalSubscribers) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-text-secondary">
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
              className="rounded-xl border border-border bg-surface-white p-5 shadow-card"
            >
              <h2 className="mb-4 text-base font-semibold text-text-primary">
                Retention Metrics
              </h2>
              <div className="space-y-5">
                {retentionMetrics.map((metric) => (
                  <div key={metric.label}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm text-text-secondary">
                        {metric.label}
                      </span>
                      <span className="text-lg font-bold text-text-primary">
                        {metric.value}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          metric.label === "Win-back Rate"
                            ? "bg-success"
                            : "bg-primary-light"
                        }`}
                        style={{ width: `${metric.bar}%` }}
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
              className="rounded-xl border border-border bg-surface-white p-5 shadow-card"
            >
              <h2 className="mb-4 text-base font-semibold text-text-primary">
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
                      formatter={(value: number | string) => [
                        formatPeso(Number(value)),
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
            className="rounded-xl border border-border bg-surface-white p-5 shadow-card"
          >
            <h2 className="mb-4 text-base font-semibold text-text-primary">
              Cohort Retention Heatmap
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      Signup Month
                    </th>
                    {cohortColumns.map((col, i) => (
                      <th
                        key={col}
                        className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-text-secondary"
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
                      className="border-b border-border-light"
                    >
                      <td className="px-4 py-3 font-medium text-text-primary">
                        {row.month}
                      </td>
                      {cohortColumns.map((col) => {
                        const value = row[col] as number | undefined;
                        return (
                          <td key={col} className="px-2 py-2 text-center">
                            {value !== undefined ? (
                              <span
                                className={`inline-flex h-10 w-16 items-center justify-center rounded-md text-xs font-bold ${getCohortBgClass(value)} ${getCohortTextClass(value)}`}
                              >
                                {value}%
                              </span>
                            ) : (
                              <span className="inline-flex h-10 w-16 items-center justify-center rounded-md bg-gray-50 text-xs text-gray-300">
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
              <span className="text-xs text-text-secondary">
                Low
              </span>
              <div className="flex gap-0.5">
                {[
                  "bg-error",
                  "bg-accent",
                  "bg-accent-light",
                  "bg-emerald-400",
                  "bg-emerald-500",
                  "bg-success",
                ].map((bgClass) => (
                  <div
                    key={bgClass}
                    className={`h-3 w-6 first:rounded-l last:rounded-r ${bgClass}`}
                  />
                ))}
              </div>
              <span className="text-xs text-text-secondary">
                High
              </span>
            </div>
          </motion.div>
          )}

          {/* ─── CUSTOMER BEHAVIOR ─── */}
          <div>
            <h2 className="mb-4 text-lg font-bold text-text-primary font-display">
              Customer Behavior
            </h2>

            {/* Behavior KPI row */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
              {[
                { label: "Upgrade Rate", value: `${customerBehaviorData.upgradeRate}%`, prev: `${customerBehaviorData.upgradeRateLastMonth}%`, up: customerBehaviorData.upgradeRate > customerBehaviorData.upgradeRateLastMonth, icon: TrendingUp, iconBg: "bg-success-light", iconColor: "text-success" },
                { label: "Downgrade Rate", value: `${customerBehaviorData.downgradeRate}%`, prev: `${customerBehaviorData.downgradeRateLastMonth}%`, up: customerBehaviorData.downgradeRate < customerBehaviorData.downgradeRateLastMonth, icon: TrendingDown, iconBg: "bg-error-light", iconColor: "text-error" },
                { label: "Pause Rate", value: `${customerBehaviorData.pauseRate}%`, prev: `${customerBehaviorData.pauseRateLastMonth}%`, up: customerBehaviorData.pauseRate < customerBehaviorData.pauseRateLastMonth, icon: Pause, iconBg: "bg-warning-light", iconColor: "text-warning" },
                { label: "Reactivation Rate", value: `${customerBehaviorData.reactivationRate}%`, prev: `${customerBehaviorData.reactivationRateLastMonth}%`, up: customerBehaviorData.reactivationRate > customerBehaviorData.reactivationRateLastMonth, icon: RefreshCw, iconBg: "bg-info-light", iconColor: "text-info" },
                { label: "NPS Score", value: customerBehaviorData.npsScore.toString(), prev: customerBehaviorData.npsLastMonth.toString(), up: customerBehaviorData.npsScore > customerBehaviorData.npsLastMonth, icon: Star, iconBg: "bg-fuchsia-50", iconColor: "text-purple-500" },
              ].map((kpi, i) => {
                const Icon = kpi.icon;
                return (
                  <Tooltip key={kpi.label}>
                    <TooltipTrigger asChild>
                      <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05, duration: 0.3 }}
                        className="cursor-help rounded-xl border border-border bg-surface-white p-4 shadow-card"
                      >
                        <div className="flex items-start justify-between">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${kpi.iconBg}`}>
                            <Icon size={18} className={kpi.iconColor} />
                          </div>
                          <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider ${kpi.up ? "text-success" : "text-error"}`}>
                            {kpi.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          </span>
                        </div>
                        <p className="mt-3 text-xl font-bold tracking-tight text-text-primary">{kpi.value}</p>
                        <p className="mt-0.5 text-[11px] font-medium text-text-secondary">{kpi.label}</p>
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="center" className="flex flex-col gap-1 p-2">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-gray-500">Current</span>
                        <span className="font-bold text-slate-900">{kpi.value}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-1">
                        <span className="text-gray-500">Last Month</span>
                        <span className="font-semibold text-slate-700">{kpi.prev}</span>
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
              className="rounded-xl border border-border bg-surface-white p-5 shadow-card"
            >
              <h2 className="mb-4 text-base font-semibold text-text-primary">
                Plan Upgrade / Downgrade Trend
              </h2>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={customerBehaviorData.planMovement}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={{ stroke: "#E5E7EB" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={{ stroke: "#E5E7EB" }} />
                    <RechartsTooltip contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <Bar dataKey="upgrades" name="Upgrades" fill="#059669" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="downgrades" name="Downgrades" fill="#DC2626" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* NPS Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.3 }}
              className="rounded-xl border border-border bg-surface-white p-5 shadow-card"
            >
              <h2 className="mb-2 text-base font-semibold text-text-primary">
                NPS / Satisfaction Score
              </h2>
              <p className="mb-4 text-xs text-text-secondary">Net Promoter Score breakdown</p>
              <div className="flex items-center gap-6">
                <div className="flex flex-col items-center justify-center">
                  <div className="relative flex h-28 w-28 items-center justify-center">
                    <svg viewBox="0 0 36 36" className="h-28 w-28">
                      <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                      <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#059669" strokeWidth="3" strokeDasharray={`${customerBehaviorData.npsScore}, 100`} strokeLinecap="round" />
                    </svg>
                    <span className="absolute text-2xl font-black text-text-primary">{customerBehaviorData.npsScore}</span>
                  </div>
                  <span className="mt-1 text-xs font-medium text-success">Great</span>
                </div>
                <div className="flex-1 space-y-4">
                  {[
                    { label: "Promoters (9-10)", value: customerBehaviorData.npsPromoters, bgClass: "bg-success" },
                    { label: "Passives (7-8)", value: customerBehaviorData.npsPassives, bgClass: "bg-warning" },
                    { label: "Detractors (0-6)", value: customerBehaviorData.npsDetractors, bgClass: "bg-error" },
                  ].map((seg) => (
                    <div key={seg.label}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs text-text-secondary">{seg.label}</span>
                        <span className="text-sm font-bold text-text-primary">{seg.value}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted">
                        <div className={`h-2 rounded-full ${seg.bgClass}`} style={{ width: `${seg.value}%` }} />
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
              className="rounded-xl border border-border bg-surface-white p-5 shadow-card"
            >
              <h2 className="mb-2 text-base font-semibold text-text-primary">
                Subscriber Flow — Pause vs Cancel
              </h2>
              <p className="mb-4 text-xs text-text-secondary">Recoverable churn vs permanent churn this month</p>
              <div className="space-y-4">
                {[
                  { label: "Paused (Recoverable)", value: customerBehaviorData.subscriberFlow.pausedRecoverable, total: customerBehaviorData.subscriberFlow.pausedRecoverable + customerBehaviorData.subscriberFlow.cancelledChurned, iconBg: "bg-warning/15", iconColor: "text-warning", barBg: "bg-warning", icon: Pause },
                  { label: "Cancelled (Churned)", value: customerBehaviorData.subscriberFlow.cancelledChurned, total: customerBehaviorData.subscriberFlow.pausedRecoverable + customerBehaviorData.subscriberFlow.cancelledChurned, iconBg: "bg-error/15", iconColor: "text-error", barBg: "bg-error", icon: TrendingDown },
                  { label: "Reactivated (Win-back)", value: customerBehaviorData.subscriberFlow.reactivated, total: customerBehaviorData.subscriberFlow.pausedRecoverable + customerBehaviorData.subscriberFlow.cancelledChurned, iconBg: "bg-success/15", iconColor: "text-success", barBg: "bg-success", icon: RefreshCw },
                ].map((item) => {
                  const Icon = item.icon;
                  const pct = ((item.value / item.total) * 100).toFixed(1);
                  return (
                    <div key={item.label} className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${item.iconBg}`}>
                        <Icon size={16} className={item.iconColor} />
                      </div>
                      <div className="flex-1">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-sm font-medium text-text-primary">{item.label}</span>
                          <span className="text-sm font-bold text-text-primary">{item.value} <span className="text-xs font-normal text-gray-400">({pct}%)</span></span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted">
                          <div className={`h-2 rounded-full ${item.barBg}`} style={{ width: `${pct}%` }} />
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
              className="rounded-xl border border-border bg-surface-white p-5 shadow-card"
            >
              <h2 className="mb-2 text-base font-semibold text-text-primary">
                Most & Least Popular Meals
              </h2>
              <p className="mb-3 text-xs text-text-secondary">Subscriber meal preferences — informs menu planning</p>
              <div className="space-y-2" style={{ maxHeight: 320, overflowY: "auto" }}>
                {[...customerBehaviorData.mealPopularityBySubscribers]
                  .sort((a, b) => b.orders - a.orders)
                  .map((meal, i, arr) => {
                    const maxOrders = arr[0].orders;
                    const isTop3 = i < 3;
                    const isBottom3 = i >= arr.length - 3;
                    return (
                      <div key={meal.name} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${isTop3 ? "bg-green-50" : isBottom3 ? "bg-red-50" : "bg-transparent"}`}>
                        <span className={`w-5 text-xs font-bold ${isTop3 ? "text-success" : isBottom3 ? "text-error" : "text-text-secondary"}`}>
                          {isTop3 ? <Flame size={14} className="text-success" /> : isBottom3 ? <Snowflake size={14} className="text-error" /> : `${i + 1}`}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-text-primary">{meal.name}</span>
                            <span className="text-xs font-semibold text-text-secondary">{meal.orders} orders</span>
                          </div>
                          <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                            <div className={`h-1.5 rounded-full ${isTop3 ? "bg-success" : isBottom3 ? "bg-error" : "bg-primary-light"}`} style={{ width: `${(meal.orders / maxOrders) * 100}%` }} />
                          </div>
                        </div>
                        <span className="text-xs text-warning">{meal.rating}</span>
                      </div>
                    );
                  })}
              </div>
            </motion.div>
          </div>

          {/* ─── DEMAND PLANNING ─── */}
          <div>
            <h2 className="mb-4 text-lg font-bold text-text-primary font-display">
              Demand Planning
            </h2>
          </div>

          {/* Meals by Plan Type */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.3 }}
            className="rounded-xl border border-border bg-surface-white p-5 shadow-card"
          >
            <h2 className="mb-2 text-base font-semibold text-text-primary">
              Meals by Plan Type
            </h2>
            <p className="mb-4 text-xs text-text-secondary">Breakdown of meal orders per subscription tier — capacity planning</p>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={demandPlanningData.mealsByPlanType}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="plan" tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={{ stroke: "#E5E7EB" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={{ stroke: "#E5E7EB" }} />
                  <RechartsTooltip contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Bar dataKey="garlic" name="Garlic Chicken" fill="#1B4332" radius={[2, 2, 0, 0]} stackId="a" />
                  <Bar dataKey="adobo" name="Chicken Adobo" fill="#2D6A4F" stackId="a" />
                  <Bar dataKey="salmon" name="Salmon Teriyaki" fill="#40916C" stackId="a" />
                  <Bar dataKey="korean" name="Korean BBQ" fill="#E76F51" stackId="a" />
                  <Bar dataKey="others" name="Others" fill="#D1D5DB" radius={[2, 2, 0, 0]} stackId="a" />
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
              className="rounded-xl border border-border bg-surface-white p-5 shadow-card"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-text-primary">Demand Forecast vs Actual</h2>
                  <p className="mt-0.5 text-xs text-text-secondary">Helps reduce waste and stockouts</p>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-green-50 px-3 py-1">
                  <Target size={12} className="text-success" />
                  <span className="text-xs font-bold text-success">{demandPlanningData.forecastAccuracy}% accuracy</span>
                </div>
              </div>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={demandPlanningData.demandForecast}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={{ stroke: "#E5E7EB" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={{ stroke: "#E5E7EB" }} />
                    <RechartsTooltip contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#2D6A4F" strokeWidth={2} strokeDasharray="6 3" dot={{ fill: "#2D6A4F", r: 3 }} />
                    <Line type="monotone" dataKey="actual" name="Actual" stroke="#E76F51" strokeWidth={2.5} dot={{ fill: "#E76F51", r: 4 }} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75, duration: 0.3 }}
              className="rounded-xl border border-border bg-surface-white p-5 shadow-card"
            >
              <h2 className="mb-2 text-base font-semibold text-text-primary">Peak Order Days</h2>
              <p className="mb-4 text-xs text-text-secondary">Staffing and delivery route optimization</p>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={demandPlanningData.peakOrderDays}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={{ stroke: "#E5E7EB" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={{ stroke: "#E5E7EB" }} />
                    <RechartsTooltip contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="orders" name="Orders" radius={[6, 6, 0, 0]}>
                      {demandPlanningData.peakOrderDays.map((entry, index) => {
                        const max = Math.max(...demandPlanningData.peakOrderDays.map(d => d.orders));
                        return <Cell key={index} fill={entry.orders === max ? "#E76F51" : "#2D6A4F"} />;
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
            className="rounded-xl border border-border bg-surface-white p-5 shadow-card"
          >
            <h2 className="mb-2 text-base font-semibold text-text-primary">Peak Order Hours</h2>
            <p className="mb-4 text-xs text-text-secondary">Hourly order distribution — delivery and kitchen scheduling</p>
            <div style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={demandPlanningData.peakOrderHours}>
                  <defs>
                    <linearGradient id="gradPeakHours" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1B4332" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#1B4332" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={{ stroke: "#E5E7EB" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={{ stroke: "#E5E7EB" }} />
                  <RechartsTooltip contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 12 }} formatter={(value) => [`${value} orders`]} />
                  <Area type="monotone" dataKey="orders" stroke="#1B4332" strokeWidth={2.5} fill="url(#gradPeakHours)" dot={{ fill: "#1B4332", r: 3 }} activeDot={{ r: 6 }} />
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
              {Array.from({length: 4}).map((_, i) => <SkeletonKPI key={i} />)}
            </div>
          ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Order Fulfillment Rate",
                value: `${displayAnalytics.orderFulfillmentRate}%`,
                lastMonthValue: `${displayAnalytics.orderFulfillmentRateLastMonth}%`,
                trend: calculateTrend(displayAnalytics.orderFulfillmentRate, displayAnalytics.orderFulfillmentRateLastMonth),
                trendUp: displayAnalytics.orderFulfillmentRate > displayAnalytics.orderFulfillmentRateLastMonth,
                icon: CheckCircle2,
                iconBg: "bg-success-light",
                iconColor: "text-success",
                description: "% of orders delivered on time",
              },
              {
                label: "Avg Prep Time",
                value: `${displayAnalytics.avgPrepTimeMinutes} min`,
                lastMonthValue: `${displayAnalytics.avgPrepTimeMinutesLastMonth} min`,
                trend: calculateTrend(displayAnalytics.avgPrepTimeMinutes, displayAnalytics.avgPrepTimeMinutesLastMonth),
                trendUp: displayAnalytics.avgPrepTimeMinutes < displayAnalytics.avgPrepTimeMinutesLastMonth,
                icon: Clock,
                iconBg: "bg-warning-light",
                iconColor: "text-warning",
                description: "Kitchen efficiency per order",
              },
              {
                label: "Food Waste",
                value: `${displayAnalytics.foodWastePercent}%`,
                lastMonthValue: `${displayAnalytics.foodWastePercentLastMonth}%`,
                trend: calculateTrend(displayAnalytics.foodWastePercent, displayAnalytics.foodWastePercentLastMonth),
                trendUp: displayAnalytics.foodWastePercent < displayAnalytics.foodWastePercentLastMonth,
                icon: Trash2,
                iconBg: "bg-error-light",
                iconColor: "text-error",
                description: "Over-prepped ingredients vs. orders",
              },
              {
                label: "Delivery Success Rate",
                value: `${displayAnalytics.deliverySuccessRate}%`,
                lastMonthValue: `${displayAnalytics.deliverySuccessRateLastMonth}%`,
                trend: calculateTrend(displayAnalytics.deliverySuccessRate, displayAnalytics.deliverySuccessRateLastMonth),
                trendUp: displayAnalytics.deliverySuccessRate > displayAnalytics.deliverySuccessRateLastMonth,
                icon: Truck,
                iconBg: "bg-info-light",
                iconColor: "text-info",
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
                      className="rounded-xl border border-border bg-surface-white p-5 shadow-card cursor-help"
                    >
                      <div className="flex items-start justify-between">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-lg ${kpi.iconBg}`}
                        >
                          <Icon size={20} className={kpi.iconColor} />
                        </div>
                        <span
                          className={`inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider ${kpi.trendUp ? "text-success" : "text-error"}`}
                        >
                          {kpi.trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {kpi.trend}
                        </span>
                      </div>
                      <p className="mt-3 text-2xl font-bold tracking-tight text-text-primary">
                        {kpi.value}
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium text-text-secondary">
                        {kpi.label}
                      </p>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="center" className="flex flex-col gap-1 p-2">
                    <p className="text-xs text-gray-500">{kpi.description}</p>
                    <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-1">
                      <span className="text-gray-500">Last month</span>
                      <span className="font-bold text-slate-900">{kpi.lastMonthValue}</span>
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
            className="rounded-2xl border border-border-light bg-surface-white p-6 shadow-elevated"
          >
            <h2 className="mb-1 text-lg font-bold text-text-primary">
              Weekly Fulfillment Trends
            </h2>
            <p className="mb-4 text-sm text-text-secondary">
              8-week rolling view of key operational metrics
            </p>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={displayAnalytics.fulfillmentTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="week" tick={{ fontSize: 12, fill: "#6B7280" }} />
                <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} domain={[0, 100]} />
                <RechartsTooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="fulfillment" stroke="#059669" strokeWidth={2} name="Fulfillment %" dot={{ r: 3 }} />
                <Line type="monotone" dataKey="delivery" stroke="#2563EB" strokeWidth={2} name="Delivery %" dot={{ r: 3 }} />
                <Line type="monotone" dataKey="waste" stroke="#DC2626" strokeWidth={2} name="Waste %" dot={{ r: 3 }} />
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
              className="rounded-2xl border border-border-light bg-surface-white p-6 shadow-elevated"
            >
              <h2 className="mb-1 text-lg font-bold text-text-primary">
                Prep Time by Meal
              </h2>
              <p className="mb-4 text-sm text-text-secondary">
                Average preparation time (minutes) per meal
              </p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={displayAnalytics.dailyPrepBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis type="number" tick={{ fontSize: 12, fill: "#6B7280" }} unit=" min" />
                  <YAxis dataKey="meal" type="category" tick={{ fontSize: 11, fill: "#6B7280" }} width={140} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 12 }}
                    formatter={(value) => [`${value} min`, "Prep Time"]}
                  />
                  <Bar dataKey="prepTime" fill="#D97706" radius={[0, 6, 6, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Delivery Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="rounded-2xl border border-border-light bg-surface-white p-6 shadow-elevated"
            >
              <h2 className="mb-1 text-lg font-bold text-text-primary">
                Delivery Breakdown
              </h2>
              <p className="mb-4 text-sm text-text-secondary">
                Today&apos;s delivery outcome distribution
              </p>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "On Time", value: displayAnalytics.deliveryBreakdown.onTime, color: "#059669" },
                      { name: "Late", value: displayAnalytics.deliveryBreakdown.late, color: "#D97706" },
                      { name: "Failed", value: displayAnalytics.deliveryBreakdown.failed, color: "#DC2626" },
                      { name: "Returned", value: displayAnalytics.deliveryBreakdown.returned, color: "#6B7280" },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {[
                      { name: "On Time", value: displayAnalytics.deliveryBreakdown.onTime, color: "#059669" },
                      { name: "Late", value: displayAnalytics.deliveryBreakdown.late, color: "#D97706" },
                      { name: "Failed", value: displayAnalytics.deliveryBreakdown.failed, color: "#DC2626" },
                      { name: "Returned", value: displayAnalytics.deliveryBreakdown.returned, color: "#6B7280" },
                    ].map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 12 }}
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
            className="rounded-2xl border border-border-light bg-surface-white p-6 shadow-elevated"
          >
            <h2 className="mb-1 text-lg font-bold text-text-primary">
              Food Waste by Meal
            </h2>
            <p className="mb-4 text-sm text-text-secondary">
              Ingredient waste breakdown to identify over-prepping patterns
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-border">
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">Meal</th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-text-secondary">Orders</th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-text-secondary">Prep Time</th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-text-secondary">Waste (kg)</th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-text-secondary">Waste/Order</th>
                  </tr>
                </thead>
                <tbody>
                  {displayAnalytics.dailyPrepBreakdown.map((item, idx) => (
                    <tr
                      key={item.meal}
                      className={`border-b border-border-light ${idx % 2 === 0 ? "bg-surface-white" : "bg-gray-50"}`}
                    >
                      <td className="px-3 py-2.5 font-medium text-text-primary">{item.meal}</td>
                      <td className="px-3 py-2.5 text-right text-text-secondary">{item.orders}</td>
                      <td className="px-3 py-2.5 text-right text-text-secondary">{item.prepTime} min</td>
                      <td className={`px-3 py-2.5 text-right font-medium ${item.wasteKg >= 1.5 ? "text-error" : "text-success"}`}>
                        {item.wasteKg} kg
                      </td>
                      <td className="px-3 py-2.5 text-right text-text-secondary">
                        {(item.wasteKg / item.orders * 1000).toFixed(0)}g
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
