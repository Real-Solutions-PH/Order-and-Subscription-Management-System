'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import { orders, formatPeso } from '@/lib/mock-data';
import { useToast } from '@/context/ToastContext';
import { useOrders } from '@/hooks';
import { Skeleton } from '@/components/ui/skeleton';

const timelineSteps = [
  { label: 'Placed', icon: Package, status: 'completed' as const },
  { label: 'Confirmed', icon: ClipboardCheck, status: 'completed' as const },
  { label: 'Preparing', icon: ChefHat, status: 'in-progress' as const },
  { label: 'Ready', icon: BoxSelect, status: 'pending' as const },
  { label: 'Delivering', icon: Truck, status: 'pending' as const },
  { label: 'Delivered', icon: CircleCheckBig, status: 'pending' as const },
];

export default function OrderConfirmationPage() {
  const { showToast } = useToast();
  const [showContent, setShowContent] = useState(false);

  const ordersQuery = useOrders({ limit: 1 });
  const isLoadingOrder = ordersQuery.isLoading;

  const apiOrder = ordersQuery.data?.items?.[0];
  const displayOrder = apiOrder ? {
    id: apiOrder.order_number,
    items: apiOrder.items.map(i => ({
      mealName: i.product_name,
      quantity: i.quantity,
      price: Number(i.unit_price),
    })),
    total: Number(apiOrder.total),
    status: apiOrder.status,
    deliveryDate: apiOrder.delivered_at ?? apiOrder.placed_at ?? '',
    deliverySlot: '',
    paymentMethod: '',
    address: '',
  } : orders[0];

  const order = displayOrder;

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 600);
    return () => clearTimeout(timer);
  }, []);

  const getStepColorClass = (status: 'completed' | 'in-progress' | 'pending') => {
    if (status === 'completed') return 'text-success';
    if (status === 'in-progress') return 'text-warning';
    return 'text-gray-300';
  };

  const getStepHex = (status: 'completed' | 'in-progress' | 'pending') => {
    if (status === 'completed') return '#059669';
    if (status === 'in-progress') return '#D97706';
    return '#D1D5DB';
  };

  const getLineColor = (index: number) => {
    if (index < 2) return '#059669';
    if (index === 2) return '#D97706';
    return '#E5E7EB';
  };

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {isLoadingOrder ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        ) : (
        <>
        {/* Success Animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
          className="flex flex-col items-center text-center mb-10"
        >
          <div className="pulse-success mb-6">
            <div className="w-24 h-24 rounded-full flex items-center justify-center bg-success-light">
              <CheckCircle size={56} className="text-success" strokeWidth={2} />
            </div>
          </div>
          <h1 className="font-display text-3xl md:text-4xl mb-2 text-text-primary">
            Order Placed Successfully!
          </h1>
          <p className="text-text-secondary text-lg">
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
              <p className="text-text-secondary text-sm mb-1">
                Order ID
              </p>
              <p className="text-xl font-semibold font-mono text-primary">
                {order.id}
              </p>
            </div>

            {/* Order Summary Card */}
            <div className="rounded-2xl p-6 mb-8 bg-surface-white border border-border shadow-card">
              <h2 className="text-lg font-semibold mb-4 text-text-primary">
                Order Summary
              </h2>
              <div className="space-y-3">
                {order.items.map((item, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between py-2 ${i < order.items.length - 1 ? 'border-b border-muted' : ''}`}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-text-primary">
                        {item.mealName}
                      </p>
                      <p className="text-sm text-text-secondary">
                        Qty: {item.quantity} x {formatPeso(item.price)}
                      </p>
                    </div>
                    <p className="font-semibold text-text-primary">
                      {formatPeso(item.quantity * item.price)}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t-2 border-border">
                <p className="text-lg font-semibold text-text-primary">
                  Total
                </p>
                <p className="text-xl font-bold text-primary">
                  {formatPeso(order.total)}
                </p>
              </div>
            </div>

            {/* Delivery Timeline Stepper */}
            <div className="rounded-2xl p-6 mb-8 bg-surface-white border border-border shadow-card">
              <h2 className="text-lg font-semibold mb-6 text-text-primary">
                Delivery Timeline
              </h2>
              <div className="flex items-start justify-between relative">
                {timelineSteps.map((step, i) => {
                  const Icon = step.icon;
                  const color = getStepHex(step.status);
                  const isInProgress = step.status === 'in-progress';
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
                            width: '100%',
                            height: '3px',
                            backgroundColor: getLineColor(i - 1),
                            zIndex: -1,
                          }}
                        />
                      )}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 border-2 ${step.status === 'pending' ? 'bg-muted' : ''}`}
                        style={{
                          backgroundColor: step.status === 'pending' ? undefined : `${color}20`,
                          borderColor: color,
                          animation: isInProgress ? 'pulse-success 2s ease-in-out infinite' : 'none',
                        }}
                      >
                        <Icon
                          size={18}
                          color={color}
                          strokeWidth={2}
                        />
                      </div>
                      <p className={`text-xs font-medium text-center ${step.status === 'pending' ? 'text-text-tertiary' : getStepColorClass(step.status)}`}>
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
                <button className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-white font-semibold transition-all hover:opacity-90 bg-primary">
                  Track My Order
                  <ArrowRight size={18} />
                </button>
              </Link>
              <button
                onClick={() => showToast('Receipt downloaded', 'success')}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold transition-all hover:bg-gray-50 text-primary border-2 border-primary bg-transparent"
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
              className="rounded-2xl p-6 relative overflow-hidden bg-gradient-brand"
            >
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={20} className="text-accent-light" />
                  <p className="text-sm font-semibold text-accent-light">
                    SUBSCRIBE & SAVE 15%
                  </p>
                </div>
                <h3 className="font-display text-xl font-bold text-white mb-2">
                  Love your meals? Get them every week.
                </h3>
                <p className="text-sm mb-4 text-success-light">
                  Love your meals? Get them every week and save 15% on every order.
                </p>
                <Link href="/meal-plan">
                  <button className="px-6 py-3 rounded-xl font-semibold transition-all hover:opacity-90 bg-accent text-white">
                    Start a Subscription
                  </button>
                </Link>
              </div>
              {/* Decorative circles */}
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-10 bg-surface-white" />
              <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full opacity-10 bg-surface-white" />
            </motion.div>
          </motion.div>
        )}
        </>
        )}
      </div>
    </div>
  );
}
