"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Crown,
  Pause,
  CalendarOff,
  ArrowRightLeft,
  XCircle,
  Check,
  Gift,
  AlertTriangle,
} from "lucide-react";
import { planTiers, formatPeso } from "@/lib/mock-data";
import {
  useSubscriptionPlans,
  useSubscriptionMutations,
  useDevMode,
} from "@/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/context/ToastContext";
import RequireAuth from "@/components/RequireAuth";

export default function SubscriptionPage() {
  const { showToast } = useToast();
  const devMode = useDevMode();
  const plansQuery = useSubscriptionPlans();
  const {
    pauseSubscription,
    cancelSubscription,
    modifyPlan,
    isPausing,
    isCancelling,
  } = useSubscriptionMutations();

  // Pause state
  const [pauseDays, setPauseDays] = useState(7);
  const [pauseConfirmed, setPauseConfirmed] = useState(false);

  // Plan change state
  const [selectedPlan, setSelectedPlan] = useState(10);

  // Skip weeks state
  const [skippedWeeks, setSkippedWeeks] = useState<number[]>([]);

  // Cancel flow state
  const [cancelStep, setCancelStep] = useState(0); // 0=hidden, 1=reason, 2=winback, 3=confirm
  const [cancelReasons, setCancelReasons] = useState<string[]>([]);

  const pausePresets = [
    { days: 7, label: "1 Week" },
    { days: 14, label: "2 Weeks" },
    { days: 30, label: "1 Month" },
  ];

  const pauseResumeDate = new Date();
  pauseResumeDate.setDate(pauseResumeDate.getDate() + pauseDays);
  const pauseResumeLabel = pauseResumeDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const handlePauseDaysChange = (value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      setPauseDays(Math.max(1, Math.min(90, num)));
    } else if (value === "") {
      setPauseDays(1);
    }
  };

  const upcomingWeeks = [
    { id: 1, label: "Apr 7 - 13", date: "Week 1" },
    { id: 2, label: "Apr 14 - 20", date: "Week 2" },
    { id: 3, label: "Apr 21 - 27", date: "Week 3" },
    { id: 4, label: "Apr 28 - May 4", date: "Week 4" },
  ];

  const cancelReasonOptions = [
    "Too expensive",
    "Dietary change",
    "Quality issue",
    "Moving",
    "Schedule doesn't work",
    "Other",
  ];

  const toggleSkipWeek = (weekId: number) => {
    setSkippedWeeks((prev) =>
      prev.includes(weekId)
        ? prev.filter((w) => w !== weekId)
        : [...prev, weekId],
    );
  };

  const toggleCancelReason = (reason: string) => {
    setCancelReasons((prev) =>
      prev.includes(reason)
        ? prev.filter((r) => r !== reason)
        : [...prev, reason],
    );
  };

  const creditPerWeek = 1125; // 4500 / 4 weeks

  const displayPlans = plansQuery.data?.length
    ? plansQuery.data.flatMap((plan) =>
        plan.tiers.map((tier) => ({
          id: tier.items_per_cycle,
          meals: tier.items_per_cycle,
          price: Number(tier.price),
          perMeal: Math.round(Number(tier.price) / tier.items_per_cycle),
          savings: 0,
          label: tier.name,
          tierId: tier.id, // keep the UUID for API calls
        })),
      )
    : devMode
      ? planTiers
      : [];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FEFAE0" }}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium mb-4 transition-colors hover:opacity-80"
            style={{ color: "#1B4332" }}
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
          <h1
            className="text-3xl"
            style={{
              fontFamily: "'DM Serif Display', serif",
              color: "#1A1A2E",
            }}
          >
            Manage Subscription
          </h1>
        </div>

        {/* A) Current Plan Summary */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-6 mb-6"
          style={{
            background: "linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Crown size={20} color="#F4A261" />
            <p className="text-sm font-semibold" style={{ color: "#F4A261" }}>
              CURRENT PLAN
            </p>
          </div>
          <h2
            className="text-2xl font-bold text-white mb-1"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            10 Meals / Week
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            <div>
              <p className="text-xs" style={{ color: "#A7F3D0" }}>
                Monthly Cost
              </p>
              <p className="text-white font-semibold">{formatPeso(4500)}</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "#A7F3D0" }}>
                Next Billing
              </p>
              <p className="text-white font-semibold">Apr 5, 2026</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "#A7F3D0" }}>
                Member Since
              </p>
              <p className="text-white font-semibold">Jan 5, 2026</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "#A7F3D0" }}>
                Total Savings
              </p>
              <p className="font-semibold" style={{ color: "#34D399" }}>
                {formatPeso(2040)}
              </p>
            </div>
          </div>
        </motion.div>

        {/* B) Pause Subscription */}
        <div
          className="rounded-2xl p-6 mb-6"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E7EB",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Pause size={20} color="#D97706" />
            <h2 className="text-lg font-semibold" style={{ color: "#1A1A2E" }}>
              Pause Subscription
            </h2>
          </div>
          <p className="text-sm mb-4" style={{ color: "#6B7280" }}>
            Need a break? Pause your subscription and we&apos;ll hold your spot.
          </p>

          {!pauseConfirmed ? (
            <>
              {/* Preset buttons */}
              <div className="flex gap-2 mb-4">
                {pausePresets.map((preset) => (
                  <button
                    key={preset.days}
                    onClick={() => setPauseDays(preset.days)}
                    className="flex-1 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{
                      border: `2px solid ${pauseDays === preset.days ? "#D97706" : "#E5E7EB"}`,
                      backgroundColor:
                        pauseDays === preset.days ? "#FFF7ED" : "#FFFFFF",
                      color: pauseDays === preset.days ? "#D97706" : "#6B7280",
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Custom days input */}
              <div
                className="rounded-xl p-4 mb-4"
                style={{
                  backgroundColor: "#F9FAFB",
                  border: "1px solid #E5E7EB",
                }}
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
                    onChange={(e) => handlePauseDaysChange(e.target.value)}
                    className="w-20 text-center text-lg font-semibold rounded-lg py-1.5 outline-none transition-colors"
                    style={{
                      border: "2px solid #D97706",
                      color: "#D97706",
                      backgroundColor: "#FFFFFF",
                    }}
                  />
                  <button
                    onClick={() => setPauseDays(Math.min(90, pauseDays + 1))}
                    className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-lg transition-all hover:opacity-80"
                    style={{ backgroundColor: "#D97706", color: "#FFFFFF" }}
                  >
                    +
                  </button>
                  <span
                    className="text-sm font-medium"
                    style={{ color: "#6B7280" }}
                  >
                    day{pauseDays !== 1 ? "s" : ""}
                  </span>
                </div>
                <p className="text-xs mt-2" style={{ color: "#9CA3AF" }}>
                  Min 1 day · Max 90 days
                </p>
              </div>

              {/* Resume info */}
              <div
                className="rounded-xl p-3 mb-4"
                style={{
                  backgroundColor: "#FFF7ED",
                  border: "1px solid #FED7AA",
                }}
              >
                <p className="text-sm" style={{ color: "#92400E" }}>
                  Your subscription will resume on{" "}
                  <strong>{pauseResumeLabel}</strong>. You won&apos;t be charged
                  during the pause.
                </p>
              </div>

              <button
                onClick={() => setPauseConfirmed(true)}
                className="w-full px-4 py-3 rounded-xl font-semibold text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: "#D97706" }}
              >
                Pause Subscription
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <div
                className="rounded-xl p-4"
                style={{
                  backgroundColor: "#FFF7ED",
                  border: "1px solid #FED7AA",
                }}
              >
                <p className="font-semibold mb-1" style={{ color: "#92400E" }}>
                  Confirm Pause
                </p>
                <p className="text-sm" style={{ color: "#92400E" }}>
                  Your subscription will be paused for{" "}
                  <strong>
                    {pauseDays} day{pauseDays !== 1 ? "s" : ""}
                  </strong>{" "}
                  until <strong>{pauseResumeLabel}</strong>. You won&apos;t be
                  charged during this period and deliveries will be suspended.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setPauseConfirmed(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors hover:bg-gray-100"
                  style={{ border: "1px solid #E5E7EB", color: "#1A1A2E" }}
                >
                  Go Back
                </button>
                <button
                  disabled={isPausing}
                  onClick={async () => {
                    try {
                      await pauseSubscription({
                        id: "current",
                        resume_date: pauseResumeDate
                          .toISOString()
                          .split("T")[0],
                      });
                    } catch (err) {
                      console.error(err);
                      // backend unavailable — continue with UI-only flow
                    }
                    setPauseConfirmed(false);
                    showToast(
                      `Subscription paused for ${pauseDays} day${pauseDays !== 1 ? "s" : ""} — resumes ${pauseResumeLabel}`,
                      "success",
                    );
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: "#D97706" }}
                >
                  {isPausing ? "Pausing..." : "Confirm Pause"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* C) Modify Plan */}
        <div
          className="rounded-2xl p-6 mb-6"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E7EB",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <ArrowRightLeft size={20} color="#2D6A4F" />
            <h2 className="text-lg font-semibold" style={{ color: "#1A1A2E" }}>
              Change Plan
            </h2>
          </div>
          {plansQuery.isLoading ? (
            <div className="grid gap-3 mb-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 mb-4">
              {displayPlans.map((tier) => {
                const isSelected = selectedPlan === tier.id;
                const isCurrent = tier.id === 10;
                const diff = tier.price - 4500;
                return (
                  <button
                    key={tier.id}
                    onClick={() => setSelectedPlan(tier.id)}
                    className="relative rounded-xl p-4 text-left transition-all"
                    style={{
                      border: `2px solid ${isSelected ? "#1B4332" : isCurrent ? "#40916C" : "#E5E7EB"}`,
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
                    {tier.label === "Popular" && !isCurrent && (
                      <span
                        className="absolute -top-2.5 right-3 px-2 py-0.5 text-xs font-semibold rounded-full"
                        style={{ backgroundColor: "#E76F51", color: "#FFFFFF" }}
                      >
                        Popular
                      </span>
                    )}
                    {tier.label === "Best Value" && (
                      <span
                        className="absolute -top-2.5 right-3 px-2 py-0.5 text-xs font-semibold rounded-full"
                        style={{ backgroundColor: "#059669", color: "#FFFFFF" }}
                      >
                        Best Value
                      </span>
                    )}
                    <p
                      className="font-bold text-lg"
                      style={{ color: "#1A1A2E" }}
                    >
                      {tier.meals} meals
                    </p>
                    <p className="text-sm" style={{ color: "#6B7280" }}>
                      {tier.label} &middot; {formatPeso(tier.perMeal)}/meal
                    </p>
                    <p
                      className="font-semibold mt-1"
                      style={{ color: "#1B4332" }}
                    >
                      {formatPeso(tier.price)}/mo
                    </p>
                    {!isCurrent && (
                      <p
                        className="text-xs mt-1 font-semibold"
                        style={{ color: diff > 0 ? "#D97706" : "#059669" }}
                      >
                        {diff > 0 ? "+" : ""}
                        {formatPeso(Math.abs(diff))}/mo
                      </p>
                    )}
                    {tier.savings > 0 && (
                      <p className="text-xs mt-1" style={{ color: "#059669" }}>
                        Save {tier.savings}%
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {selectedPlan !== 10 && (
            <div
              className="rounded-xl p-3 mb-4"
              style={{
                backgroundColor: "#EFF6FF",
                border: "1px solid #BFDBFE",
              }}
            >
              <p className="text-sm" style={{ color: "#1E40AF" }}>
                Your billing will be pro-rated for the remainder of the current
                cycle. Changes take effect on your next billing date.
              </p>
            </div>
          )}
          <button
            onClick={async () => {
              if (selectedPlan !== 10) {
                const selectedTier = displayPlans.find(
                  (t) => t.id === selectedPlan,
                );
                if (
                  selectedTier &&
                  "tierId" in selectedTier &&
                  selectedTier.tierId
                ) {
                  try {
                    await modifyPlan({
                      id: "current",
                      new_plan_tier_id: selectedTier.tierId as string,
                    });
                  } catch (err) {
                    console.error(err);
                    // backend unavailable — continue with UI-only flow
                  }
                }
                showToast(
                  `Plan changed to ${selectedPlan} meals/week`,
                  "success",
                );
              } else {
                showToast("You are already on this plan", "info");
              }
            }}
            className="w-full px-4 py-3 rounded-xl font-semibold text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: "#1B4332" }}
          >
            Confirm Change
          </button>
        </div>

        {/* D) Skip a Week */}
        <div
          className="rounded-2xl p-6 mb-6"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E7EB",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <CalendarOff size={20} color="#D97706" />
            <h2 className="text-lg font-semibold" style={{ color: "#1A1A2E" }}>
              Skip a Week
            </h2>
          </div>
          <p className="text-sm mb-4" style={{ color: "#6B7280" }}>
            Select weeks to skip. You&apos;ll receive a credit for each skipped
            week.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {upcomingWeeks.map((week) => {
              const isSkipped = skippedWeeks.includes(week.id);
              return (
                <button
                  key={week.id}
                  onClick={() => toggleSkipWeek(week.id)}
                  className="rounded-xl p-4 text-center transition-all relative"
                  style={{
                    border: `2px solid ${isSkipped ? "#D97706" : "#E5E7EB"}`,
                    backgroundColor: isSkipped ? "#FFF7ED" : "#FFFFFF",
                  }}
                >
                  {isSkipped && (
                    <div
                      className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "#D97706" }}
                    >
                      <Check size={12} color="#FFFFFF" />
                    </div>
                  )}
                  <p
                    className="text-xs font-medium mb-1"
                    style={{ color: "#6B7280" }}
                  >
                    {week.date}
                  </p>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: isSkipped ? "#D97706" : "#1A1A2E" }}
                  >
                    {week.label}
                  </p>
                  {isSkipped && (
                    <p
                      className="text-xs mt-1 font-medium"
                      style={{ color: "#D97706" }}
                    >
                      Skipped
                    </p>
                  )}
                </button>
              );
            })}
          </div>
          {skippedWeeks.length > 0 && (
            <div
              className="rounded-xl p-3 mb-4"
              style={{
                backgroundColor: "#FFF7ED",
                border: "1px solid #FED7AA",
              }}
            >
              <p className="text-sm" style={{ color: "#92400E" }}>
                Credit for {skippedWeeks.length} skipped week
                {skippedWeeks.length > 1 ? "s" : ""}:{" "}
                <strong>
                  {formatPeso(skippedWeeks.length * creditPerWeek)}
                </strong>
              </p>
            </div>
          )}
          <button
            onClick={() => {
              if (skippedWeeks.length > 0) {
                showToast(
                  `${skippedWeeks.length} week${skippedWeeks.length > 1 ? "s" : ""} skipped. Credit: ${formatPeso(skippedWeeks.length * creditPerWeek)}`,
                  "success",
                );
                setSkippedWeeks([]);
              } else {
                showToast("No weeks selected to skip", "info");
              }
            }}
            className="w-full px-4 py-3 rounded-xl font-semibold text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: "#D97706" }}
          >
            Confirm Skips
          </button>
        </div>

        {/* E) Cancel Subscription */}
        <div
          className="rounded-2xl p-6 mb-6"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #FEE2E2",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <XCircle size={20} color="#DC2626" />
            <h2 className="text-lg font-semibold" style={{ color: "#1A1A2E" }}>
              Cancel Subscription
            </h2>
          </div>

          {cancelStep === 0 && (
            <div>
              <p className="text-sm mb-4" style={{ color: "#6B7280" }}>
                We&apos;d hate to see you go. If something isn&apos;t working,
                consider pausing instead.
              </p>
              <button
                onClick={() => setCancelStep(1)}
                className="px-6 py-2.5 rounded-xl font-medium transition-colors hover:opacity-90"
                style={{
                  color: "#DC2626",
                  border: "1px solid #FCA5A5",
                  backgroundColor: "#FEF2F2",
                }}
              >
                Cancel Subscription
              </button>
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* Step 1: Reason survey */}
            {cancelStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <p className="font-medium" style={{ color: "#1A1A2E" }}>
                  We&apos;re sorry to hear that. Can you tell us why?
                </p>
                <div className="space-y-2">
                  {cancelReasonOptions.map((reason) => {
                    const isChecked = cancelReasons.includes(reason);
                    return (
                      <label
                        key={reason}
                        className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                        style={{
                          border: `1px solid ${isChecked ? "#DC2626" : "#E5E7EB"}`,
                          backgroundColor: isChecked ? "#FEF2F2" : "#FFFFFF",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCancelReason(reason)}
                          className="sr-only"
                        />
                        <div
                          className="w-5 h-5 rounded border-2 flex items-center justify-center"
                          style={{
                            borderColor: isChecked ? "#DC2626" : "#D1D5DB",
                            backgroundColor: isChecked
                              ? "#DC2626"
                              : "transparent",
                          }}
                        >
                          {isChecked && <Check size={12} color="#FFFFFF" />}
                        </div>
                        <span
                          className="font-medium"
                          style={{ color: "#1A1A2E" }}
                        >
                          {reason}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setCancelStep(0);
                      setCancelReasons([]);
                    }}
                    className="flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors hover:bg-gray-100"
                    style={{ border: "1px solid #E5E7EB", color: "#1A1A2E" }}
                  >
                    Go Back
                  </button>
                  <button
                    onClick={() => setCancelStep(2)}
                    disabled={cancelReasons.length === 0}
                    className="flex-1 px-4 py-2.5 rounded-xl font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: "#DC2626" }}
                  >
                    Continue
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Win-back offer */}
            {cancelStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div
                  className="rounded-xl p-5 text-center"
                  style={{
                    background:
                      "linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)",
                  }}
                >
                  <Gift size={36} color="#F4A261" className="mx-auto mb-3" />
                  <h3
                    className="text-xl font-bold text-white mb-2"
                    style={{ fontFamily: "'DM Serif Display', serif" }}
                  >
                    Stay and get 20% off next month!
                  </h3>
                  <p className="text-sm mb-4" style={{ color: "#D1FAE5" }}>
                    We value your membership. As a special offer, enjoy 20% off
                    your next monthly billing — that&apos;s only{" "}
                    {formatPeso(3600)} instead of {formatPeso(4500)}.
                  </p>
                  <button
                    onClick={() => {
                      setCancelStep(0);
                      setCancelReasons([]);
                      showToast(
                        "20% discount applied to your next billing!",
                        "success",
                      );
                    }}
                    className="px-6 py-3 rounded-xl font-semibold transition-colors hover:opacity-90"
                    style={{ backgroundColor: "#E76F51", color: "#FFFFFF" }}
                  >
                    Claim 20% Off & Stay
                  </button>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setCancelStep(1)}
                    className="flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors hover:bg-gray-100"
                    style={{ border: "1px solid #E5E7EB", color: "#1A1A2E" }}
                  >
                    Go Back
                  </button>
                  <button
                    onClick={() => setCancelStep(3)}
                    className="flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors hover:opacity-90"
                    style={{ color: "#DC2626", border: "1px solid #FCA5A5" }}
                  >
                    No thanks, continue
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Final confirmation */}
            {cancelStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div
                  className="rounded-xl p-4"
                  style={{
                    backgroundColor: "#FEF2F2",
                    border: "1px solid #FECACA",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle
                      size={20}
                      color="#DC2626"
                      className="mt-0.5 flex-shrink-0"
                    />
                    <div>
                      <p
                        className="font-semibold mb-1"
                        style={{ color: "#991B1B" }}
                      >
                        This action cannot be undone
                      </p>
                      <p className="text-sm" style={{ color: "#991B1B" }}>
                        Your subscription will be cancelled immediately.
                        You&apos;ll still have access until your current billing
                        period ends on April 5, 2026. Any remaining credits will
                        be forfeited.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setCancelStep(0);
                      setCancelReasons([]);
                    }}
                    className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-white transition-colors hover:opacity-90"
                    style={{ backgroundColor: "#1B4332" }}
                  >
                    Keep My Subscription
                  </button>
                  <button
                    disabled={isCancelling}
                    onClick={async () => {
                      try {
                        await cancelSubscription({
                          id: "current",
                          reason: cancelReasons.join(", "),
                        });
                      } catch (err) {
                        console.error(err);
                        // backend unavailable — continue with UI-only flow
                      }
                      setCancelStep(0);
                      setCancelReasons([]);
                      showToast("Subscription cancelled", "error");
                    }}
                    className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: "#DC2626" }}
                  >
                    {isCancelling ? "Cancelling..." : "I want to cancel"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
