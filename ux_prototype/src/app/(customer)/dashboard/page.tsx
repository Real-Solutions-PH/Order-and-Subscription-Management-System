'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarOff,
  Pause,
  ArrowRightLeft,
  UtensilsCrossed,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  MapPin,
  CreditCard,
  Tag,
  AlertTriangle,
  TrendingUp,
  Heart,
  Wallet,
  PiggyBank,
  Mail,
  Smartphone,
  Pencil,
} from 'lucide-react';
import { meals, orders, customers, planTiers, formatPeso } from '@/lib/mock-data';
import { useToast } from '@/context/ToastContext';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';

const customer = customers[0]; // Maria Santos

// Orders for this customer
const customerOrders = orders.filter((o) => o.customerId === customer.id);

// Next delivery meals (first 5 from meals array)
const nextDeliveryMeals = meals.slice(0, 5);

export default function DashboardPage() {
  const { showToast } = useToast();
  const [skipModalOpen, setSkipModalOpen] = useState(false);
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [subscriptionModalMode, setSubscriptionModalMode] = useState<'pause' | 'change'>('pause');
  const [profileOpen, setProfileOpen] = useState(false);

  // Notification preferences state
  const [notifications, setNotifications] = useState({
    orderUpdatesEmail: true,
    orderUpdatesSms: true,
    menuDropsEmail: true,
    menuDropsSms: false,
    paymentRemindersEmail: true,
    paymentRemindersSms: true,
    promotionsEmail: false,
    promotionsSms: false,
  });

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
    showToast('Notification preference updated', 'success');
  };

  // Progress ring for days until next delivery
  const daysUntilDelivery = 6;
  const totalDays = 7;
  const progress = ((totalDays - daysUntilDelivery) / totalDays) * 100;
  const circumference = 2 * Math.PI * 36;
  const dashOffset = circumference - (progress / 100) * circumference;

  const openSubscriptionModal = (mode: 'pause' | 'change') => {
    setSubscriptionModalMode(mode);
    setSubscriptionModalOpen(true);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FEFAE0' }}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1
            className="text-3xl mb-1"
            style={{ fontFamily: "'DM Serif Display', serif", color: '#1A1A2E' }}
          >
            Welcome back, {customer.name.split(' ')[0]}!
          </h1>
          <p style={{ color: '#6B7280' }}>Here&apos;s your PrepFlow dashboard</p>
        </div>

        {/* A) Subscription Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-6 mb-6"
          style={{
            background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full inline-block"
                    style={{
                      backgroundColor: '#34D399',
                      animation: 'pulse-success 2s ease-in-out infinite',
                    }}
                  />
                  <span className="text-sm font-semibold" style={{ color: '#34D399' }}>
                    Active
                  </span>
                </div>
              </div>
              <h2
                className="text-2xl font-bold text-white mb-4"
                style={{ fontFamily: "'DM Serif Display', serif" }}
              >
                {customer.planType}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs" style={{ color: '#A7F3D0' }}>
                    Next Delivery
                  </p>
                  <p className="text-white font-semibold">April 7, 2026</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: '#A7F3D0' }}>
                    Next Billing
                  </p>
                  <p className="text-white font-semibold">
                    April 5, 2026 &mdash; {formatPeso(4500)}
                  </p>
                </div>
              </div>
            </div>
            {/* Progress Ring */}
            <div className="flex flex-col items-center">
              <svg width="88" height="88" viewBox="0 0 88 88">
                <circle
                  cx="44"
                  cy="44"
                  r="36"
                  fill="none"
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="6"
                />
                <circle
                  cx="44"
                  cy="44"
                  r="36"
                  fill="none"
                  stroke="#34D399"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  transform="rotate(-90 44 44)"
                />
                <text
                  x="44"
                  y="40"
                  textAnchor="middle"
                  fill="white"
                  fontSize="20"
                  fontWeight="bold"
                  fontFamily="'DM Sans', sans-serif"
                >
                  {daysUntilDelivery}
                </text>
                <text
                  x="44"
                  y="56"
                  textAnchor="middle"
                  fill="#A7F3D0"
                  fontSize="10"
                  fontFamily="'DM Sans', sans-serif"
                >
                  days left
                </text>
              </svg>
            </div>
          </div>
        </motion.div>

        {/* B) Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            {
              label: 'Skip Next Week',
              icon: CalendarOff,
              color: '#D97706',
              action: () => setSkipModalOpen(true),
            },
            {
              label: 'Pause Subscription',
              icon: Pause,
              color: '#E76F51',
              action: () => openSubscriptionModal('pause'),
            },
            {
              label: 'Change Plan',
              icon: ArrowRightLeft,
              color: '#2D6A4F',
              action: () => openSubscriptionModal('change'),
            },
            {
              label: 'Modify Meals',
              icon: UtensilsCrossed,
              color: '#1B4332',
              href: '/meal-plan',
            },
          ].map((item) => {
            const Icon = item.icon;
            const content = (
              <div
                className="rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-all hover:shadow-md"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                }}
                onClick={'action' in item ? item.action : undefined}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${item.color}15` }}
                >
                  <Icon size={20} color={item.color} />
                </div>
                <p
                  className="text-sm font-medium text-center"
                  style={{ color: '#1A1A2E' }}
                >
                  {item.label}
                </p>
              </div>
            );
            if ('href' in item && item.href) {
              return (
                <Link key={item.label} href={item.href}>
                  {content}
                </Link>
              );
            }
            return <div key={item.label}>{content}</div>;
          })}
        </div>

        {/* C) Meals for Next Delivery */}
        <div
          className="rounded-2xl p-6 mb-6"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ color: '#1A1A2E' }}>
              Meals for Next Delivery
            </h2>
            <Link
              href="/meal-plan"
              className="text-sm font-medium flex items-center gap-1"
              style={{ color: '#1B4332' }}
            >
              Edit Selection <ChevronRight size={16} />
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2" style={{ scrollbarWidth: 'thin' }}>
            {nextDeliveryMeals.map((meal) => (
              <div
                key={meal.id}
                className="flex-shrink-0 w-44 rounded-xl overflow-hidden"
                style={{ border: '1px solid #E5E7EB' }}
              >
                <div
                  className="h-24 bg-cover bg-center"
                  style={{ backgroundImage: `url(${meal.image})` }}
                />
                <div className="p-3">
                  <p
                    className="text-sm font-medium leading-tight mb-1"
                    style={{ color: '#1A1A2E' }}
                  >
                    {meal.name.length > 30 ? meal.name.slice(0, 30) + '...' : meal.name}
                  </p>
                  <p className="text-xs font-semibold" style={{ color: '#1B4332' }}>
                    {formatPeso(meal.price)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* D) Order History Table */}
        <div
          className="rounded-2xl p-6 mb-6"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: '#1A1A2E' }}>
            Order History
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
                  {['Date', 'Order ID', 'Items', 'Total', 'Status', 'Action'].map((h) => (
                    <th
                      key={h}
                      className="text-left py-3 px-3 font-semibold"
                      style={{ color: '#6B7280' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 6).map((order) => (
                  <tr
                    key={order.id}
                    style={{ borderBottom: '1px solid #F3F4F6' }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-3" style={{ color: '#1A1A2E' }}>
                      {new Date(order.deliveryDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td
                      className="py-3 px-3"
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        color: '#1B4332',
                        fontSize: '0.8rem',
                      }}
                    >
                      {order.id}
                    </td>
                    <td className="py-3 px-3" style={{ color: '#1A1A2E' }}>
                      {order.items.length} item{order.items.length > 1 ? 's' : ''}
                    </td>
                    <td className="py-3 px-3 font-semibold" style={{ color: '#1A1A2E' }}>
                      {formatPeso(order.total)}
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={order.status} size="sm" />
                    </td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => showToast('Items added to cart', 'success')}
                        className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-gray-100"
                        style={{ color: '#1B4332' }}
                      >
                        <RefreshCw size={14} />
                        Reorder
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* E) Spending Insights */}
        <div
          className="rounded-2xl p-6 mb-6"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: '#1A1A2E' }}>
            Spending Insights
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div
              className="rounded-xl p-4"
              style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Wallet size={18} color="#059669" />
                <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
                  This Month
                </p>
              </div>
              <p className="text-2xl font-bold" style={{ color: '#1A1A2E' }}>
                {formatPeso(4500)}
              </p>
            </div>
            <div
              className="rounded-xl p-4"
              style={{ backgroundColor: '#FFF7ED', border: '1px solid #FED7AA' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <PiggyBank size={18} color="#D97706" />
                <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
                  Savings vs A la Carte
                </p>
              </div>
              <p className="text-2xl font-bold" style={{ color: '#059669' }}>
                {formatPeso(680)}
              </p>
            </div>
            <div
              className="rounded-xl p-4"
              style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Heart size={18} color="#E76F51" />
                <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
                  Favorite Meal
                </p>
              </div>
              <p className="text-lg font-bold" style={{ color: '#1A1A2E' }}>
                Garlic Butter Chicken
              </p>
            </div>
          </div>
        </div>

        {/* F) Profile Section (Collapsible) */}
        <div
          className="rounded-2xl mb-6 overflow-hidden"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
          >
            <h2 className="text-lg font-semibold" style={{ color: '#1A1A2E' }}>
              Profile & Preferences
            </h2>
            <motion.div animate={{ rotate: profileOpen ? 180 : 0 }}>
              <ChevronDown size={20} color="#6B7280" />
            </motion.div>
          </button>
          <AnimatePresence>
            {profileOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-6 space-y-5" style={{ borderTop: '1px solid #E5E7EB' }}>
                  <div className="pt-5">
                    {/* Delivery Address */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3">
                        <MapPin size={18} color="#6B7280" className="mt-0.5" />
                        <div>
                          <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
                            Delivery Address
                          </p>
                          <p className="font-medium" style={{ color: '#1A1A2E' }}>
                            {customer.address}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => showToast('Address editor coming soon', 'info')}
                        className="text-sm font-medium flex items-center gap-1"
                        style={{ color: '#1B4332' }}
                      >
                        <Pencil size={14} /> Edit
                      </button>
                    </div>

                    {/* Payment Method */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3">
                        <CreditCard size={18} color="#6B7280" className="mt-0.5" />
                        <div>
                          <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
                            Payment Method
                          </p>
                          <p className="font-medium" style={{ color: '#1A1A2E' }}>
                            GCash ending in ****4567
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => showToast('Payment editor coming soon', 'info')}
                        className="text-sm font-medium flex items-center gap-1"
                        style={{ color: '#1B4332' }}
                      >
                        <Pencil size={14} /> Edit
                      </button>
                    </div>

                    {/* Dietary Preferences */}
                    <div className="flex items-start gap-3 mb-4">
                      <Tag size={18} color="#6B7280" className="mt-0.5" />
                      <div>
                        <p className="text-sm font-medium mb-2" style={{ color: '#6B7280' }}>
                          Dietary Preferences
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {customer.dietaryPreferences.map((pref) => (
                            <span
                              key={pref}
                              className="px-3 py-1 rounded-full text-sm font-medium"
                              style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}
                            >
                              {pref}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Allergens */}
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={18} color="#D97706" className="mt-0.5" />
                      <div>
                        <p className="text-sm font-medium mb-2" style={{ color: '#6B7280' }}>
                          Allergens
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {['Shellfish'].map((allergen) => (
                            <span
                              key={allergen}
                              className="px-3 py-1 rounded-full text-sm font-medium"
                              style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
                            >
                              {allergen}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* G) Notification Preferences */}
        <div
          className="rounded-2xl p-6 mb-6"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: '#1A1A2E' }}>
            Notification Preferences
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
                  <th className="text-left py-3 px-3 font-semibold" style={{ color: '#6B7280' }}>
                    Notification
                  </th>
                  <th className="text-center py-3 px-3 font-semibold" style={{ color: '#6B7280' }}>
                    <div className="flex items-center justify-center gap-1">
                      <Mail size={14} /> Email
                    </div>
                  </th>
                  <th className="text-center py-3 px-3 font-semibold" style={{ color: '#6B7280' }}>
                    <div className="flex items-center justify-center gap-1">
                      <Smartphone size={14} /> SMS
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Order Updates', emailKey: 'orderUpdatesEmail' as const, smsKey: 'orderUpdatesSms' as const },
                  { label: 'Menu Drops', emailKey: 'menuDropsEmail' as const, smsKey: 'menuDropsSms' as const },
                  { label: 'Payment Reminders', emailKey: 'paymentRemindersEmail' as const, smsKey: 'paymentRemindersSms' as const },
                  { label: 'Promotions', emailKey: 'promotionsEmail' as const, smsKey: 'promotionsSms' as const },
                ].map((row) => (
                  <tr key={row.label} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td className="py-3 px-3 font-medium" style={{ color: '#1A1A2E' }}>
                      {row.label}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <ToggleSwitch
                        checked={notifications[row.emailKey]}
                        onChange={() => toggleNotification(row.emailKey)}
                      />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <ToggleSwitch
                        checked={notifications[row.smsKey]}
                        onChange={() => toggleNotification(row.smsKey)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Skip Next Week Modal */}
        <Modal
          isOpen={skipModalOpen}
          onClose={() => setSkipModalOpen(false)}
          title="Skip Next Week"
        >
          <div className="space-y-4">
            <p style={{ color: '#6B7280' }}>
              Are you sure you want to skip the delivery for the week of April 7 - April 13, 2026?
            </p>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              You&apos;ll receive a credit of {formatPeso(4500)} that will be applied to your next active week.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setSkipModalOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors hover:bg-gray-100"
                style={{ border: '1px solid #E5E7EB', color: '#1A1A2E' }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setSkipModalOpen(false);
                  showToast('Week of April 7 skipped successfully', 'success');
                }}
                className="flex-1 px-4 py-2.5 rounded-xl font-medium text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: '#D97706' }}
              >
                Skip Week
              </button>
            </div>
          </div>
        </Modal>

        {/* Subscription Modal (Pause / Change Plan) */}
        <Modal
          isOpen={subscriptionModalOpen}
          onClose={() => setSubscriptionModalOpen(false)}
          title={subscriptionModalMode === 'pause' ? 'Pause Subscription' : 'Change Plan'}
          size="lg"
        >
          {subscriptionModalMode === 'pause' ? (
            <PauseSubscriptionContent
              onClose={() => setSubscriptionModalOpen(false)}
              showToast={showToast}
            />
          ) : (
            <ChangePlanContent
              onClose={() => setSubscriptionModalOpen(false)}
              showToast={showToast}
            />
          )}
        </Modal>
      </div>
    </div>
  );
}

/* Toggle Switch Component */
function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
      style={{ backgroundColor: checked ? '#059669' : '#D1D5DB' }}
    >
      <span
        className="inline-block h-4 w-4 rounded-full bg-white transition-transform"
        style={{ transform: checked ? 'translateX(24px)' : 'translateX(4px)' }}
      />
    </button>
  );
}

/* Pause Subscription Content */
function PauseSubscriptionContent({
  onClose,
  showToast,
}: {
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}) {
  const [duration, setDuration] = useState<'1week' | '2weeks' | '1month'>('1week');
  const resumeMap = {
    '1week': 'April 14, 2026',
    '2weeks': 'April 21, 2026',
    '1month': 'May 7, 2026',
  };

  return (
    <div className="space-y-4">
      <p style={{ color: '#6B7280' }}>Choose how long to pause your subscription:</p>
      <div className="space-y-2">
        {[
          { key: '1week' as const, label: '1 Week' },
          { key: '2weeks' as const, label: '2 Weeks' },
          { key: '1month' as const, label: '1 Month' },
        ].map((opt) => (
          <label
            key={opt.key}
            className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors"
            style={{
              border: `2px solid ${duration === opt.key ? '#1B4332' : '#E5E7EB'}`,
              backgroundColor: duration === opt.key ? '#F0FDF4' : '#FFFFFF',
            }}
          >
            <input
              type="radio"
              name="pause-duration"
              checked={duration === opt.key}
              onChange={() => setDuration(opt.key)}
              className="sr-only"
            />
            <div
              className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
              style={{ borderColor: duration === opt.key ? '#1B4332' : '#D1D5DB' }}
            >
              {duration === opt.key && (
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#1B4332' }} />
              )}
            </div>
            <span className="font-medium" style={{ color: '#1A1A2E' }}>
              {opt.label}
            </span>
          </label>
        ))}
      </div>
      <div
        className="rounded-xl p-3"
        style={{ backgroundColor: '#FFF7ED', border: '1px solid #FED7AA' }}
      >
        <p className="text-sm" style={{ color: '#92400E' }}>
          Your subscription will resume on <strong>{resumeMap[duration]}</strong>. You won&apos;t be charged during the pause.
        </p>
      </div>
      <div className="flex gap-3 pt-2">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors hover:bg-gray-100"
          style={{ border: '1px solid #E5E7EB', color: '#1A1A2E' }}
        >
          Cancel
        </button>
        <button
          onClick={() => {
            onClose();
            showToast(`Subscription paused until ${resumeMap[duration]}`, 'success');
          }}
          className="flex-1 px-4 py-2.5 rounded-xl font-medium text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: '#D97706' }}
        >
          Pause Subscription
        </button>
      </div>
    </div>
  );
}

/* Change Plan Content */
function ChangePlanContent({
  onClose,
  showToast,
}: {
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}) {
  const [selectedPlan, setSelectedPlan] = useState(10);

  return (
    <div className="space-y-4">
      <p style={{ color: '#6B7280' }}>Select your new plan:</p>
      <div className="grid grid-cols-2 gap-3">
        {planTiers.map((tier: { id: number; meals: number; price: number; perMeal: number; savings: number; label: string }) => {
          const isSelected = selectedPlan === tier.id;
          const isCurrent = tier.id === 10;
          const diff = tier.price - 4500;
          return (
            <button
              key={tier.id}
              onClick={() => setSelectedPlan(tier.id)}
              className="relative rounded-xl p-4 text-left transition-all"
              style={{
                border: `2px solid ${isSelected ? '#1B4332' : '#E5E7EB'}`,
                backgroundColor: isSelected ? '#F0FDF4' : '#FFFFFF',
              }}
            >
              {isCurrent && (
                <span
                  className="absolute -top-2.5 left-3 px-2 py-0.5 text-xs font-semibold rounded-full"
                  style={{ backgroundColor: '#1B4332', color: '#FFFFFF' }}
                >
                  Current
                </span>
              )}
              <p className="font-bold text-lg" style={{ color: '#1A1A2E' }}>
                {tier.meals} meals
              </p>
              <p className="text-sm" style={{ color: '#6B7280' }}>
                {tier.label}
              </p>
              <p className="font-semibold mt-1" style={{ color: '#1B4332' }}>
                {formatPeso(tier.price)}/mo
              </p>
              {!isCurrent && (
                <p
                  className="text-xs mt-1 font-medium"
                  style={{ color: diff > 0 ? '#D97706' : '#059669' }}
                >
                  {diff > 0 ? '+' : ''}{formatPeso(Math.abs(diff))}/mo
                </p>
              )}
            </button>
          );
        })}
      </div>
      {selectedPlan !== 10 && (
        <div
          className="rounded-xl p-3"
          style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}
        >
          <p className="text-sm" style={{ color: '#1E40AF' }}>
            Your billing will be pro-rated for the remainder of the current cycle.
          </p>
        </div>
      )}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors hover:bg-gray-100"
          style={{ border: '1px solid #E5E7EB', color: '#1A1A2E' }}
        >
          Cancel
        </button>
        <button
          onClick={() => {
            onClose();
            if (selectedPlan !== 10) {
              showToast(`Plan changed to ${selectedPlan} meals/week`, 'success');
            }
          }}
          className="flex-1 px-4 py-2.5 rounded-xl font-medium text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: '#1B4332' }}
        >
          Confirm Change
        </button>
      </div>
    </div>
  );
}
