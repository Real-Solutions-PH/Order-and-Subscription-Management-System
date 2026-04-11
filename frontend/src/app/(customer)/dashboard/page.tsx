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
import { useAuth, useOrders, useDevMode } from "@/hooks";
import { SkeletonCard } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/StatusBadge";
import Modal from "@/components/Modal";
import MealImage from "@/components/MealImage";

export default function DashboardPage() {
  const { showToast } = useToast();
  const devMode = useDevMode();

  // --- API hooks; only fall back to mock data when DEV_MODE is on ---
  const { user, isLoading: isLoadingUser } = useAuth();
  const ordersQuery = useOrders();

  const customer = devMode ? customers[0] : null;
  const nextDeliveryMeals = devMode ? meals.slice(0, 5) : [];

  // Map API user to display format
  const displayUser = user
    ? {
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        phone: user.phone ?? "",
      }
    : customer
      ? {
          name: customer?.name ?? "",
          email: customer?.email ?? "",
          phone: customer?.phone ?? "",
        }
      : { name: "", email: "", phone: "" };

  // Map API orders to display format
  const displayOrders =
    ordersQuery.data?.items?.map((o) => ({
      id: o.id,
      orderId: o.order_number,
      status: o.status,
      items: o.items,
      total: o.total,
      deliveryDate: o.delivered_at ?? o.placed_at ?? o.created_at,
    })) ?? (devMode ? orders : []);
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
    customer?.dietaryPreferences ?? [],
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
                  <Button
                    onClick={() => setProfileModalOpen(true)}
                    size="sm"
                    className="flex items-center gap-1.5 hover:shadow-md"
                    style={{ backgroundColor: "#1B4332", color: "#FFFFFF" }}
                  >
                    <Pencil size={12} /> Edit Profile
                  </Button>
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
                    <p
                      className="text-xs truncate"
                      style={{ color: "#6B7280" }}
                    >
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
                        {customer?.address ?? ""}
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
                            <Badge key={pref} variant="success">
                              {pref}
                            </Badge>
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
                            <Badge key={allergen} variant="warning">
                              {allergen}
                            </Badge>
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
                            <Switch
                              checked={notifications[row.emailKey]}
                              onCheckedChange={() =>
                                toggleNotification(row.emailKey)
                              }
                            />
                          </td>
                          <td className="py-2 text-center">
                            <Switch
                              checked={notifications[row.smsKey]}
                              onCheckedChange={() =>
                                toggleNotification(row.smsKey)
                              }
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
                  background:
                    "linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)",
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
                      {customer?.planType ?? "No Plan"}
                    </h2>
                    <div className="flex flex-wrap gap-3 sm:gap-4 lg:gap-5">
                      <div
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2"
                        style={{ backgroundColor: "rgba(255, 255, 255, 0.08)" }}
                      >
                        <div
                          className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center p-1.5"
                          style={{
                            backgroundColor: "rgba(167, 243, 208, 0.15)",
                          }}
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
                          style={{
                            backgroundColor: "rgba(167, 243, 208, 0.15)",
                          }}
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
                <Button
                  onClick={() => setEditMealsModalOpen(true)}
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-1 px-0"
                  style={{ color: "#1B4332" }}
                >
                  Edit Selection <ChevronRight size={16} />
                </Button>
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
                    <div className="h-20 overflow-hidden">
                      <MealImage
                        src={meal.image}
                        alt={meal.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
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
                      {displayOrders
                        .slice(0, 6)
                        .map(
                          (order: {
                            id: string;
                            deliveryDate: string;
                            items: unknown[];
                            total: number;
                            status: string;
                          }) => (
                            <tr
                              key={order.id}
                              style={{ borderBottom: "1px solid #F3F4F6" }}
                              className="hover:bg-gray-50 transition-colors"
                            >
                              <td
                                className="py-2 px-2 text-xs"
                                style={{ color: "#1A1A2E" }}
                              >
                                {new Date(
                                  order.deliveryDate,
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
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
                                <Button
                                  onClick={() =>
                                    showToast("Items added to cart", "success")
                                  }
                                  variant="ghost"
                                  size="sm"
                                  className="flex items-center gap-1"
                                  style={{ color: "#1B4332" }}
                                >
                                  <RefreshCw size={12} /> Reorder
                                </Button>
                              </td>
                            </tr>
                          ),
                        )}
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
              <Button
                onClick={() => setSkipModalOpen(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setSkipModalOpen(false);
                  showToast("Week of April 7 skipped successfully", "success");
                }}
                variant="warning"
                className="flex-1"
              >
                Skip Week
              </Button>
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
      <p className="text-text-secondary">
        Choose how long to pause your subscription:
      </p>

      {/* Preset buttons */}
      <div className="flex gap-2">
        {presets.map((preset) => (
          <Button
            key={preset.days}
            onClick={() => setPauseDays(preset.days)}
            variant="outline"
            className={`flex-1 border-2 ${
              pauseDays === preset.days
                ? "border-primary bg-green-50 text-primary"
                : "border-border"
            }`}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Custom days input */}
      <div className="rounded-xl p-4 bg-gray-50 border border-border">
        <label className="block text-sm font-medium mb-2 text-text-primary">
          Or enter a custom number of days
        </label>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setPauseDays(Math.max(1, pauseDays - 1))}
            size="icon"
            variant="outline"
            className="font-bold text-lg"
          >
            −
          </Button>
          <Input
            type="number"
            min={1}
            max={90}
            value={pauseDays}
            onChange={(e) => handleDaysChange(e.target.value)}
            className="w-20 text-center text-lg font-semibold py-1.5 border-2 border-primary text-primary"
          />
          <Button
            onClick={() => setPauseDays(Math.min(90, pauseDays + 1))}
            size="icon"
            className="font-bold text-lg"
          >
            +
          </Button>
          <span className="text-sm font-medium text-text-secondary">
            day{pauseDays !== 1 ? "s" : ""}
          </span>
        </div>
        <p className="text-xs mt-2 text-text-tertiary">
          Min 1 day · Max 90 days
        </p>
      </div>

      <div className="rounded-xl p-3 bg-orange-50 border border-orange-200">
        <p className="text-sm text-warning-dark">
          Your subscription will resume on <strong>{resumeLabel}</strong>. You
          won&apos;t be charged during the pause.
        </p>
      </div>
      <div className="flex gap-3 pt-2">
        <Button onClick={onClose} variant="outline" className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={() => {
            onClose();
            showToast(
              `Subscription paused for ${pauseDays} day${pauseDays !== 1 ? "s" : ""} — resumes ${resumeLabel}`,
              "success",
            );
          }}
          variant="warning"
          className="flex-1"
        >
          Pause Subscription
        </Button>
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
      <p className="text-text-secondary">Select your new plan:</p>
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
              <Button
                key={tier.id}
                onClick={() => setSelectedPlan(tier.id)}
                variant="outline"
                className={`relative h-auto p-4 text-left flex-col items-start border-2 ${
                  isSelected ? "border-primary bg-green-50" : "border-border"
                }`}
              >
                {isCurrent && (
                  <Badge className="absolute -top-2.5 left-3 bg-primary text-white">
                    Current
                  </Badge>
                )}
                <p className="font-bold text-lg text-text-primary">
                  {tier.meals} meals
                </p>
                <p className="text-sm text-text-secondary">{tier.label}</p>
                <p className="font-semibold mt-1 text-primary">
                  {formatPeso(tier.price)}/mo
                </p>
                {!isCurrent && (
                  <p
                    className={`text-xs mt-1 font-medium ${diff > 0 ? "text-warning" : "text-success"}`}
                  >
                    {diff > 0 ? "+" : ""}
                    {formatPeso(Math.abs(diff))}/mo
                  </p>
                )}
              </Button>
            );
          },
        )}
      </div>
      {selectedPlan !== 10 && (
        <div className="rounded-xl p-3 bg-blue-50 border border-blue-200">
          <p className="text-sm text-blue-800">
            Your billing will be pro-rated for the remainder of the current
            cycle.
          </p>
        </div>
      )}
      <div className="flex gap-3 pt-2">
        <Button onClick={onClose} variant="outline" className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={() => {
            onClose();
            if (selectedPlan !== 10) {
              showToast(
                `Plan changed to ${selectedPlan} meals/week`,
                "success",
              );
            }
          }}
          className="flex-1"
        >
          Confirm Change
        </Button>
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

  return (
    <div
      className="space-y-5 max-h-[70vh] overflow-y-auto pr-2"
      style={{ scrollbarWidth: "thin" }}
    >
      {/* Personal Information */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-text-primary">
          <User size={14} className="text-primary" /> Personal Information
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1 text-text-secondary">
              Full Name
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1 flex items-center gap-1 text-text-secondary">
                <Mail size={12} /> Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 flex items-center gap-1 text-text-secondary">
                <Phone size={12} /> Phone
              </label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Address (Disabled) */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-text-primary">
          <MapPin size={14} className="text-primary" /> Delivery Address
          <span className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-muted text-text-tertiary border border-border">
            <Lock size={10} /> Coming Soon
          </span>
        </h3>
        <Input type="text" value={customers[0].address} disabled />
        <p className="text-[10px] mt-1.5 italic text-text-tertiary">
          Address editing will be available in a future update.
        </p>
      </div>

      {/* Payment Method (Disabled) */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-text-primary">
          <CreditCard size={14} className="text-primary" /> Payment Method
          <span className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-muted text-text-tertiary border border-border">
            <Lock size={10} /> Coming Soon
          </span>
        </h3>
        <Input type="text" value="GCash ending in ****4567" disabled />
        <p className="text-[10px] mt-1.5 italic text-text-tertiary">
          Payment method management will be available in a future update.
        </p>
      </div>

      {/* Favorite Meal */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-text-primary">
          <Heart size={14} className="text-accent" /> Favorite Meal
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
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-text-primary">
          <Tag size={14} className="text-success" /> Dietary Preferences
        </h3>
        <div className="flex flex-wrap gap-2">
          {dietaryFilters.map((pref) => {
            const isSelected = dietary.includes(pref);
            return (
              <Button
                key={pref}
                onClick={() => toggleDietary(pref)}
                variant="outline"
                size="sm"
                className={`rounded-full border ${
                  isSelected
                    ? "bg-success-light text-emerald-800 border-emerald-500"
                    : "border-border"
                }`}
              >
                {pref}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Allergens */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-text-primary">
          <AlertTriangle size={14} className="text-warning" /> Allergies
        </h3>
        <div className="flex flex-wrap gap-2">
          {ALL_ALLERGENS.map((allergen) => {
            const isSelected = allergens.includes(allergen);
            return (
              <Button
                key={allergen}
                onClick={() => toggleAllergen(allergen)}
                variant="outline"
                size="sm"
                className={`rounded-full border ${
                  isSelected
                    ? "bg-warning-light text-warning-dark border-amber-400"
                    : "border-border"
                }`}
              >
                {allergen}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <Button onClick={onClose} variant="outline" className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={() =>
            onSave({ name, email, phone, dietary, allergens, favoriteMeal })
          }
          className="flex-1"
        >
          Save Changes
        </Button>
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
  customer: (typeof customers)[0] | null;
}) {
  const match = customer?.planType?.match(/(\d+)/);
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
      <div className="rounded-xl p-4 sticky top-0 z-10 bg-green-50 border border-green-200">
        <h3 className="text-sm font-semibold mb-1 text-primary">
          Current Plan: {customer?.planType ?? "No Plan"}
        </h3>
        <div className="flex items-center justify-between">
          <p className="text-xs text-emerald-800">
            {totalMealsSelected} of {planMealsLimit} meals selected
          </p>
          <span
            className={`text-xs font-semibold ${
              totalMealsSelected === planMealsLimit
                ? "text-success"
                : "text-emerald-800"
            }`}
          >
            {totalMealsSelected === planMealsLimit
              ? "Ready!"
              : `${planMealsLimit - totalMealsSelected} left`}
          </span>
        </div>

        <div className="mt-2 h-2 overflow-hidden rounded-full bg-emerald-600/20">
          <div
            className="h-full rounded-full transition-all duration-300 bg-primary"
            style={{
              width: `${Math.min((totalMealsSelected / planMealsLimit) * 100, 100)}%`,
            }}
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3 sticky top-[88px] bg-white py-2 z-10 text-text-primary">
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
                className={`flex items-center gap-3 p-3 rounded-xl transition-all border ${
                  isSelected
                    ? "border-primary bg-green-50"
                    : "border-border bg-surface-white"
                }`}
              >
                <MealImage
                  src={meal.image}
                  alt={meal.name}
                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate text-text-primary">
                    {meal.name}
                  </p>
                  <p className="text-xs mt-0.5 text-text-secondary">
                    {formatPeso(meal.price)}
                  </p>

                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      onClick={() => updateMealQuantity(meal, -1)}
                      disabled={qty === 0}
                      size="icon"
                      className={`h-7 w-7 rounded-full ${
                        qty > 0
                          ? "bg-primary text-white"
                          : "bg-border text-text-secondary"
                      }`}
                    >
                      <Minus size={14} />
                    </Button>
                    <span className="w-6 text-center text-sm font-bold text-text-primary">
                      {qty}
                    </span>
                    <Button
                      onClick={() => updateMealQuantity(meal, 1)}
                      disabled={totalMealsSelected >= planMealsLimit}
                      size="icon"
                      className="h-7 w-7 rounded-full bg-accent text-white"
                    >
                      <Plus size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-200 sticky bottom-0 bg-white pb-2 z-10">
        <Button onClick={onClose} variant="outline" className="flex-1">
          Cancel
        </Button>
        <Button
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
          className="flex-1"
        >
          Save Meals
        </Button>
      </div>
    </div>
  );
}
