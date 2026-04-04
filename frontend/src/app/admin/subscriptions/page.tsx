'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Repeat,
  BarChart3,
  Heart,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { analyticsData, formatPeso } from '@/lib/mock-data';

const kpis = [
  {
    label: 'Active Subscriptions',
    value: '127',
    trend: '+8 from last month',
    trendUp: true,
    icon: Users,
    iconBg: '#D1FAE5',
    iconColor: '#059669',
  },
  {
    label: 'MRR',
    value: formatPeso(analyticsData.mrr),
    trend: '+12% MoM',
    trendUp: true,
    icon: Repeat,
    iconBg: '#EDE9FE',
    iconColor: '#7C3AED',
  },
  {
    label: 'Churn Rate',
    value: `${analyticsData.churnRate}%`,
    trend: '-0.3%',
    trendUp: true,
    icon: BarChart3,
    iconBg: '#FEF3C7',
    iconColor: '#D97706',
  },
  {
    label: 'Avg LTV',
    value: formatPeso(analyticsData.avgLTV),
    trend: '+5%',
    trendUp: true,
    icon: Heart,
    iconBg: '#FCE7F3',
    iconColor: '#DB2777',
  },
];

const ltvTrendData = [
  { month: 'Oct', ltv: 12800 },
  { month: 'Nov', ltv: 13200 },
  { month: 'Dec', ltv: 13900 },
  { month: 'Jan', ltv: 14500 },
  { month: 'Feb', ltv: 14800 },
  { month: 'Mar', ltv: 15200 },
];

const retentionMetrics = [
  { label: 'Pause Rate', value: '8.3%', bar: 8.3 },
  { label: 'Avg Pause Duration', value: '1.4 weeks', bar: 14 },
  { label: 'Win-back Rate', value: '62%', bar: 62 },
];

const totalSubscribers = analyticsData.planDistribution.reduce(
  (s, p) => s + p.value,
  0
);

function getCohortColor(value: number | undefined): string {
  if (value === undefined) return 'transparent';
  if (value >= 90) return '#059669';
  if (value >= 80) return '#10B981';
  if (value >= 70) return '#34D399';
  if (value >= 60) return '#F4A261';
  if (value >= 50) return '#E76F51';
  return '#DC2626';
}

function getCohortTextColor(value: number | undefined): string {
  if (value === undefined) return 'transparent';
  if (value >= 80) return '#FFFFFF';
  if (value >= 60) return '#1A1A2E';
  return '#FFFFFF';
}

const cohortColumns = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'] as const;

// Custom label for pie chart
const renderCustomLabel = ({
  cx,
  cy,
}: {
  cx: number;
  cy: number;
}) => {
  return (
    <text
      x={cx}
      y={cy}
      textAnchor="middle"
      dominantBaseline="central"
      style={{ fontSize: 20, fontWeight: 700, fill: '#1A1A2E' }}
    >
      {totalSubscribers}
    </text>
  );
};

export default function SubscriptionsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ color: '#1A1A2E', fontFamily: "'DM Serif Display', serif" }}
        >
          Subscription Analytics
        </h1>
        <p className="mt-1 text-sm" style={{ color: '#6B7280' }}>
          Track subscriber growth, retention, and revenue metrics.
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
                {kpi.label === 'Churn Rate' ? (
                  /* Progress ring for churn */
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
                        strokeDasharray={`${analyticsData.churnRate}, 100`}
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                ) : (
                  <span
                    className="inline-flex items-center gap-1 text-xs font-medium"
                    style={{ color: '#059669' }}
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
                style={{ color: '#1A1A2E' }}
              >
                {kpi.value}
              </p>
              <p className="mt-1 text-xs" style={{ color: '#6B7280' }}>
                {kpi.label}
                {kpi.label === 'Churn Rate' && (
                  <span style={{ color: '#059669' }}> ({kpi.trend})</span>
                )}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* New vs Churned */}
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
          <h2
            className="mb-4 text-base font-semibold"
            style={{ color: '#1A1A2E' }}
          >
            New vs Churned Subscribers
          </h2>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyticsData.subscriberTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  tickLine={false}
                  axisLine={{ stroke: '#E5E7EB' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  tickLine={false}
                  axisLine={{ stroke: '#E5E7EB' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
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
            backgroundColor: '#FFFFFF',
            boxShadow: 'var(--shadow-card)',
            border: '1px solid #E5E7EB',
          }}
        >
          <h2
            className="mb-4 text-base font-semibold"
            style={{ color: '#1A1A2E' }}
          >
            Plan Distribution
          </h2>
          <div className="flex items-center gap-4">
            <div style={{ width: 200, height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analyticsData.planDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={renderCustomLabel}
                    labelLine={false}
                  >
                    {analyticsData.planDistribution.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E7EB',
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
              {analyticsData.planDistribution.map((plan) => (
                <div key={plan.name} className="flex items-center gap-3">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: plan.color }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span
                        className="text-sm font-medium"
                        style={{ color: '#1A1A2E' }}
                      >
                        {plan.name}
                      </span>
                      <span className="text-sm" style={{ color: '#6B7280' }}>
                        {plan.value}
                      </span>
                    </div>
                    <div
                      className="mt-1 h-1.5 w-full rounded-full"
                      style={{ backgroundColor: '#F3F4F6' }}
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
                  <span className="text-xs" style={{ color: '#6B7280' }}>
                    {((plan.value / totalSubscribers) * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Row 2: Retention Metrics + LTV Trend */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Retention Metrics */}
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
            Retention Metrics
          </h2>
          <div className="space-y-5">
            {retentionMetrics.map((metric) => (
              <div key={metric.label}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm" style={{ color: '#6B7280' }}>
                    {metric.label}
                  </span>
                  <span
                    className="text-lg font-bold"
                    style={{ color: '#1A1A2E' }}
                  >
                    {metric.value}
                  </span>
                </div>
                <div
                  className="h-2 w-full rounded-full"
                  style={{ backgroundColor: '#F3F4F6' }}
                >
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      backgroundColor:
                        metric.label === 'Win-back Rate'
                          ? '#059669'
                          : '#2D6A4F',
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
            backgroundColor: '#FFFFFF',
            boxShadow: 'var(--shadow-card)',
            border: '1px solid #E5E7EB',
          }}
        >
          <h2
            className="mb-4 text-base font-semibold"
            style={{ color: '#1A1A2E' }}
          >
            LTV Trend (Last 6 Months)
          </h2>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ltvTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="month"
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
                  formatter={(value) => [formatPeso(Number(value)), 'LTV']}
                />
                <Line
                  type="monotone"
                  dataKey="ltv"
                  stroke="#1B4332"
                  strokeWidth={2.5}
                  dot={{ fill: '#1B4332', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Cohort Retention Heatmap */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.3 }}
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
          Cohort Retention Heatmap
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: '#6B7280' }}
                >
                  Signup Month
                </th>
                {cohortColumns.map((col, i) => (
                  <th
                    key={col}
                    className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider"
                    style={{ color: '#6B7280' }}
                  >
                    Month {i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {analyticsData.cohortRetention.map((row) => (
                <tr
                  key={row.month}
                  style={{ borderBottom: '1px solid #F3F4F6' }}
                >
                  <td
                    className="px-4 py-3 font-medium"
                    style={{ color: '#1A1A2E' }}
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
                              backgroundColor: '#F9FAFB',
                              color: '#D1D5DB',
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
          <span className="text-xs" style={{ color: '#6B7280' }}>
            Low
          </span>
          <div className="flex gap-0.5">
            {['#DC2626', '#E76F51', '#F4A261', '#34D399', '#10B981', '#059669'].map(
              (color) => (
                <div
                  key={color}
                  className="h-3 w-6 first:rounded-l last:rounded-r"
                  style={{ backgroundColor: color }}
                />
              )
            )}
          </div>
          <span className="text-xs" style={{ color: '#6B7280' }}>
            High
          </span>
        </div>
      </motion.div>
    </div>
  );
}
