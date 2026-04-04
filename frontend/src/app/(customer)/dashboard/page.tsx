"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CalendarOff,
  Pause,
  ArrowRightLeft,
  UtensilsCrossed,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  MapPin,
  CreditCard,
  Tag,
  AlertTriangle,
  Heart,
  Wallet,
  PiggyBank,
  Mail,
  Smartphone,
  Pencil,
  Minus,
  Plus,
  Truck,
  CalendarDays,
  User,
  Phone,
  Lock,
} from "lucide-react";
import {
  meals,
  orders,
  customers,
  planTiers,
  formatPeso,
  dietaryFilters,
  Meal,
} from "@/lib/mock-data";
import { useToast } from "@/context/ToastContext";
import { useAuth, useOrders } from "@/hooks";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import StatusBadge from "@/components/StatusBadge";
import Modal from "@/components/Modal";

// Next delivery meals (first 5 from meals array)
const nextDeliveryMeals = meals.slice(0, 5);

export default function DashboardPage() {
  const { showToast } = useToast();

  // --- API hooks with mock-data fallback ---
  const { user, isLoading: isLoadingUser } = useAuth();
  const ordersQuery = useOrders();

  const customer = customers[0]; // fallback source

  // Map API user to display format, fall back to customers[0]
  const displayUser = user
    ? {
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        phone: user.phone ?? "",
      }
    : { name: customer.name, email: customer.email, phone: customer.phone };

  // Map API orders to display format, fall back to mock orders
  const displayOrders =
    ordersQuery.data?.items?.map((o) => ({
      id: o.id,
      orderId: o.order_number,
      status: o.status,
      items: o.items,
      total: o.total,
      deliveryDate: o.delivered_at ?? o.placed_at ?? o.created_at,
    })) ?? orders;
  const isLoadingOrders = ordersQuery.isLoading;

  const [skipModalOpen, setSkipModalOpen] = useState(false);
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [subscriptionModalMode, setSubscriptionModalMode] = useState<
    "pause" | "change"
  >("pause");
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [editMealsModalOpen, setEditMealsModalOpen] = useState(false);
  const [userName, setUserName] = useState(displayUser.name);
  const [userEmail, setUserEmail] = useState(displayUser.email);
  const [userPhone, setUserPhone] = useState(displayUser.phone);
  const [userDietary, setUserDietary] = useState<string[]>(
    customer.dietaryPreferences,
  );
  const [userAllergens, setUserAllergens] = useState<string[]>(["Shellfish"]);
  const [favoriteMeal, setFavoriteMeal] = useState("Garlic Butter Chicken");
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
    showToast("Notification preference updated", "success");
  };

  // Progress ring for days until next delivery
  const daysUntilDelivery = 6;
  const totalDays = 7;
  const progress = ((totalDays - daysUntilDelivery) / totalDays) * 100;
  const circumference = 2 * Math.PI * 36;
  const dashOffset = circumference - (progress / 100) * circumference;

  const openSubscriptionModal = (mode: "pause" | "change") => {
    setSubscriptionModalMode(mode);
    setSubscriptionModalOpen(true);
  };

  return (
    <div
      className="h-screen overflow-hidden"
      style={{ backgroundColor: "#FEFAE0" }}
    >
      <div className="h-full max-w-[1400px] mx-auto px-4 py-4 flex flex-col">
        {/* Two-column layout: Profile (left, narrower) | Main content (right, wider) */}
        <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-4 min-h-0 overflow-y-auto lg:overflow-hidden">
          {/* LEFT COLUMN - Profile & Preferences (4/12 on desktop) */}
          <div className="lg:col-span-4 flex flex-col gap-4 min-h-0 order-2 lg:order-1">
            {isLoadingUser ? (
              <SkeletonCard className="lg:flex-1" />
            ) : (
            <div
              className="rounded-2xl p-5 lg:flex-1 lg:min-h-0 lg:overflow-y-auto"
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #E5E7EB",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="text-base font-semibold"
                  style={{ color: "#1A1A2E" }}
                >
                  Profile & Preferences
                </h2>
                <button
                  onClick={() => setProfileModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:shadow-md"
                  style={{ backgroundColor: "#1B4332", color: "#FFFFFF" }}
                >
                  <Pencil size={12} /> Edit Profile
                </button>
              </div>

              {/* User Info Summary */}
              <div
                className="flex items-center gap-3 mb-4 rounded-xl p-3"
                style={{
                  backgroundColor: "#F9FAFB",
                  border: "1px solid #E5E7EB",
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "linear-gradient(135deg, #1B4332, #2D6A4F)",
                  }}
                >
                  <User size={18} color="#FFFFFF" />
                </div>
                <div className="min-w-0">
                  <p
                    className="text-sm font-semibold truncate"
                    style={{ color: "#1A1A2E" }}
                  >
                    {userName}
                  </p>
                  <p className="text-xs truncate" style={{ color: "#6B7280" }}>
                    {userEmail}
                  </p>
                  <p className="text-xs" style={{ color: "#6B7280" }}>
                    {userPhone}
                  </p>
                </div>
              </div>

              {/* Spending Insights */}
              <div className="space-y-2 mb-4">
                <div
                  className="rounded-lg p-3"
                  style={{
                    backgroundColor: "#F0FDF4",
                    border: "1px solid #BBF7D0",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Wallet size={14} color="#059669" />
                      <p
                        className="text-xs font-medium"
                        style={{ color: "#6B7280" }}
                      >
                        This Month
                      </p>
                    </div>
                    <p
                      className="text-lg font-bold"
                      style={{ color: "#1A1A2E" }}
                    >
                      {formatPeso(4500)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div
                    className="rounded-lg p-3"
                    style={{
                      backgroundColor: "#FFF7ED",
                      border: "1px solid #FED7AA",
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <PiggyBank size={14} color="#D97706" />
                      <p
                        className="text-xs font-medium"
                        style={{ color: "#6B7280" }}
                      >
                        Savings
                      </p>
                    </div>
                    <p
                      className="text-lg font-bold"
                      style={{ color: "#059669" }}
                    >
                      {formatPeso(680)}
                    </p>
                  </div>
                  <div
                    className="rounded-lg p-3"
                    style={{
                      backgroundColor: "#FEF2F2",
                      border: "1px solid #FECACA",
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Heart size={14} color="#E76F51" />
                      <p
                        className="text-xs font-medium"
                        style={{ color: "#6B7280" }}
                      >
                        Favorite
                      </p>
                    </div>
                    <p
                      className="text-sm font-bold leading-tight"
                      style={{ color: "#1A1A2E" }}
                    >
                      {favoriteMeal}
                    </p>
                  </div>
                </div>
              </div>

              <div
                style={{ borderTop: "1px solid #E5E7EB" }}
                className="pt-4 space-y-3"
              >
                {/* Delivery Address */}
                <div className="flex items-start gap-2">
                  <MapPin
                    size={16}
                    color="#6B7280"
                    className="mt-0.5 flex-shrink-0"
                  />
                  <div>
                    <p
                      className="text-xs font-medium"
                      style={{ color: "#6B7280" }}
                    >
                      Delivery Address
                    </p>
                    <p
                      className="text-sm font-medium"
                      style={{ color: "#1A1A2E" }}
                    >
                      {customer.address}
                    </p>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="flex items-start gap-2">
                  <CreditCard
                    size={16}
                    color="#6B7280"
                    className="mt-0.5 flex-shrink-0"
                  />
                  <div>
                    <p
                      className="text-xs font-medium"
                      style={{ color: "#6B7280" }}
                    >
                      Payment Method
                    </p>
                    <p
                      className="text-sm font-medium"
                      style={{ color: "#1A1A2E" }}
                    >
                      GCash ending in ****4567
                    </p>
                  </div>
                </div>

                <div className="pt-1">
                  <p
                    className="text-sm font-semibold mb-2"
                    style={{ color: "#1A1A2E" }}
                  >
                    Dietary & Allergens
                  </p>
                </div>

                {/* Dietary Preferences */}
                <div className="flex items-start gap-2">
                  <Tag
                    size={16}
                    color="#6B7280"
                    className="mt-0.5 flex-shrink-0"
                  />
                  <div>
                    {userDietary.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {userDietary.map((pref) => (
                          <span
                            key={pref}
                            className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: "#D1FAE5",
                              color: "#065F46",
                            }}
                          >
                            {pref}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p
                        className="text-xs italic"
                        style={{ color: "#9CA3AF" }}
                      >
                        No dietary preferences
                      </p>
                    )}
                  </div>
                </div>

                {/* Allergens */}
                <div className="flex items-start gap-2">
                  <AlertTriangle
                    size={16}
                    color="#D97706"
                    className="mt-0.5 flex-shrink-0"
                  />
                  <div>
                    {userAllergens.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {userAllergens.map((allergen) => (
                          <span
                            key={allergen}
                            className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: "#FEF3C7",
                              color: "#92400E",
                            }}
                          >
                            {allergen}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p
                        className="text-xs italic"
                        style={{ color: "#9CA3AF" }}
                      >
                        No allergens
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Notification Preferences */}
              <div
                style={{ borderTop: "1px solid #E5E7EB" }}
                className="mt-4 pt-4"
              >
                <h3
                  className="text-sm font-semibold mb-3"
                  style={{ color: "#1A1A2E" }}
                >
                  Notifications
                </h3>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: "1px solid #E5E7EB" }}>
                      <th
                        className="text-left py-1.5 font-semibold"
                        style={{ color: "#6B7280" }}
                      ></th>
                      <th
                        className="text-center py-1.5 font-semibold"
                        style={{ color: "#6B7280" }}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <Mail size={12} /> Email
                        </div>
                      </th>
                      <th
                        className="text-center py-1.5 font-semibold"
                        style={{ color: "#6B7280" }}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <Smartphone size={12} /> SMS
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        label: "Order Updates",
                        emailKey: "orderUpdatesEmail" as const,
                        smsKey: "orderUpdatesSms" as const,
                      },
                      {
                        label: "Menu Drops",
                        emailKey: "menuDropsEmail" as const,
                        smsKey: "menuDropsSms" as const,
                      },
                      {
                        label: "Payment Reminders",
                        emailKey: "paymentRemindersEmail" as const,
                        smsKey: "paymentRemindersSms" as const,
                      },
                      {
                        label: "Promotions",
                        emailKey: "promotionsEmail" as const,
                        smsKey: "promotionsSms" as const,
                      },
                    ].map((row) => (
                      <tr
                        key={row.label}
                        style={{ borderBottom: "1px solid #F3F4F6" }}
                      >
                        <td
                          className="py-2 font-medium"
                          style={{ color: "#1A1A2E" }}
                        >
                          {row.label}
                        </td>
                        <td className="py-2 text-center">
                          <ToggleSwitch
                            checked={notifications[row.emailKey]}
                            onChange={() => toggleNotification(row.emailKey)}
                          />
                        </td>
                        <td className="py-2 text-center">
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
            )}
          </div>

          {/* RIGHT COLUMN - Subscription, Actions, Meals, Orders (8/12 on desktop) */}
          <div className="lg:col-span-8 flex flex-col gap-4 min-h-0 order-1 lg:order-2">
            {/* A) Subscription Status Card */}
            {isLoadingUser ? (
              <SkeletonCard className="min-h-[140px]" />
            ) : (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-5"
              style={{
                background: "linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{
                        backgroundColor: "#34D399",
                        animation: "pulse-success 2s ease-in-out infinite",
                      }}
                    />
                    <span
                      className="text-xs font-semibold"
                      style={{ color: "#34D399" }}
                    >
                      Active
                    </span>
                  </div>
                  <h2
                    className="text-xl font-bold text-white mb-4"
                    style={{ fontFamily: "'DM Serif Display', serif" }}
                  >
                    {customer.planType}
                  </h2>
                  <div className="flex flex-wrap gap-3 sm:gap-4 lg:gap-5">
                    <div
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2"
                      style={{ backgroundColor: "rgba(255, 255, 255, 0.08)" }}
                    >
                      <div
                        className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center p-1.5"
                        style={{ backgroundColor: "rgba(167, 243, 208, 0.15)" }}
                      >
                        <Truck size={16} color="#A7F3D0" />
                      </div>
                      <div>
                        <p
                          className="text-[10px] uppercase font-semibold tracking-wider mb-0.5"
                          style={{ color: "rgba(167, 243, 208, 0.8)" }}
                        >
                          Next Delivery
                        </p>
                        <p className="text-white font-medium text-[13px] leading-none">
                          April 7, 2026
                        </p>
                      </div>
                    </div>

                    <div
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2"
                      style={{ backgroundColor: "rgba(255, 255, 255, 0.08)" }}
                    >
                      <div
                        className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center p-1.5"
                        style={{ backgroundColor: "rgba(167, 243, 208, 0.15)" }}
                      >
                        <CalendarDays size={16} color="#A7F3D0" />
                      </div>
                      <div>
                        <p
                          className="text-[10px] uppercase font-semibold tracking-wider mb-0.5"
                          style={{ color: "rgba(167, 243, 208, 0.8)" }}
                        >
                          Next Billing
                        </p>
                        <p className="text-white font-medium text-[13px] leading-none">
                          April 5, 2026
                        </p>
                      </div>
                    </div>

                    <div
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2"
                      style={{
                        backgroundColor: "rgba(251, 191, 36, 0.15)",
                        border: "1px solid rgba(251, 191, 36, 0.3)",
                      }}
                    >
                      <div
                        className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center p-1.5"
                        style={{ backgroundColor: "rgba(251, 191, 36, 0.2)" }}
                      >
                        <Wallet size={16} color="#FCD34D" />
                      </div>
                      <div>
                        <p
                          className="text-[10px] uppercase font-semibold tracking-wider mb-0.5"
                          style={{ color: "rgba(253, 230, 138, 0.9)" }}
                        >
                          Cost
                        </p>
                        <p
                          className="font-bold text-[14px] leading-none tracking-wide"
                          style={{ color: "#FCD34D" }}
                        >
                          {formatPeso(4500)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Progress Ring */}
                <svg
                  width="72"
                  height="72"
                  viewBox="0 0 88 88"
                  className="hidden sm:block"
                >
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
            </motion.div>
            )}

            {/* B) Quick Actions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                {
                  label: "Skip Next Week",
                  icon: CalendarOff,
                  color: "#D97706",
                  action: () => setSkipModalOpen(true),
                },
                {
                  label: "Pause Subscription",
                  icon: Pause,
                  color: "#E76F51",
                  action: () => openSubscriptionModal("pause"),
                },
                {
                  label: "Change Plan",
                  icon: ArrowRightLeft,
                  color: "#2D6A4F",
                  action: () => openSubscriptionModal("change"),
                },
                {
                  label: "Modify Meals",
                  icon: UtensilsCrossed,
                  color: "#1B4332",
                  action: () => setEditMealsModalOpen(true),
                },
              ].map((item) => {
                const Icon = item.icon;
                const content = (
                  <div
                    className="rounded-xl p-3 flex flex-col items-center gap-1.5 cursor-pointer transition-all hover:shadow-md"
                    style={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E5E7EB",
                    }}
                    onClick={"action" in item ? item.action : undefined}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${item.color}15` }}
                    >
                      <Icon size={16} color={item.color} />
                    </div>
                    <p
                      className="text-xs font-medium text-center"
                      style={{ color: "#1A1A2E" }}
                    >
                      {item.label}
                    </p>
                  </div>
                );
                if ("href" in item && item.href) {
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
              className="rounded-2xl p-4"
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #E5E7EB",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <h2
                  className="text-base font-semibold"
                  style={{ color: "#1A1A2E" }}
                >
                  Meals for Next Delivery
                </h2>
                <button
                  onClick={() => setEditMealsModalOpen(true)}
                  className="text-sm font-medium flex items-center gap-1"
                  style={{ color: "#1B4332" }}
                >
                  Edit Selection <ChevronRight size={16} />
                </button>
              </div>
              <div
                className="flex gap-3 overflow-x-auto pb-1"
                style={{ scrollbarWidth: "thin" }}
              >
                {nextDeliveryMeals.map((meal) => (
                  <div
                    key={meal.id}
                    className="flex-shrink-0 w-32 sm:w-36 rounded-xl overflow-hidden"
                    style={{ border: "1px solid #E5E7EB" }}
                  >
                    <div
                      className="h-20 bg-cover bg-center"
                      style={{ backgroundImage: `url(${meal.image})` }}
                    />
                    <div className="p-2">
                      <p
                        className="text-xs font-medium leading-tight mb-0.5"
                        style={{ color: "#1A1A2E" }}
                      >
                        {meal.name.length > 25
                          ? meal.name.slice(0, 25) + "..."
                          : meal.name}
                      </p>
                      <p
                        className="text-xs font-semibold"
                        style={{ color: "#1B4332" }}
                      >
                        {formatPeso(meal.price)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* D) Order History Table */}
            {isLoadingOrders ? (
              <SkeletonCard className="flex-1 min-h-[200px]" />
            ) : (
            <div
              className="rounded-2xl p-4 flex-1 min-h-0 flex flex-col"
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #E5E7EB",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              <h2
                className="text-base font-semibold mb-2"
                style={{ color: "#1A1A2E" }}
              >
                Order History
              </h2>
              <div className="overflow-y-auto flex-1 min-h-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "2px solid #E5E7EB" }}>
                      {[
                        "Date",
                        "Order ID",
                        "Items",
                        "Total",
                        "Status",
                        "Action",
                      ].map((h) => (
                        <th
                          key={h}
                          className="text-left py-2 px-2 font-semibold text-xs"
                          style={{ color: "#6B7280" }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayOrders.slice(0, 6).map((order: { id: string; deliveryDate: string; items: unknown[]; total: number; status: string }) => (
                      <tr
                        key={order.id}
                        style={{ borderBottom: "1px solid #F3F4F6" }}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td
                          className="py-2 px-2 text-xs"
                          style={{ color: "#1A1A2E" }}
                        >
                          {new Date(order.deliveryDate).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric", year: "numeric" },
                          )}
                        </td>
                        <td
                          className="py-2 px-2"
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            color: "#1B4332",
                            fontSize: "0.7rem",
                          }}
                        >
                          {order.id}
                        </td>
                        <td
                          className="py-2 px-2 text-xs"
                          style={{ color: "#1A1A2E" }}
                        >
                          {order.items.length} item
                          {order.items.length > 1 ? "s" : ""}
                        </td>
                        <td
                          className="py-2 px-2 font-semibold text-xs"
                          style={{ color: "#1A1A2E" }}
                        >
                          {formatPeso(order.total)}
                        </td>
                        <td className="py-2 px-2">
                          <StatusBadge status={order.status} size="sm" />
                        </td>
                        <td className="py-2 px-2">
                          <button
                            onClick={() =>
                              showToast("Items added to cart", "success")
                            }
                            className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition-colors hover:bg-gray-100"
                            style={{ color: "#1B4332" }}
                          >
                            <RefreshCw size={12} /> Reorder
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            )}
          </div>
        </div>

        {/* Skip Next Week Modal */}
        <Modal
          isOpen={skipModalOpen}
          onClose={() => setSkipModalOpen(false)}
          title="Skip Next Week"
        >
          <div className="space-y-4">
            <p style={{ color: "#6B7280" }}>
              Are you sure you want to skip the delivery for the week of April 7
              - April 13, 2026?
            </p>
            <p className="text-sm" style={{ color: "#6B7280" }}>
              You&apos;ll receive a credit of {formatPeso(4500)} that will be
              applied to your next active week.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setSkipModalOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors hover:bg-gray-100"
                style={{ border: "1px solid #E5E7EB", color: "#1A1A2E" }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setSkipModalOpen(false);
                  showToast("Week of April 7 skipped successfully", "success");
                }}
                className="flex-1 px-4 py-2.5 rounded-xl font-medium text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: "#D97706" }}
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
          title={
            subscriptionModalMode === "pause"
              ? "Pause Subscription"
              : "Change Plan"
          }
          size="lg"
        >
          {subscriptionModalMode === "pause" ? (
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

        {/* Edit Profile Modal */}
        <Modal
          isOpen={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
          title="Edit Profile"
          size="lg"
        >
          <EditProfileModalContent
            initialName={userName}
            initialEmail={userEmail}
            initialPhone={userPhone}
            initialDietary={userDietary}
            initialAllergens={userAllergens}
            initialFavoriteMeal={favoriteMeal}
            onSave={(data) => {
              setUserName(data.name);
              setUserEmail(data.email);
              setUserPhone(data.phone);
              setUserDietary(data.dietary);
              setUserAllergens(data.allergens);
              setFavoriteMeal(data.favoriteMeal);
              setProfileModalOpen(false);
              showToast("Profile updated successfully", "success");
            }}
            onClose={() => setProfileModalOpen(false)}
          />
        </Modal>

        {/* Edit Meals Modal */}
        <Modal
          isOpen={editMealsModalOpen}
          onClose={() => setEditMealsModalOpen(false)}
          title="Edit Next Delivery"
          size="lg"
        >
          <EditMealsModalContent
            onClose={() => setEditMealsModalOpen(false)}
            showToast={showToast}
            customer={customer}
          />
        </Modal>
      </div>
    </div>
  );
}

/* Toggle Switch Component */
function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
      style={{ backgroundColor: checked ? "#059669" : "#D1D5DB" }}
    >
      <span
        className="inline-block h-4 w-4 rounded-full bg-white transition-transform"
        style={{ transform: checked ? "translateX(24px)" : "translateX(4px)" }}
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
  showToast: (
    msg: string,
    type?: "success" | "error" | "info" | "warning",
  ) => void;
}) {
  const [pauseDays, setPauseDays] = useState(7);

  const presets = [
    { days: 7, label: "1 Week" },
    { days: 14, label: "2 Weeks" },
    { days: 30, label: "1 Month" },
  ];

  const resumeDate = new Date();
  resumeDate.setDate(resumeDate.getDate() + pauseDays);
  const resumeLabel = resumeDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const handleDaysChange = (value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      setPauseDays(Math.max(1, Math.min(90, num)));
    } else if (value === "") {
      setPauseDays(1);
    }
  };

  return (
    <div className="space-y-4">
      <p style={{ color: "#6B7280" }}>
        Choose how long to pause your subscription:
      </p>

      {/* Preset buttons */}
      <div className="flex gap-2">
        {presets.map((preset) => (
          <button
            key={preset.days}
            onClick={() => setPauseDays(preset.days)}
            className="flex-1 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{
              border: `2px solid ${pauseDays === preset.days ? "#1B4332" : "#E5E7EB"}`,
              backgroundColor:
                pauseDays === preset.days ? "#F0FDF4" : "#FFFFFF",
              color: pauseDays === preset.days ? "#1B4332" : "#6B7280",
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Custom days input */}
      <div
        className="rounded-xl p-4"
        style={{ backgroundColor: "#F9FAFB", border: "1px solid #E5E7EB" }}
      >
        <label
          className="block text-sm font-medium mb-2"
          style={{ color: "#1A1A2E" }}
        >
          Or enter a custom number of days
        </label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPauseDays(Math.max(1, pauseDays - 1))}
            className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-lg transition-all hover:opacity-80"
            style={{ backgroundColor: "#E5E7EB", color: "#374151" }}
          >
            −
          </button>
          <input
            type="number"
            min={1}
            max={90}
            value={pauseDays}
            onChange={(e) => handleDaysChange(e.target.value)}
            className="w-20 text-center text-lg font-semibold rounded-lg py-1.5 outline-none transition-colors"
            style={{
              border: "2px solid #1B4332",
              color: "#1B4332",
              backgroundColor: "#FFFFFF",
            }}
          />
          <button
            onClick={() => setPauseDays(Math.min(90, pauseDays + 1))}
            className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-lg transition-all hover:opacity-80"
            style={{ backgroundColor: "#1B4332", color: "#FFFFFF" }}
          >
            +
          </button>
          <span className="text-sm font-medium" style={{ color: "#6B7280" }}>
            day{pauseDays !== 1 ? "s" : ""}
          </span>
        </div>
        <p className="text-xs mt-2" style={{ color: "#9CA3AF" }}>
          Min 1 day · Max 90 days
        </p>
      </div>

      <div
        className="rounded-xl p-3"
        style={{ backgroundColor: "#FFF7ED", border: "1px solid #FED7AA" }}
      >
        <p className="text-sm" style={{ color: "#92400E" }}>
          Your subscription will resume on <strong>{resumeLabel}</strong>. You
          won&apos;t be charged during the pause.
        </p>
      </div>
      <div className="flex gap-3 pt-2">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors hover:bg-gray-100"
          style={{ border: "1px solid #E5E7EB", color: "#1A1A2E" }}
        >
          Cancel
        </button>
        <button
          onClick={() => {
            onClose();
            showToast(
              `Subscription paused for ${pauseDays} day${pauseDays !== 1 ? "s" : ""} — resumes ${resumeLabel}`,
              "success",
            );
          }}
          className="flex-1 px-4 py-2.5 rounded-xl font-medium text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: "#D97706" }}
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
  showToast: (
    msg: string,
    type?: "success" | "error" | "info" | "warning",
  ) => void;
}) {
  const [selectedPlan, setSelectedPlan] = useState(10);

  return (
    <div className="space-y-4">
      <p style={{ color: "#6B7280" }}>Select your new plan:</p>
      <div className="grid grid-cols-2 gap-3">
        {planTiers.map(
          (tier: {
            id: number;
            meals: number;
            price: number;
            perMeal: number;
            savings: number;
            label: string;
          }) => {
            const isSelected = selectedPlan === tier.id;
            const isCurrent = tier.id === 10;
            const diff = tier.price - 4500;
            return (
              <button
                key={tier.id}
                onClick={() => setSelectedPlan(tier.id)}
                className="relative rounded-xl p-4 text-left transition-all"
                style={{
                  border: `2px solid ${isSelected ? "#1B4332" : "#E5E7EB"}`,
                  backgroundColor: isSelected ? "#F0FDF4" : "#FFFFFF",
                }}
              >
                {isCurrent && (
                  <span
                    className="absolute -top-2.5 left-3 px-2 py-0.5 text-xs font-semibold rounded-full"
                    style={{ backgroundColor: "#1B4332", color: "#FFFFFF" }}
                  >
                    Current
                  </span>
                )}
                <p className="font-bold text-lg" style={{ color: "#1A1A2E" }}>
                  {tier.meals} meals
                </p>
                <p className="text-sm" style={{ color: "#6B7280" }}>
                  {tier.label}
                </p>
                <p className="font-semibold mt-1" style={{ color: "#1B4332" }}>
                  {formatPeso(tier.price)}/mo
                </p>
                {!isCurrent && (
                  <p
                    className="text-xs mt-1 font-medium"
                    style={{ color: diff > 0 ? "#D97706" : "#059669" }}
                  >
                    {diff > 0 ? "+" : ""}
                    {formatPeso(Math.abs(diff))}/mo
                  </p>
                )}
              </button>
            );
          },
        )}
      </div>
      {selectedPlan !== 10 && (
        <div
          className="rounded-xl p-3"
          style={{ backgroundColor: "#EFF6FF", border: "1px solid #BFDBFE" }}
        >
          <p className="text-sm" style={{ color: "#1E40AF" }}>
            Your billing will be pro-rated for the remainder of the current
            cycle.
          </p>
        </div>
      )}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors hover:bg-gray-100"
          style={{ border: "1px solid #E5E7EB", color: "#1A1A2E" }}
        >
          Cancel
        </button>
        <button
          onClick={() => {
            onClose();
            if (selectedPlan !== 10) {
              showToast(
                `Plan changed to ${selectedPlan} meals/week`,
                "success",
              );
            }
          }}
          className="flex-1 px-4 py-2.5 rounded-xl font-medium text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: "#1B4332" }}
        >
          Confirm Change
        </button>
      </div>
    </div>
  );
}

/* Edit Profile Modal Content */
function EditProfileModalContent({
  initialName,
  initialEmail,
  initialPhone,
  initialDietary,
  initialAllergens,
  initialFavoriteMeal,
  onSave,
  onClose,
}: {
  initialName: string;
  initialEmail: string;
  initialPhone: string;
  initialDietary: string[];
  initialAllergens: string[];
  initialFavoriteMeal: string;
  onSave: (data: {
    name: string;
    email: string;
    phone: string;
    dietary: string[];
    allergens: string[];
    favoriteMeal: string;
  }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [dietary, setDietary] = useState<string[]>(initialDietary);
  const [allergens, setAllergens] = useState<string[]>(initialAllergens);
  const [favoriteMeal, setFavoriteMeal] = useState<string>(initialFavoriteMeal);

  const ALL_ALLERGENS = [
    "Dairy",
    "Eggs",
    "Soy",
    "Fish",
    "Gluten",
    "Sesame",
    "Shellfish",
    "Peanuts",
  ];

  const toggleDietary = (pref: string) => {
    setDietary((prev) =>
      prev.includes(pref) ? prev.filter((p) => p !== pref) : [...prev, pref],
    );
  };

  const toggleAllergen = (allergen: string) => {
    setAllergens((prev) =>
      prev.includes(allergen)
        ? prev.filter((a) => a !== allergen)
        : [...prev, allergen],
    );
  };

  const inputStyle = {
    backgroundColor: "#FFFFFF",
    border: "1px solid #E5E7EB",
    color: "#1A1A2E",
  };

  const disabledInputStyle = {
    backgroundColor: "#F9FAFB",
    border: "1px solid #E5E7EB",
    color: "#9CA3AF",
    cursor: "not-allowed" as const,
  };

  return (
    <div
      className="space-y-5 max-h-[70vh] overflow-y-auto pr-2"
      style={{ scrollbarWidth: "thin" }}
    >
      {/* Personal Information */}
      <div>
        <h3
          className="text-sm font-semibold mb-3 flex items-center gap-2"
          style={{ color: "#1A1A2E" }}
        >
          <User size={14} color="#1B4332" /> Personal Information
        </h3>
        <div className="space-y-3">
          <div>
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: "#6B7280" }}
            >
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600 transition-shadow"
              style={inputStyle}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                className="block text-xs font-medium mb-1 flex items-center gap-1"
                style={{ color: "#6B7280" }}
              >
                <Mail size={12} /> Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600 transition-shadow"
                style={inputStyle}
              />
            </div>
            <div>
              <label
                className="block text-xs font-medium mb-1 flex items-center gap-1"
                style={{ color: "#6B7280" }}
              >
                <Phone size={12} /> Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600 transition-shadow"
                style={inputStyle}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Address (Disabled) */}
      <div>
        <h3
          className="text-sm font-semibold mb-3 flex items-center gap-2"
          style={{ color: "#1A1A2E" }}
        >
          <MapPin size={14} color="#1B4332" /> Delivery Address
          <span
            className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
            style={{
              backgroundColor: "#F3F4F6",
              color: "#9CA3AF",
              border: "1px solid #E5E7EB",
            }}
          >
            <Lock size={10} /> Coming Soon
          </span>
        </h3>
        <input
          type="text"
          value={customers[0].address}
          disabled
          className="w-full px-3 py-2 rounded-xl text-sm"
          style={disabledInputStyle}
        />
        <p className="text-[10px] mt-1.5 italic" style={{ color: "#9CA3AF" }}>
          Address editing will be available in a future update.
        </p>
      </div>

      {/* Payment Method (Disabled) */}
      <div>
        <h3
          className="text-sm font-semibold mb-3 flex items-center gap-2"
          style={{ color: "#1A1A2E" }}
        >
          <CreditCard size={14} color="#1B4332" /> Payment Method
          <span
            className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
            style={{
              backgroundColor: "#F3F4F6",
              color: "#9CA3AF",
              border: "1px solid #E5E7EB",
            }}
          >
            <Lock size={10} /> Coming Soon
          </span>
        </h3>
        <input
          type="text"
          value="GCash ending in ****4567"
          disabled
          className="w-full px-3 py-2 rounded-xl text-sm"
          style={disabledInputStyle}
        />
        <p className="text-[10px] mt-1.5 italic" style={{ color: "#9CA3AF" }}>
          Payment method management will be available in a future update.
        </p>
      </div>

      {/* Favorite Meal */}
      <div>
        <h3
          className="text-sm font-semibold mb-3 flex items-center gap-2"
          style={{ color: "#1A1A2E" }}
        >
          <Heart size={14} color="#E76F51" /> Favorite Meal
        </h3>
        <Select
          value={favoriteMeal}
          onValueChange={(value) => setFavoriteMeal(value)}
        >
          <SelectTrigger className="w-full bg-white text-sm rounded-xl">
            <SelectValue placeholder="Select your favorite meal" />
          </SelectTrigger>
          <SelectContent>
            {meals.map((meal) => (
              <SelectItem key={meal.id} value={meal.name}>
                {meal.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Dietary Preferences */}
      <div>
        <h3
          className="text-sm font-semibold mb-3 flex items-center gap-2"
          style={{ color: "#1A1A2E" }}
        >
          <Tag size={14} color="#059669" /> Dietary Preferences
        </h3>
        <div className="flex flex-wrap gap-2">
          {dietaryFilters.map((pref) => {
            const isSelected = dietary.includes(pref);
            return (
              <button
                key={pref}
                onClick={() => toggleDietary(pref)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors border"
                style={{
                  backgroundColor: isSelected ? "#D1FAE5" : "#FFFFFF",
                  color: isSelected ? "#065F46" : "#6B7280",
                  borderColor: isSelected ? "#10B981" : "#E5E7EB",
                }}
              >
                {pref}
              </button>
            );
          })}
        </div>
      </div>

      {/* Allergens */}
      <div>
        <h3
          className="text-sm font-semibold mb-3 flex items-center gap-2"
          style={{ color: "#1A1A2E" }}
        >
          <AlertTriangle size={14} color="#D97706" /> Allergies
        </h3>
        <div className="flex flex-wrap gap-2">
          {ALL_ALLERGENS.map((allergen) => {
            const isSelected = allergens.includes(allergen);
            return (
              <button
                key={allergen}
                onClick={() => toggleAllergen(allergen)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors border"
                style={{
                  backgroundColor: isSelected ? "#FEF3C7" : "#FFFFFF",
                  color: isSelected ? "#92400E" : "#6B7280",
                  borderColor: isSelected ? "#F59E0B" : "#E5E7EB",
                }}
              >
                {allergen}
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors hover:bg-gray-100"
          style={{ border: "1px solid #E5E7EB", color: "#1A1A2E" }}
        >
          Cancel
        </button>
        <button
          onClick={() =>
            onSave({ name, email, phone, dietary, allergens, favoriteMeal })
          }
          className="flex-1 px-4 py-2.5 rounded-xl font-medium text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: "#1B4332" }}
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}

/* Edit Meals Modal Content */
function EditMealsModalContent({
  onClose,
  showToast,
  customer,
}: {
  onClose: () => void;
  showToast: (
    msg: string,
    type?: "success" | "error" | "info" | "warning",
  ) => void;
  customer: (typeof customers)[0];
}) {
  const match = customer.planType.match(/(\d+)/);
  const planMealsLimit = match ? parseInt(match[1], 10) : 0;

  const [selectedMeals, setSelectedMeals] = useState<
    { meal: Meal; quantity: number }[]
  >(() => {
    let count = 0;
    const initialSelection: { meal: Meal; quantity: number }[] = [];
    for (const m of meals) {
      if (count < planMealsLimit) {
        const qty = Math.min(2, planMealsLimit - count);
        initialSelection.push({ meal: m, quantity: qty });
        count += qty;
      }
    }
    return initialSelection;
  });

  const totalMealsSelected = selectedMeals.reduce(
    (sum, m) => sum + m.quantity,
    0,
  );

  function updateMealQuantity(meal: Meal, delta: number) {
    const currentQty =
      selectedMeals.find((m) => m.meal.id === meal.id)?.quantity || 0;
    const newQty = currentQty + delta;

    if (newQty < 0) return;
    if (delta > 0 && totalMealsSelected >= planMealsLimit) {
      showToast(
        `Your plan only allows ${planMealsLimit} meals per week`,
        "warning",
      );
      return;
    }

    if (newQty === 0) {
      setSelectedMeals((prev) => prev.filter((m) => m.meal.id !== meal.id));
    } else if (currentQty === 0) {
      setSelectedMeals((prev) => [...prev, { meal, quantity: 1 }]);
    } else {
      setSelectedMeals((prev) =>
        prev.map((m) =>
          m.meal.id === meal.id ? { ...m, quantity: newQty } : m,
        ),
      );
    }
  }

  return (
    <div
      className="space-y-6 -mx-2 px-2 max-h-[70vh] overflow-y-auto"
      style={{ scrollbarWidth: "thin" }}
    >
      <div
        className="rounded-xl p-4 sticky top-0 z-10"
        style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0" }}
      >
        <h3 className="text-sm font-semibold mb-1" style={{ color: "#1B4332" }}>
          Current Plan: {customer.planType}
        </h3>
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: "#065F46" }}>
            {totalMealsSelected} of {planMealsLimit} meals selected
          </p>
          <span
            className="text-xs font-semibold"
            style={{
              color:
                totalMealsSelected === planMealsLimit ? "#059669" : "#065F46",
            }}
          >
            {totalMealsSelected === planMealsLimit
              ? "Ready!"
              : `${planMealsLimit - totalMealsSelected} left`}
          </span>
        </div>

        <div
          className="mt-2 h-2 overflow-hidden rounded-full"
          style={{ backgroundColor: "rgba(5, 150, 105, 0.2)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              backgroundColor: "#1B4332",
              width: `${Math.min((totalMealsSelected / planMealsLimit) * 100, 100)}%`,
            }}
          />
        </div>
      </div>

      <div>
        <h3
          className="text-sm font-semibold mb-3 sticky top-[88px] bg-white py-2 z-10"
          style={{ color: "#1A1A2E" }}
        >
          Available Meals for Next Week
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
          {meals.map((meal) => {
            const qty =
              selectedMeals.find((m) => m.meal.id === meal.id)?.quantity || 0;
            const isSelected = qty > 0;
            return (
              <div
                key={meal.id}
                className="flex items-center gap-3 p-3 rounded-xl transition-all"
                style={{
                  border: isSelected
                    ? "1px solid #1B4332"
                    : "1px solid #E5E7EB",
                  backgroundColor: isSelected ? "#F0FDF4" : "#FFFFFF",
                }}
              >
                <img
                  src={meal.image}
                  alt={meal.name}
                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-semibold truncate"
                    style={{ color: "#1A1A2E" }}
                  >
                    {meal.name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>
                    {formatPeso(meal.price)}
                  </p>

                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => updateMealQuantity(meal, -1)}
                      disabled={qty === 0}
                      className="flex h-7 w-7 items-center justify-center rounded-full transition-colors disabled:opacity-30"
                      style={{
                        backgroundColor: qty > 0 ? "#1B4332" : "#E5E7EB",
                        color: qty > 0 ? "#FFFFFF" : "#6B7280",
                      }}
                    >
                      <Minus size={14} />
                    </button>
                    <span
                      className="w-6 text-center text-sm font-bold"
                      style={{ color: "#1A1A2E" }}
                    >
                      {qty}
                    </span>
                    <button
                      onClick={() => updateMealQuantity(meal, 1)}
                      disabled={totalMealsSelected >= planMealsLimit}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-white transition-colors disabled:opacity-30"
                      style={{ backgroundColor: "#E76F51" }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-200 sticky bottom-0 bg-white pb-2 z-10">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors hover:bg-gray-100"
          style={{ border: "1px solid #E5E7EB", color: "#1A1A2E" }}
        >
          Cancel
        </button>
        <button
          onClick={() => {
            if (totalMealsSelected !== planMealsLimit) {
              showToast(
                `Please select exactly ${planMealsLimit} meals`,
                "warning",
              );
              return;
            }
            onClose();
            showToast("Next delivery meals updated successfully", "success");
          }}
          disabled={totalMealsSelected !== planMealsLimit}
          className="flex-1 px-4 py-2.5 rounded-xl font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "#1B4332" }}
        >
          Save Meals
        </button>
      </div>
    </div>
  );
}
