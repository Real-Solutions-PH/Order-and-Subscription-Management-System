"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CheckCircle,
  Package,
  ClipboardCheck,
  ChefHat,
  BoxSelect,
  Truck,
  CircleCheckBig,
  Download,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { orders, formatPeso } from "@/lib/mock-data";
import { useToast } from "@/context/ToastContext";
import { useOrders, useDevMode } from "@/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import RequireAuth from "@/components/RequireAuth";

const timelineSteps = [
  { label: "Placed", icon: Package, status: "completed" as const },
  { label: "Confirmed", icon: ClipboardCheck, status: "completed" as const },
  { label: "Preparing", icon: ChefHat, status: "in-progress" as const },
  { label: "Ready", icon: BoxSelect, status: "pending" as const },
  { label: "Delivering", icon: Truck, status: "pending" as const },
  { label: "Delivered", icon: CircleCheckBig, status: "pending" as const },
];

export default function OrderConfirmationPage() {
  const { showToast } = useToast();
  const devMode = useDevMode();
  const [showContent, setShowContent] = useState(false);

  const ordersQuery = useOrders({ limit: 1 });
  const isLoadingOrder = ordersQuery.isLoading;

  const apiOrder = ordersQuery.data?.items?.[0];
  const displayOrder = apiOrder
    ? {
        id: apiOrder.order_number,
        items: apiOrder.items.map((i) => ({
          mealName: i.product_name,
          quantity: i.quantity,
          price: Number(i.unit_price),
        })),
        total: Number(apiOrder.total),
        status: apiOrder.status,
        deliveryDate: apiOrder.delivered_at ?? apiOrder.placed_at ?? "",
        deliverySlot: "",
        paymentMethod: "",
        address: "",
      }
    : devMode
      ? orders[0]
      : null;

  const order = displayOrder;

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 600);
    return () => clearTimeout(timer);
  }, []);

  const getStepColor = (status: "completed" | "in-progress" | "pending") => {
    if (status === "completed") return "#059669";
    if (status === "in-progress") return "#D97706";
    return "#D1D5DB";
  };

  const getLineColor = (index: number) => {
    if (index < 2) return "#059669";
    if (index === 2) return "#D97706";
    return "#E5E7EB";
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FEFAE0" }}>
      <div className="max-w-3xl mx-auto px-4 py-12">
        {isLoadingOrder ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        ) : !order ? (
          <div className="py-20 text-center">
            <Package size={64} style={{ color: "#E5E7EB", margin: "0 auto" }} />
            <p
              className="mt-4 text-lg font-medium"
              style={{ color: "#6B7280" }}
            >
              No order to display.
            </p>
            <Link
              href="/"
              className="mt-4 inline-block text-sm font-semibold underline"
              style={{ color: "#1B4332" }}
            >
              Browse Menu
            </Link>
          </div>
        ) : (
          <>
            {/* Success Animation */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 15,
                delay: 0.1,
              }}
              className="flex flex-col items-center text-center mb-10"
            >
              <div className="pulse-success mb-6">
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#D1FAE5" }}
                >
                  <CheckCircle size={56} color="#059669" strokeWidth={2} />
                </div>
              </div>
              <h1
                className="text-3xl md:text-4xl mb-2"
                style={{
                  fontFamily: "'DM Serif Display', serif",
                  color: "#1A1A2E",
                }}
              >
                Order Placed Successfully!
              </h1>
              <p style={{ color: "#6B7280" }} className="text-lg">
                Your delicious meals are on their way
              </p>
            </motion.div>

            {showContent && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                {/* Order ID */}
                <div className="text-center mb-8">
                  <p style={{ color: "#6B7280" }} className="text-sm mb-1">
                    Order ID
                  </p>
                  <p
                    className="text-xl font-semibold"
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      color: "#1B4332",
                    }}
                  >
                    {order.id}
                  </p>
                </div>

                {/* Order Summary Card */}
                <div
                  className="rounded-2xl p-6 mb-8"
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #E5E7EB",
                    boxShadow:
                      "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
                  }}
                >
                  <h2
                    className="text-lg font-semibold mb-4"
                    style={{ color: "#1A1A2E" }}
                  >
                    Order Summary
                  </h2>
                  <div className="space-y-3">
                    {order.items.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-2"
                        style={{
                          borderBottom:
                            i < order.items.length - 1
                              ? "1px solid #F3F4F6"
                              : "none",
                        }}
                      >
                        <div className="flex-1">
                          <p
                            className="font-medium"
                            style={{ color: "#1A1A2E" }}
                          >
                            {item.mealName}
                          </p>
                          <p className="text-sm" style={{ color: "#6B7280" }}>
                            Qty: {item.quantity} x {formatPeso(item.price)}
                          </p>
                        </div>
                        <p
                          className="font-semibold"
                          style={{ color: "#1A1A2E" }}
                        >
                          {formatPeso(item.quantity * item.price)}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div
                    className="flex items-center justify-between mt-4 pt-4"
                    style={{ borderTop: "2px solid #E5E7EB" }}
                  >
                    <p
                      className="text-lg font-semibold"
                      style={{ color: "#1A1A2E" }}
                    >
                      Total
                    </p>
                    <p
                      className="text-xl font-bold"
                      style={{ color: "#1B4332" }}
                    >
                      {formatPeso(order.total)}
                    </p>
                  </div>
                </div>

                {/* Delivery Timeline Stepper */}
                <div
                  className="rounded-2xl p-6 mb-8"
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #E5E7EB",
                    boxShadow:
                      "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
                  }}
                >
                  <h2
                    className="text-lg font-semibold mb-6"
                    style={{ color: "#1A1A2E" }}
                  >
                    Delivery Timeline
                  </h2>
                  <div className="flex items-start justify-between relative">
                    {timelineSteps.map((step, i) => {
                      const Icon = step.icon;
                      const color = getStepColor(step.status);
                      const isInProgress = step.status === "in-progress";
                      return (
                        <div
                          key={step.label}
                          className="flex flex-col items-center relative z-10"
                          style={{ flex: 1 }}
                        >
                          {/* Connector line (before this step) */}
                          {i > 0 && (
                            <div
                              className="absolute top-5 right-1/2"
                              style={{
                                width: "100%",
                                height: "3px",
                                backgroundColor: getLineColor(i - 1),
                                zIndex: -1,
                              }}
                            />
                          )}
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                            style={{
                              backgroundColor:
                                step.status === "pending"
                                  ? "#F3F4F6"
                                  : `${color}20`,
                              border: `2px solid ${color}`,
                              animation: isInProgress
                                ? "pulse-success 2s ease-in-out infinite"
                                : "none",
                            }}
                          >
                            <Icon size={18} color={color} strokeWidth={2} />
                          </div>
                          <p
                            className="text-xs font-medium text-center"
                            style={{
                              color:
                                step.status === "pending" ? "#9CA3AF" : color,
                            }}
                          >
                            {step.label}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 mb-8">
                  <Link href="/dashboard" className="flex-1">
                    <button
                      className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-white font-semibold transition-all hover:opacity-90"
                      style={{ backgroundColor: "#1B4332" }}
                    >
                      Track My Order
                      <ArrowRight size={18} />
                    </button>
                  </Link>
                  <button
                    onClick={() => showToast("Receipt downloaded", "success")}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold transition-all hover:bg-gray-50"
                    style={{
                      color: "#1B4332",
                      border: "2px solid #1B4332",
                      backgroundColor: "transparent",
                    }}
                  >
                    <Download size={18} />
                    Download Receipt
                  </button>
                </div>

                {/* Upsell Card */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="rounded-2xl p-6 relative overflow-hidden"
                  style={{
                    background:
                      "linear-gradient(135deg, #1B4332 0%, #2D6A4F 50%, #40916C 100%)",
                  }}
                >
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles size={20} color="#F4A261" />
                      <p
                        className="text-sm font-semibold"
                        style={{ color: "#F4A261" }}
                      >
                        SUBSCRIBE & SAVE 15%
                      </p>
                    </div>
                    <h3
                      className="text-xl font-bold text-white mb-2"
                      style={{ fontFamily: "'DM Serif Display', serif" }}
                    >
                      Love your meals? Get them every week.
                    </h3>
                    <p className="text-sm mb-4" style={{ color: "#D1FAE5" }}>
                      Love your meals? Get them every week and save 15% on every
                      order.
                    </p>
                    <Link href="/meal-plan">
                      <button
                        className="px-6 py-3 rounded-xl font-semibold transition-all hover:opacity-90"
                        style={{ backgroundColor: "#E76F51", color: "#FFFFFF" }}
                      >
                        Start a Subscription
                      </button>
                    </Link>
                  </div>
                  {/* Decorative circles */}
                  <div
                    className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-10"
                    style={{ backgroundColor: "#FFFFFF" }}
                  />
                  <div
                    className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full opacity-10"
                    style={{ backgroundColor: "#FFFFFF" }}
                  />
                </motion.div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
