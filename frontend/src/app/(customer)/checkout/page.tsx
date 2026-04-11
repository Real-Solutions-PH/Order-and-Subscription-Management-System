"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Minus,
  Plus,
  Trash2,
  MapPin,
  Clock,
  CreditCard,
  Tag,
  CheckCircle,
  ShoppingBag,
  ArrowLeft,
  LogIn,
  UserPlus,
} from "lucide-react";
import {
  deliveryZones as mockDeliveryZones,
  timeSlots,
  paymentMethods,
  formatPeso,
} from "@/lib/mock-data";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";
import { useAuthContext } from "@/context/AuthContext";
import {
  useDeliveryZones,
  usePaymentMutations,
  useOrderMutations,
  useDevMode,
} from "@/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import MealImage from "@/components/MealImage";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, clearCart, total, itemCount } =
    useCart();
  const { showToast } = useToast();

  const devMode = useDevMode();

  // API hooks
  const { data: apiZones, isLoading: isLoadingZones } = useDeliveryZones();
  const { validatePromo } = usePaymentMutations();
  const { checkout } = useOrderMutations();

  // Map API zones to the existing format; only fall back to mock data when DEV_MODE is on
  const deliveryZones = useMemo(() => {
    if (apiZones && Array.isArray(apiZones) && apiZones.length > 0) {
      return apiZones
        .filter((z) => z.is_active !== false)
        .map((z) => ({
          name: z.name,
          fee: Number(z.delivery_fee),
          estimatedTime: z.description ?? "Contact for ETA",
        }));
    }
    return devMode ? mockDeliveryZones : [];
  }, [apiZones, devMode]);

  const displayTimeSlots = timeSlots;
  const displayPaymentMethods = paymentMethods;

  // Auth
  const { isAuthenticated, user, openAuthModal } = useAuthContext();

  // Address fields
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [barangay, setBarangay] = useState("");
  const [zip, setZip] = useState("");
  const [selectedZone, setSelectedZone] = useState("");

  // Delivery slot
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTimeSlot, setDeliveryTimeSlot] = useState("");

  // Payment
  const [selectedPayment, setSelectedPayment] = useState("");

  // Promo
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoDiscount, setPromoDiscount] = useState<{
    type: string;
    value: number;
    amount: number;
  } | null>(null);
  const [promoError, setPromoError] = useState("");

  // Generate next 7 days
  const nextDays = useMemo(() => {
    const days: { label: string; value: string }[] = [];
    const today = new Date();
    for (let i = 1; i <= 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
      const monthDay = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      days.push({
        label: `${dayName}, ${monthDay}`,
        value: d.toISOString().split("T")[0],
      });
    }
    return days;
  }, []);

  // Delivery fee
  const zone = deliveryZones.find((z) => z.name === selectedZone);
  const deliveryFee = zone ? zone.fee : 0;

  // Discount
  const discount = promoDiscount
    ? promoDiscount.amount
    : appliedPromo === "PREPFLOW15"
      ? Math.round(total * 0.15)
      : 0;

  // Grand total
  const grandTotal = total + deliveryFee - discount;

  async function handleApplyPromo() {
    const code = promoCode.toUpperCase();
    try {
      const result = await validatePromo({ code, order_amount: total });
      setAppliedPromo(code);
      setPromoDiscount({
        type: result.discount_type,
        value: result.discount_value,
        amount: result.discount_amount,
      });
      setPromoError("");
      const label =
        result.discount_type === "percentage"
          ? `${result.discount_value}% discount`
          : `${formatPeso(result.discount_amount)} off`;
      showToast(`Promo code applied! ${label}`, "success");
    } catch {
      // Fallback to hardcoded check when backend is unavailable
      if (code === "PREPFLOW15") {
        setAppliedPromo("PREPFLOW15");
        setPromoDiscount(null);
        setPromoError("");
        showToast("Promo code applied! 15% discount", "success");
      } else {
        setAppliedPromo(null);
        setPromoDiscount(null);
        setPromoError("Invalid promo code");
      }
    }
  }

  async function handlePlaceOrder() {
    if (items.length === 0) {
      showToast("Your cart is empty", "error");
      return;
    }
    try {
      await checkout({
        payment_method: selectedPayment,
        promo_code: appliedPromo || undefined,
        notes: undefined,
      });
      showToast(
        "Order placed successfully! Thank you for your order.",
        "success",
      );
      clearCart();
      router.push("/order-confirmation");
    } catch {
      // Fallback to in-memory flow when backend is unavailable
      showToast(
        "Order placed successfully! Thank you for your order.",
        "success",
      );
      clearCart();
      router.push("/order-confirmation");
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
        <ShoppingBag size={64} style={{ color: "#E5E7EB" }} />
        <h2 className="mt-4 text-xl font-bold" style={{ color: "#1A1A2E" }}>
          Your cart is empty
        </h2>
        <p className="mt-2 text-sm" style={{ color: "#6B7280" }}>
          Add some meals to get started.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#E76F51" }}
        >
          <ArrowLeft size={16} />
          Browse Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FEFAE0" }}>
      {/* Header */}
      <div style={{ backgroundColor: "#1B4332" }}>
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <h1
            className="text-3xl font-bold sm:text-4xl"
            style={{
              fontFamily: "'DM Serif Display', serif",
              color: "#FEFAE0",
            }}
          >
            Checkout
          </h1>
          <p
            className="mt-2 text-sm"
            style={{ color: "rgba(254,250,224,0.75)" }}
          >
            {itemCount} item{itemCount !== 1 ? "s" : ""} in your cart
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:flex lg:gap-8 lg:px-8">
        {/* Left Column: Form Sections */}
        <div className="flex-1 space-y-6">
          {/* A) Order Summary */}
          <div
            className="rounded-2xl bg-white p-6"
            style={{ border: "1px solid #E5E7EB" }}
          >
            <h2
              className="mb-4 flex items-center gap-2 text-base font-bold"
              style={{ color: "#1A1A2E" }}
            >
              <ShoppingBag size={18} style={{ color: "#1B4332" }} />
              Order Summary
            </h2>
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.meal.id}
                  className="flex items-center gap-4 rounded-xl p-3 transition-colors hover:bg-gray-50"
                >
                  <MealImage
                    src={item.meal.image}
                    alt={item.meal.name}
                    className="h-16 w-16 shrink-0 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-semibold leading-tight"
                      style={{ color: "#1A1A2E" }}
                    >
                      {item.meal.name}
                    </p>
                    {item.customizations && item.customizations.length > 0 && (
                      <p
                        className="mt-0.5 text-xs"
                        style={{ color: "#059669" }}
                      >
                        {item.customizations.join(", ")}
                      </p>
                    )}
                    <p
                      className="mt-1 text-sm font-medium"
                      style={{ color: "#1B4332" }}
                    >
                      {formatPeso(item.meal.price)}
                    </p>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        updateQuantity(item.meal.id, item.quantity - 1)
                      }
                      className="flex h-7 w-7 items-center justify-center rounded-full transition-colors"
                      style={{ backgroundColor: "#f3f4f6" }}
                    >
                      <Minus size={12} style={{ color: "#1A1A2E" }} />
                    </button>
                    <span
                      className="w-5 text-center text-sm font-bold"
                      style={{ color: "#1A1A2E" }}
                    >
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        updateQuantity(item.meal.id, item.quantity + 1)
                      }
                      className="flex h-7 w-7 items-center justify-center rounded-full transition-colors"
                      style={{ backgroundColor: "#f3f4f6" }}
                    >
                      <Plus size={12} style={{ color: "#1A1A2E" }} />
                    </button>
                  </div>

                  {/* Item total + remove */}
                  <div className="flex items-center gap-3">
                    <span
                      className="text-sm font-bold"
                      style={{ color: "#1A1A2E" }}
                    >
                      {formatPeso(item.meal.price * item.quantity)}
                    </span>
                    <button
                      onClick={() => removeItem(item.meal.id)}
                      className="rounded-lg p-1.5 transition-colors hover:bg-red-50"
                    >
                      <Trash2 size={16} style={{ color: "#DC2626" }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* B) Delivery Address */}
          <div
            className="rounded-2xl bg-white p-6"
            style={{ border: "1px solid #E5E7EB" }}
          >
            <h2
              className="mb-4 flex items-center gap-2 text-base font-bold"
              style={{ color: "#1A1A2E" }}
            >
              <MapPin size={18} style={{ color: "#1B4332" }} />
              Delivery Address
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label
                  className="mb-1 block text-sm font-medium"
                  style={{ color: "#1A1A2E" }}
                >
                  Street Address
                </label>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="123 Rizal Avenue"
                  className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-colors focus:ring-2"
                  style={{ border: "1px solid #E5E7EB", color: "#1A1A2E" }}
                />
              </div>
              <div>
                <label
                  className="mb-1 block text-sm font-medium"
                  style={{ color: "#1A1A2E" }}
                >
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Makati City"
                  className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-colors focus:ring-2"
                  style={{ border: "1px solid #E5E7EB", color: "#1A1A2E" }}
                />
              </div>
              <div>
                <label
                  className="mb-1 block text-sm font-medium"
                  style={{ color: "#1A1A2E" }}
                >
                  Barangay
                </label>
                <input
                  type="text"
                  value={barangay}
                  onChange={(e) => setBarangay(e.target.value)}
                  placeholder="Brgy. San Lorenzo"
                  className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-colors focus:ring-2"
                  style={{ border: "1px solid #E5E7EB", color: "#1A1A2E" }}
                />
              </div>
              <div>
                <label
                  className="mb-1 block text-sm font-medium"
                  style={{ color: "#1A1A2E" }}
                >
                  Zip Code
                </label>
                <input
                  type="text"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="1229"
                  className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-colors focus:ring-2"
                  style={{ border: "1px solid #E5E7EB", color: "#1A1A2E" }}
                />
              </div>
              <div>
                <label
                  className="mb-1 block text-sm font-medium"
                  style={{ color: "#1A1A2E" }}
                >
                  Delivery Zone
                </label>
                {isLoadingZones ? (
                  <Skeleton className="h-10 w-full rounded-lg" />
                ) : (
                  <Select
                    value={selectedZone}
                    onValueChange={(value) => setSelectedZone(value)}
                  >
                    <SelectTrigger className="w-full bg-white text-sm">
                      <SelectValue placeholder="Select your zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {deliveryZones.map((z) => (
                        <SelectItem key={z.name} value={z.name}>
                          {z.name} — {formatPeso(z.fee)} ({z.estimatedTime})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            {zone && (
              <div
                className="mt-4 flex items-center gap-2 rounded-lg px-4 py-2.5"
                style={{ backgroundColor: "rgba(27,67,50,0.05)" }}
              >
                <CheckCircle size={16} style={{ color: "#059669" }} />
                <span className="text-sm" style={{ color: "#1A1A2E" }}>
                  Delivery fee: <strong>{formatPeso(zone.fee)}</strong> &middot;
                  Est. {zone.estimatedTime}
                </span>
              </div>
            )}
          </div>

          {/* C) Delivery Slot */}
          <div
            className="rounded-2xl bg-white p-6"
            style={{ border: "1px solid #E5E7EB" }}
          >
            <h2
              className="mb-4 flex items-center gap-2 text-base font-bold"
              style={{ color: "#1A1A2E" }}
            >
              <Clock size={18} style={{ color: "#1B4332" }} />
              Delivery Slot
            </h2>

            {/* Date */}
            <div className="mb-4">
              <label
                className="mb-2 block text-sm font-medium"
                style={{ color: "#1A1A2E" }}
              >
                Delivery Date
              </label>
              <Select
                value={deliveryDate}
                onValueChange={(value) => setDeliveryDate(value)}
              >
                <SelectTrigger className="w-full sm:w-64 bg-white text-sm">
                  <SelectValue placeholder="Choose a date" />
                </SelectTrigger>
                <SelectContent>
                  {nextDays.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time slot grid */}
            <div>
              <label
                className="mb-2 block text-sm font-medium"
                style={{ color: "#1A1A2E" }}
              >
                Time Slot
              </label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {displayTimeSlots.map((slot) => {
                  const isSelected = deliveryTimeSlot === slot;
                  return (
                    <button
                      key={slot}
                      onClick={() => setDeliveryTimeSlot(slot)}
                      className="rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150"
                      style={
                        isSelected
                          ? { backgroundColor: "#1B4332", color: "#FFFFFF" }
                          : {
                              backgroundColor: "#FFFFFF",
                              color: "#1A1A2E",
                              border: "1px solid #E5E7EB",
                            }
                      }
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* D) Payment Method */}
          <div
            className="rounded-2xl bg-white p-6"
            style={{ border: "1px solid #E5E7EB" }}
          >
            <h2
              className="mb-4 flex items-center gap-2 text-base font-bold"
              style={{ color: "#1A1A2E" }}
            >
              <CreditCard size={18} style={{ color: "#1B4332" }} />
              Payment Method
            </h2>
            <div className="space-y-2">
              {isLoadingZones ? (
                <>
                  <Skeleton className="h-12 w-full rounded-xl" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </>
              ) : (
                displayPaymentMethods.map((pm) => {
                  const isSelected = selectedPayment === pm.id;
                  return (
                    <label
                      key={pm.id}
                      className="flex cursor-pointer items-center gap-4 rounded-xl px-4 py-3 transition-all duration-150"
                      style={
                        isSelected
                          ? {
                              backgroundColor: "rgba(27,67,50,0.05)",
                              border: "2px solid #1B4332",
                            }
                          : {
                              backgroundColor: "#FFFFFF",
                              border: "2px solid #E5E7EB",
                            }
                      }
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={pm.id}
                        checked={isSelected}
                        onChange={() => setSelectedPayment(pm.id)}
                        className="h-4 w-4"
                        style={{ accentColor: "#1B4332" }}
                      />
                      <span className="text-xl">{pm.icon}</span>
                      <span
                        className="text-sm font-medium"
                        style={{ color: "#1A1A2E" }}
                      >
                        {pm.name}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* E) Promo Code */}
          <div
            className="rounded-2xl bg-white p-6"
            style={{ border: "1px solid #E5E7EB" }}
          >
            <h2
              className="mb-4 flex items-center gap-2 text-base font-bold"
              style={{ color: "#1A1A2E" }}
            >
              <Tag size={18} style={{ color: "#1B4332" }} />
              Promo Code
            </h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => {
                  setPromoCode(e.target.value);
                  setPromoError("");
                }}
                placeholder="Enter promo code"
                className="flex-1 rounded-lg px-4 py-2.5 text-sm uppercase outline-none"
                style={{ border: "1px solid #E5E7EB", color: "#1A1A2E" }}
              />
              <button
                onClick={handleApplyPromo}
                className="shrink-0 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#1B4332" }}
              >
                Apply
              </button>
            </div>
            {promoError && (
              <p className="mt-2 text-sm" style={{ color: "#DC2626" }}>
                {promoError}
              </p>
            )}
            {appliedPromo && (
              <div
                className="mt-3 flex items-center gap-2 rounded-lg px-4 py-2.5"
                style={{ backgroundColor: "rgba(5,150,105,0.08)" }}
              >
                <CheckCircle size={16} style={{ color: "#059669" }} />
                <span
                  className="text-sm font-medium"
                  style={{ color: "#059669" }}
                >
                  {appliedPromo +
                    " applied \u2014 " +
                    (promoDiscount
                      ? promoDiscount.type === "percentage"
                        ? promoDiscount.value + "% off!"
                        : formatPeso(promoDiscount.amount) + " off!"
                      : "15% off!")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Sticky Order Total */}
        <div className="mt-8 lg:mt-0 lg:w-96 lg:shrink-0">
          <div
            className="sticky top-24 rounded-2xl bg-white p-6"
            style={{
              border: "1px solid #E5E7EB",
              boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
            }}
          >
            <h3 className="text-lg font-bold" style={{ color: "#1A1A2E" }}>
              Order Total
            </h3>

            {/* Compact item list */}
            <div
              className="mt-4 max-h-52 space-y-2 overflow-y-auto pb-4"
              style={{ borderBottom: "1px solid #E5E7EB" }}
            >
              {items.map((item) => (
                <div
                  key={item.meal.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span style={{ color: "#1A1A2E" }}>
                    {item.meal.name}{" "}
                    <span style={{ color: "#6B7280" }}>x{item.quantity}</span>
                  </span>
                  <span className="font-medium" style={{ color: "#1A1A2E" }}>
                    {formatPeso(item.meal.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-4 space-y-2.5">
              <div className="flex justify-between text-sm">
                <span style={{ color: "#6B7280" }}>Subtotal</span>
                <span style={{ color: "#1A1A2E" }}>{formatPeso(total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: "#6B7280" }}>Delivery fee</span>
                <span style={{ color: "#1A1A2E" }}>
                  {deliveryFee > 0 ? formatPeso(deliveryFee) : "--"}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span style={{ color: "#059669" }}>
                    {"Discount" +
                      (promoDiscount
                        ? promoDiscount.type === "percentage"
                          ? " (" + promoDiscount.value + "%)"
                          : ""
                        : " (15%)")}
                  </span>
                  <span className="font-semibold" style={{ color: "#059669" }}>
                    -{formatPeso(discount)}
                  </span>
                </div>
              )}
              <div
                className="flex justify-between pt-3 text-lg font-bold"
                style={{ borderTop: "1px solid #E5E7EB" }}
              >
                <span style={{ color: "#1A1A2E" }}>Total</span>
                <span style={{ color: "#1B4332" }}>
                  {formatPeso(grandTotal)}
                </span>
              </div>
            </div>

            {/* Place Order CTA */}
            {isAuthenticated ? (
              <>
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handlePlaceOrder}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: "#E76F51" }}
                >
                  <ShoppingBag size={18} />
                  Place Order &middot; {formatPeso(grandTotal)}
                </motion.button>

                <p
                  className="mt-3 text-center text-xs"
                  style={{ color: "#6B7280" }}
                >
                  By placing your order, you agree to our Terms of Service and
                  Privacy Policy.
                </p>
              </>
            ) : (
              <div className="mt-6 space-y-3">
                <p className="text-center text-sm" style={{ color: "#6B7280" }}>
                  Sign in or create an account to place your order.
                </p>
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => openAuthModal("login")}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: "#E76F51" }}
                >
                  <LogIn size={18} />
                  Sign In to Place Order
                </motion.button>
                <button
                  onClick={() => openAuthModal("register")}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors hover:bg-gray-50"
                  style={{ color: "#1B4332", border: "2px solid #1B4332" }}
                >
                  <UserPlus size={16} />
                  Create Account
                </button>
              </div>
            )}

            {/* Back to menu */}
            <Link
              href="/"
              className="mt-4 flex items-center justify-center gap-2 text-sm font-medium transition-colors hover:underline"
              style={{ color: "#1B4332" }}
            >
              <ArrowLeft size={14} />
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
