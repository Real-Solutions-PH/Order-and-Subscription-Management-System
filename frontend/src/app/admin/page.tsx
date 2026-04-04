'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Repeat,
  BarChart3,
  Clock,
  AlertTriangle,
  AlertCircle,
  UserPlus,
  Package,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { orders, analyticsData, formatPeso } from '@/lib/mock-data';

const statusColors: Record<string, { bg: string; text: string }> = {
  new: { bg: '#DBEAFE', text: '#1E40AF' },
  preparing: { bg: '#FEF3C7', text: '#92400E' },
  ready: { bg: '#D1FAE5', text: '#065F46' },
  delivering: { bg: '#DBEAFE', text: '#1E40AF' },
  delivered: { bg: '#D1FAE5', text: '#065F46' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B' },
};

const kpis = [
  {
    label: "Today's Revenue",
    value: formatPeso(analyticsData.todayRevenue),
    trend: '+12%',
    trendUp: true,
    icon: DollarSign,
    iconBg: '#D1FAE5',
    iconColor: '#059669',
  },
  {
    label: 'Active Subscribers',
    value: analyticsData.activeSubscribers.toString(),
    trend: '+5',
    trendUp: true,
    icon: Users,
    iconBg: '#DBEAFE',
    iconColor: '#2563EB',
  },
  {
    label: 'MRR',
    value: formatPeso(analyticsData.mrr),
    trend: '+8%',
    trendUp: true,
    icon: Repeat,
    iconBg: '#EDE9FE',
    iconColor: '#7C3AED',
  },
  {
    label: 'Churn Rate',
    value: `${analyticsData.churnRate}%`,
    trend: '-0.3%',
    trendUp: true, // lower is better
    icon: BarChart3,
    iconBg: '#FEF3C7',
    iconColor: '#D97706',
  },
];

const alerts = [
  {
    type: 'warning' as const,
    icon: Clock,
    text: 'Menu cutoff in 4 hours',
    time: '2 min ago',
    action: 'View Menu',
  },
  {
    type: 'error' as const,
    icon: AlertCircle,
    text: '3 failed payments need attention',
    time: '15 min ago',
    action: 'Review',
  },
  {
    type: 'warning' as const,
    icon: AlertTriangle,
    text: 'Low stock: Salmon Fillet (2 portions left)',
    time: '1 hr ago',
    action: 'Restock',
  },
  {
    type: 'info' as const,
    icon: UserPlus,
    text: 'New subscriber: Carlos Mendoza',
    time: '3 hrs ago',
    action: 'View',
  },
];

const alertStyles = {
  warning: { iconColor: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  error: { iconColor: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  info: { iconColor: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
};

export default function AdminDashboard() {
  // Count orders by status
  const statusCounts = orders.reduce(
    (acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const orderStatuses = [
    { label: 'New', key: 'new' },
    { label: 'Preparing', key: 'preparing' },
    { label: 'Ready', key: 'ready' },
    { label: 'Out for Delivery', key: 'delivering' },
    { label: 'Delivered', key: 'delivered' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ color: '#1A1A2E', fontFamily: "'DM Serif Display', serif" }}
        >
          Dashboard
        </h1>
        <p className="mt-1 text-sm" style={{ color: '#6B7280' }}>
          Welcome back. Here&apos;s your business overview for today.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="rounded-xl p-5"
              style={{
                backgroundColor: '#FFFFFF',
                boxShadow: 'var(--shadow-card)',
                border: '1px solid #E5E7EB',
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
                  className="inline-flex items-center gap-1 text-xs font-medium"
                  style={{ color: '#059669' }}
                >
                  {kpi.trendUp ? (
                    kpi.label === 'Churn Rate' ? (
                      <TrendingDown size={14} />
                    ) : (
                      <TrendingUp size={14} />
                    )
                  ) : (
                    <TrendingDown size={14} />
                  )}
                  {kpi.trend}
                </span>
              </div>
              <p
                className="mt-3 text-2xl font-bold"
                style={{ color: '#1A1A2E' }}
              >
                {kpi.value}
              </p>
              <p className="mt-1 text-xs" style={{ color: '#6B7280' }}>
                {kpi.label}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Orders Today */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="rounded-xl p-5"
        style={{
          backgroundColor: '#FFFFFF',
          boxShadow: 'var(--shadow-card)',
          border: '1px solid #E5E7EB',
        }}
      >
        <div className="mb-4 flex items-center gap-2">
          <Package size={18} style={{ color: '#1B4332' }} />
          <h2
            className="text-base font-semibold"
            style={{ color: '#1A1A2E' }}
          >
            Orders Today
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {orderStatuses.map((s) => {
            const colors = statusColors[s.key];
            return (
              <div
                key={s.key}
                className="flex flex-col items-center rounded-lg p-3"
                style={{
                  backgroundColor: colors.bg,
                  border: `1px solid ${colors.bg}`,
                }}
              >
                <span
                  className="text-2xl font-bold"
                  style={{ color: colors.text }}
                >
                  {statusCounts[s.key] || 0}
                </span>
                <span
                  className="mt-1 text-xs font-medium"
                  style={{ color: colors.text }}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.3 }}
          className="rounded-xl p-5 xl:col-span-2"
          style={{
            backgroundColor: '#FFFFFF',
            boxShadow: 'var(--shadow-card)',
            border: '1px solid #E5E7EB',
          }}
        >
          <h2
            className="mb-4 text-base font-semibold"
            style={{ color: '#1A1A2E' }}
          >
            Revenue (Last 30 Days)
          </h2>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analyticsData.revenueData}>
                <defs>
                  <linearGradient
                    id="gradSubscription"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#1B4332" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#1B4332" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient
                    id="gradAlaCarte"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#E76F51" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#E76F51" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  tickLine={false}
                  axisLine={{ stroke: '#E5E7EB' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  tickLine={false}
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value) => [formatPeso(Number(value))]}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                />
                <Area
                  type="monotone"
                  dataKey="subscription"
                  stroke="#1B4332"
                  strokeWidth={2}
                  fill="url(#gradSubscription)"
                  name="Subscription"
                />
                <Area
                  type="monotone"
                  dataKey="alaCarte"
                  stroke="#E76F51"
                  strokeWidth={2}
                  fill="url(#gradAlaCarte)"
                  name="A La Carte"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Popular Meals */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="rounded-xl p-5"
          style={{
            backgroundColor: '#FFFFFF',
            boxShadow: 'var(--shadow-card)',
            border: '1px solid #E5E7EB',
          }}
        >
          <h2
            className="mb-4 text-base font-semibold"
            style={{ color: '#1A1A2E' }}
          >
            Popular Meals This Week
          </h2>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analyticsData.weeklyMealPopularity}
                layout="vertical"
                margin={{ left: 0, right: 16 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#E5E7EB"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  tickLine={false}
                  axisLine={{ stroke: '#E5E7EB' }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value) => [`${value} orders`]}
                />
                <Bar dataKey="count" fill="#2D6A4F" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Alerts */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.3 }}
        className="rounded-xl p-5"
        style={{
          backgroundColor: '#FFFFFF',
          boxShadow: 'var(--shadow-card)',
          border: '1px solid #E5E7EB',
        }}
      >
        <h2
          className="mb-4 text-base font-semibold"
          style={{ color: '#1A1A2E' }}
        >
          Alerts
        </h2>
        <div className="space-y-3">
          {alerts.map((alert, i) => {
            const Icon = alert.icon;
            const style = alertStyles[alert.type];
            return (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg p-3"
                style={{
                  backgroundColor: style.bg,
                  border: `1px solid ${style.border}`,
                }}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} style={{ color: style.iconColor }} />
                  <div>
                    <p
                      className="text-sm font-medium"
                      style={{ color: '#1A1A2E' }}
                    >
                      {alert.text}
                    </p>
                    <p className="text-xs" style={{ color: '#6B7280' }}>
                      {alert.time}
                    </p>
                  </div>
                </div>
                <button
                  className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-80"
                  style={{
                    backgroundColor: style.iconColor,
                    color: '#FFFFFF',
                  }}
                >
                  {alert.action}
                </button>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
