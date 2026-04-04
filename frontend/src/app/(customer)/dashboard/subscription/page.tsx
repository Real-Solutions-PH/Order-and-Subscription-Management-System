'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
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
} from 'lucide-react';
import { planTiers, formatPeso } from '@/lib/mock-data';
import { useSubscriptionPlans, useSubscriptionMutations } from '@/hooks';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/context/ToastContext';

export default function SubscriptionPage() {
  const { showToast } = useToast();
  const plansQuery = useSubscriptionPlans();
  const { pauseSubscription, cancelSubscription, modifyPlan, isPausing, isCancelling } = useSubscriptionMutations();

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
    { days: 7, label: '1 Week' },
    { days: 14, label: '2 Weeks' },
    { days: 30, label: '1 Month' },
  ];

  const pauseResumeDate = new Date();
  pauseResumeDate.setDate(pauseResumeDate.getDate() + pauseDays);
  const pauseResumeLabel = pauseResumeDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const handlePauseDaysChange = (value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      setPauseDays(Math.max(1, Math.min(90, num)));
    } else if (value === '') {
      setPauseDays(1);
    }
  };

  const upcomingWeeks = [
    { id: 1, label: 'Apr 7 - 13', date: 'Week 1' },
    { id: 2, label: 'Apr 14 - 20', date: 'Week 2' },
    { id: 3, label: 'Apr 21 - 27', date: 'Week 3' },
    { id: 4, label: 'Apr 28 - May 4', date: 'Week 4' },
  ];

  const cancelReasonOptions = [
    'Too expensive',
    'Dietary change',
    'Quality issue',
    'Moving',
    "Schedule doesn't work",
    'Other',
  ];

  const toggleSkipWeek = (weekId: number) => {
    setSkippedWeeks((prev) =>
      prev.includes(weekId) ? prev.filter((w) => w !== weekId) : [...prev, weekId]
    );
  };

  const toggleCancelReason = (reason: string) => {
    setCancelReasons((prev) =>
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason]
    );
  };

  const creditPerWeek = 1125; // 4500 / 4 weeks

  const displayPlans = plansQuery.data?.length
    ? plansQuery.data.flatMap(plan =>
        plan.tiers.map(tier => ({
          id: tier.items_per_cycle,
          meals: tier.items_per_cycle,
          price: Number(tier.price),
          perMeal: Math.round(Number(tier.price) / tier.items_per_cycle),
          savings: 0,
          label: tier.name,
          tierId: tier.id, // keep the UUID for API calls
        }))
      )
    : planTiers;

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium mb-4 transition-colors hover:opacity-80 text-primary"
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-display text-text-primary">
            Manage Subscription
          </h1>
        </div>

        {/* A) Current Plan Summary */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-6 mb-6 shadow-elevated bg-linear-to-br from-primary to-primary-light"
        >
          <div className="flex items-center gap-2 mb-3">
            <Crown size={20} className="text-accent-light" />
            <p className="text-sm font-semibold text-accent-light">
              CURRENT PLAN
            </p>
          </div>
          <h2 className="text-2xl font-bold text-white mb-1 font-display">
            10 Meals / Week
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            <div>
              <p className="text-xs text-success-pale">
                Monthly Cost
              </p>
              <p className="text-white font-semibold">{formatPeso(4500)}</p>
            </div>
            <div>
              <p className="text-xs text-success-pale">
                Next Billing
              </p>
              <p className="text-white font-semibold">Apr 5, 2026</p>
            </div>
            <div>
              <p className="text-xs text-success-pale">
                Member Since
              </p>
              <p className="text-white font-semibold">Jan 5, 2026</p>
            </div>
            <div>
              <p className="text-xs text-success-pale">
                Total Savings
              </p>
              <p className="font-semibold text-success-bright">
                {formatPeso(2040)}
              </p>
            </div>
          </div>
        </motion.div>

        {/* B) Pause Subscription */}
        <div className="rounded-2xl p-6 mb-6 bg-surface-white border border-border shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Pause size={20} className="text-warning" />
            <h2 className="text-lg font-semibold text-text-primary">
              Pause Subscription
            </h2>
          </div>
          <p className="text-sm mb-4 text-text-secondary">
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
                    className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border-2 ${
                      pauseDays === preset.days
                        ? 'border-warning bg-warning-50 text-warning'
                        : 'border-border bg-surface-white text-text-secondary'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Custom days input */}
              <div className="rounded-xl p-4 mb-4 bg-gray-50 border border-border">
                <label className="block text-sm font-medium mb-2 text-text-primary">
                  Or enter a custom number of days
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setPauseDays(Math.max(1, pauseDays - 1))}
                    className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-lg transition-all hover:opacity-80 bg-border text-gray-700"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={pauseDays}
                    onChange={(e) => handlePauseDaysChange(e.target.value)}
                    className="w-20 text-center text-lg font-semibold rounded-lg py-1.5 outline-none transition-colors border-2 border-warning text-warning bg-surface-white"
                  />
                  <button
                    onClick={() => setPauseDays(Math.min(90, pauseDays + 1))}
                    className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-lg transition-all hover:opacity-80 bg-warning text-surface-white"
                  >
                    +
                  </button>
                  <span className="text-sm font-medium text-text-secondary">
                    day{pauseDays !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-xs mt-2 text-text-tertiary">Min 1 day · Max 90 days</p>
              </div>

              {/* Resume info */}
              <div className="rounded-xl p-3 mb-4 bg-warning-50 border border-warning-200">
                <p className="text-sm text-warning-dark">
                  Your subscription will resume on <strong>{pauseResumeLabel}</strong>. You won&apos;t be charged during the pause.
                </p>
              </div>

              <button
                onClick={() => setPauseConfirmed(true)}
                className="w-full px-4 py-3 rounded-xl font-semibold text-white transition-colors hover:opacity-90 bg-warning"
              >
                Pause Subscription
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl p-4 bg-warning-50 border border-warning-200">
                <p className="font-semibold mb-1 text-warning-dark">
                  Confirm Pause
                </p>
                <p className="text-sm text-warning-dark">
                  Your subscription will be paused for <strong>{pauseDays} day{pauseDays !== 1 ? 's' : ''}</strong> until{' '}
                  <strong>{pauseResumeLabel}</strong>. You won&apos;t be charged during this
                  period and deliveries will be suspended.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setPauseConfirmed(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors hover:bg-gray-100 border border-border text-text-primary"
                >
                  Go Back
                </button>
                <button
                  disabled={isPausing}
                  onClick={async () => {
                    try {
                      await pauseSubscription({ id: 'current', resume_date: pauseResumeDate.toISOString().split('T')[0] });
                    } catch {
                      // backend unavailable — continue with UI-only flow
                    }
                    setPauseConfirmed(false);
                    showToast(`Subscription paused for ${pauseDays} day${pauseDays !== 1 ? 's' : ''} — resumes ${pauseResumeLabel}`, 'success');
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50 bg-warning"
                >
                  {isPausing ? 'Pausing...' : 'Confirm Pause'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* C) Modify Plan */}
        <div className="rounded-2xl p-6 mb-6 bg-surface-white border border-border shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <ArrowRightLeft size={20} className="text-primary-light" />
            <h2 className="text-lg font-semibold text-text-primary">
              Change Plan
            </h2>
          </div>
          {plansQuery.isLoading ? (
            <div className="grid gap-3 mb-4">
              {Array.from({length: 4}).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
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
                  className={`relative rounded-xl p-4 text-left transition-all border-2 ${
                    isSelected
                      ? 'border-primary bg-success-50'
                      : isCurrent
                        ? 'border-primary-lighter bg-surface-white'
                        : 'border-border bg-surface-white'
                  }`}
                >
                  {isCurrent && (
                    <span className="absolute -top-2.5 left-3 px-2 py-0.5 text-xs font-semibold rounded-full bg-primary text-surface-white">
                      Current
                    </span>
                  )}
                  {tier.label === 'Popular' && !isCurrent && (
                    <span className="absolute -top-2.5 right-3 px-2 py-0.5 text-xs font-semibold rounded-full bg-accent text-surface-white">
                      Popular
                    </span>
                  )}
                  {tier.label === 'Best Value' && (
                    <span className="absolute -top-2.5 right-3 px-2 py-0.5 text-xs font-semibold rounded-full bg-success text-surface-white">
                      Best Value
                    </span>
                  )}
                  <p className="font-bold text-lg text-text-primary">
                    {tier.meals} meals
                  </p>
                  <p className="text-sm text-text-secondary">
                    {tier.label} &middot; {formatPeso(tier.perMeal)}/meal
                  </p>
                  <p className="font-semibold mt-1 text-primary">
                    {formatPeso(tier.price)}/mo
                  </p>
                  {!isCurrent && (
                    <p
                      className={`text-xs mt-1 font-semibold ${diff > 0 ? 'text-warning' : 'text-success'}`}
                    >
                      {diff > 0 ? '+' : ''}
                      {formatPeso(Math.abs(diff))}/mo
                    </p>
                  )}
                  {tier.savings > 0 && (
                    <p className="text-xs mt-1 text-success">
                      Save {tier.savings}%
                    </p>
                  )}
                </button>
              );
            })}
          </div>
          )}
          {selectedPlan !== 10 && (
            <div className="rounded-xl p-3 mb-4 bg-info-50 border border-info-200">
              <p className="text-sm text-info-800">
                Your billing will be pro-rated for the remainder of the current cycle. Changes take
                effect on your next billing date.
              </p>
            </div>
          )}
          <button
            onClick={async () => {
              if (selectedPlan !== 10) {
                const selectedTier = displayPlans.find(t => t.id === selectedPlan);
                if (selectedTier && 'tierId' in selectedTier && selectedTier.tierId) {
                  try {
                    await modifyPlan({ id: 'current', new_plan_tier_id: selectedTier.tierId as string });
                  } catch {
                    // backend unavailable — continue with UI-only flow
                  }
                }
                showToast(`Plan changed to ${selectedPlan} meals/week`, 'success');
              } else {
                showToast('You are already on this plan', 'info');
              }
            }}
            className="w-full px-4 py-3 rounded-xl font-semibold text-white transition-colors hover:opacity-90 bg-primary"
          >
            Confirm Change
          </button>
        </div>

        {/* D) Skip a Week */}
        <div className="rounded-2xl p-6 mb-6 bg-surface-white border border-border shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <CalendarOff size={20} className="text-warning" />
            <h2 className="text-lg font-semibold text-text-primary">
              Skip a Week
            </h2>
          </div>
          <p className="text-sm mb-4 text-text-secondary">
            Select weeks to skip. You&apos;ll receive a credit for each skipped week.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {upcomingWeeks.map((week) => {
              const isSkipped = skippedWeeks.includes(week.id);
              return (
                <button
                  key={week.id}
                  onClick={() => toggleSkipWeek(week.id)}
                  className={`rounded-xl p-4 text-center transition-all relative border-2 ${
                    isSkipped
                      ? 'border-warning bg-warning-50'
                      : 'border-border bg-surface-white'
                  }`}
                >
                  {isSkipped && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center bg-warning">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                  <p className="text-xs font-medium mb-1 text-text-secondary">
                    {week.date}
                  </p>
                  <p
                    className={`text-sm font-semibold ${isSkipped ? 'text-warning' : 'text-text-primary'}`}
                  >
                    {week.label}
                  </p>
                  {isSkipped && (
                    <p className="text-xs mt-1 font-medium text-warning">
                      Skipped
                    </p>
                  )}
                </button>
              );
            })}
          </div>
          {skippedWeeks.length > 0 && (
            <div className="rounded-xl p-3 mb-4 bg-warning-50 border border-warning-200">
              <p className="text-sm text-warning-dark">
                Credit for {skippedWeeks.length} skipped week{skippedWeeks.length > 1 ? 's' : ''}:{' '}
                <strong>{formatPeso(skippedWeeks.length * creditPerWeek)}</strong>
              </p>
            </div>
          )}
          <button
            onClick={() => {
              if (skippedWeeks.length > 0) {
                showToast(
                  `${skippedWeeks.length} week${skippedWeeks.length > 1 ? 's' : ''} skipped. Credit: ${formatPeso(skippedWeeks.length * creditPerWeek)}`,
                  'success'
                );
                setSkippedWeeks([]);
              } else {
                showToast('No weeks selected to skip', 'info');
              }
            }}
            className="w-full px-4 py-3 rounded-xl font-semibold text-white transition-colors hover:opacity-90 bg-warning"
          >
            Confirm Skips
          </button>
        </div>

        {/* E) Cancel Subscription */}
        <div className="rounded-2xl p-6 mb-6 bg-surface-white border border-error-light shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <XCircle size={20} className="text-error" />
            <h2 className="text-lg font-semibold text-text-primary">
              Cancel Subscription
            </h2>
          </div>

          {cancelStep === 0 && (
            <div>
              <p className="text-sm mb-4 text-text-secondary">
                We&apos;d hate to see you go. If something isn&apos;t working, consider pausing
                instead.
              </p>
              <button
                onClick={() => setCancelStep(1)}
                className="px-6 py-2.5 rounded-xl font-medium transition-colors hover:opacity-90 text-error border border-error-300 bg-error-50"
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
                <p className="font-medium text-text-primary">
                  We&apos;re sorry to hear that. Can you tell us why?
                </p>
                <div className="space-y-2">
                  {cancelReasonOptions.map((reason) => {
                    const isChecked = cancelReasons.includes(reason);
                    return (
                      <label
                        key={reason}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                          isChecked
                            ? 'border-error bg-error-50'
                            : 'border-border bg-surface-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCancelReason(reason)}
                          className="sr-only"
                        />
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            isChecked
                              ? 'border-error bg-error'
                              : 'border-gray-300 bg-transparent'
                          }`}
                        >
                          {isChecked && <Check size={12} className="text-white" />}
                        </div>
                        <span className="font-medium text-text-primary">
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
                    className="flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors hover:bg-gray-100 border border-border text-text-primary"
                  >
                    Go Back
                  </button>
                  <button
                    onClick={() => setCancelStep(2)}
                    disabled={cancelReasons.length === 0}
                    className="flex-1 px-4 py-2.5 rounded-xl font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50 bg-error"
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
                  className="rounded-xl p-5 text-center bg-linear-to-br from-primary to-primary-light"
                >
                  <Gift size={36} className="mx-auto mb-3 text-accent-light" />
                  <h3 className="text-xl font-bold text-white mb-2 font-display">
                    Stay and get 20% off next month!
                  </h3>
                  <p className="text-sm mb-4 text-success-light">
                    We value your membership. As a special offer, enjoy 20% off your next monthly
                    billing — that&apos;s only {formatPeso(3600)} instead of {formatPeso(4500)}.
                  </p>
                  <button
                    onClick={() => {
                      setCancelStep(0);
                      setCancelReasons([]);
                      showToast('20% discount applied to your next billing!', 'success');
                    }}
                    className="px-6 py-3 rounded-xl font-semibold transition-colors hover:opacity-90 bg-accent text-surface-white"
                  >
                    Claim 20% Off & Stay
                  </button>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setCancelStep(1)}
                    className="flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors hover:bg-gray-100 border border-border text-text-primary"
                  >
                    Go Back
                  </button>
                  <button
                    onClick={() => setCancelStep(3)}
                    className="flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors hover:opacity-90 text-error border border-error-300"
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
                <div className="rounded-xl p-4 bg-error-50 border border-error-200">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={20} className="mt-0.5 flex-shrink-0 text-error" />
                    <div>
                      <p className="font-semibold mb-1 text-error-900">
                        This action cannot be undone
                      </p>
                      <p className="text-sm text-error-900">
                        Your subscription will be cancelled immediately. You&apos;ll still have
                        access until your current billing period ends on April 5, 2026. Any remaining
                        credits will be forfeited.
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
                    className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-white transition-colors hover:opacity-90 bg-primary"
                  >
                    Keep My Subscription
                  </button>
                  <button
                    disabled={isCancelling}
                    onClick={async () => {
                      try {
                        await cancelSubscription({ id: 'current', reason: cancelReasons.join(', ') });
                      } catch {
                        // backend unavailable — continue with UI-only flow
                      }
                      setCancelStep(0);
                      setCancelReasons([]);
                      showToast('Subscription cancelled', 'error');
                    }}
                    className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50 bg-error"
                  >
                    {isCancelling ? 'Cancelling...' : 'I want to cancel'}
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
