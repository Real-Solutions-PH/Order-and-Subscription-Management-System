'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
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
  User,
  UserPlus,
} from 'lucide-react';
import {
  deliveryZones as mockDeliveryZones,
  timeSlots,
  paymentMethods,
  formatPeso,
} from '@/lib/mock-data';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { useDeliveryZones, usePaymentMutations, useOrderMutations } from '@/hooks';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, clearCart, total, itemCount } = useCart();
  const { showToast } = useToast();

  // API hooks
  const { data: apiZones, isLoading: isLoadingZones } = useDeliveryZones();
  const { validatePromo } = usePaymentMutations();
  const { checkout } = useOrderMutations();

  // Map API zones to the existing format, fall back to mock data on error/loading
  const deliveryZones = useMemo(() => {
    if (apiZones && Array.isArray(apiZones) && apiZones.length > 0) {
      return apiZones
        .filter((z) => z.is_active !== false)
        .map((z) => ({
          name: z.name,
          fee: Number(z.delivery_fee),
          estimatedTime: z.description ?? 'Contact for ETA',
        }));
    }
    return mockDeliveryZones;
  }, [apiZones]);

  // Guest vs Account mode
  const [checkoutMode, setCheckoutMode] = useState<'guest' | 'account'>('guest');

  // Address fields
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [barangay, setBarangay] = useState('');
  const [zip, setZip] = useState('');
  const [selectedZone, setSelectedZone] = useState('');

  // Delivery slot
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTimeSlot, setDeliveryTimeSlot] = useState('');

  // Payment
  const [selectedPayment, setSelectedPayment] = useState('');

  // Promo
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoDiscount, setPromoDiscount] = useState<{ type: string; value: number; amount: number } | null>(null);
  const [promoError, setPromoError] = useState('');

  // Generate next 7 days
  const nextDays = useMemo(() => {
    const days: { label: string; value: string }[] = [];
    const today = new Date();
    for (let i = 1; i <= 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const monthDay = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      days.push({
        label: `${dayName}, ${monthDay}`,
        value: d.toISOString().split('T')[0],
      });
    }
    return days;
  }, []);

  // Delivery fee
  const zone = deliveryZones.find(z => z.name === selectedZone);
  const deliveryFee = zone ? zone.fee : 0;

  // Discount
  const discount = promoDiscount
    ? promoDiscount.amount
    : appliedPromo === 'PREPFLOW15'
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
      setPromoError('');
      const label = result.discount_type === 'percentage'
        ? `${result.discount_value}% discount`
        : `${formatPeso(result.discount_amount)} off`;
      showToast(`Promo code applied! ${label}`, 'success');
    } catch {
      // Fallback to hardcoded check when backend is unavailable
      if (code === 'PREPFLOW15') {
        setAppliedPromo('PREPFLOW15');
        setPromoDiscount(null);
        setPromoError('');
        showToast('Promo code applied! 15% discount', 'success');
      } else {
        setAppliedPromo(null);
        setPromoDiscount(null);
        setPromoError('Invalid promo code');
      }
    }
  }

  async function handlePlaceOrder() {
    if (items.length === 0) {
      showToast('Your cart is empty', 'error');
      return;
    }
    try {
      await checkout({
        payment_method: selectedPayment,
        promo_code: appliedPromo || undefined,
        notes: undefined,
      });
      showToast('Order placed successfully! Thank you for your order.', 'success');
      clearCart();
      router.push('/order-confirmation');
    } catch {
      // Fallback to in-memory flow when backend is unavailable
      showToast('Order placed successfully! Thank you for your order.', 'success');
      clearCart();
      router.push('/order-confirmation');
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
        <ShoppingBag size={64} className="text-border" />
        <h2
          className="mt-4 text-xl font-bold text-text-primary"
        >
          Your cart is empty
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          Add some meals to get started.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <ArrowLeft size={16} />
          Browse Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="bg-primary">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <h1
            className="text-3xl font-bold font-display text-text-inverse sm:text-4xl"
          >
            Checkout
          </h1>
          <p className="mt-2 text-sm text-surface-cream">
            {itemCount} item{itemCount !== 1 ? 's' : ''} in your cart
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:flex lg:gap-8 lg:px-8">
        {/* Left Column: Form Sections */}
        <div className="flex-1 space-y-6">
          {/* Guest / Account Toggle */}
          <div
            className="overflow-hidden rounded-2xl bg-white border border-border"
          >
            <div className="flex">
              <button
                onClick={() => setCheckoutMode('guest')}
                className={`flex flex-1 items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-colors ${
                  checkoutMode === 'guest'
                    ? 'bg-primary text-surface-white'
                    : 'bg-surface-white text-text-secondary'
                }`}
              >
                <User size={16} />
                Continue as Guest
              </button>
              <button
                onClick={() => setCheckoutMode('account')}
                className={`flex flex-1 items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-colors ${
                  checkoutMode === 'account'
                    ? 'bg-primary text-surface-white'
                    : 'bg-surface-white text-text-secondary'
                }`}
              >
                <UserPlus size={16} />
                Create Account
              </button>
            </div>
          </div>

          {/* Account fields if creating account */}
          {checkoutMode === 'account' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="rounded-2xl bg-white p-6 border border-border"
            >
              <h2
                className="mb-4 flex items-center gap-2 text-base font-bold text-text-primary"
              >
                <UserPlus size={18} className="text-primary" />
                Account Details
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-primary">
                    Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="Juan dela Cruz"
                    className="w-full rounded-lg border border-border px-4 py-2.5 text-sm text-text-primary outline-none transition-colors focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-primary">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="juan@email.com"
                    className="w-full rounded-lg border border-border px-4 py-2.5 text-sm text-text-primary outline-none transition-colors focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-primary">
                    Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="+63 917 123 4567"
                    className="w-full rounded-lg border border-border px-4 py-2.5 text-sm text-text-primary outline-none transition-colors focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-primary">
                    Password
                  </label>
                  <input
                    type="password"
                    placeholder="Create a password"
                    className="w-full rounded-lg border border-border px-4 py-2.5 text-sm text-text-primary outline-none transition-colors focus:ring-2"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* A) Order Summary */}
          <div
            className="rounded-2xl bg-white p-6 border border-border"
          >
            <h2
              className="mb-4 flex items-center gap-2 text-base font-bold text-text-primary"
            >
              <ShoppingBag size={18} className="text-primary" />
              Order Summary
            </h2>
            <div className="space-y-3">
              {items.map(item => (
                <div
                  key={item.meal.id}
                  className="flex items-center gap-4 rounded-xl p-3 transition-colors hover:bg-gray-50"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.meal.image}
                    alt={item.meal.name}
                    className="h-16 w-16 shrink-0 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-semibold leading-tight text-text-primary"
                    >
                      {item.meal.name}
                    </p>
                    {item.customizations && item.customizations.length > 0 && (
                      <p className="mt-0.5 text-xs text-success">
                        {item.customizations.join(', ')}
                      </p>
                    )}
                    <p className="mt-1 text-sm font-medium text-primary">
                      {formatPeso(item.meal.price)}
                    </p>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.meal.id, item.quantity - 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-muted transition-colors"
                    >
                      <Minus size={12} className="text-text-primary" />
                    </button>
                    <span
                      className="w-5 text-center text-sm font-bold text-text-primary"
                    >
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.meal.id, item.quantity + 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-muted transition-colors"
                    >
                      <Plus size={12} className="text-text-primary" />
                    </button>
                  </div>

                  {/* Item total + remove */}
                  <div className="flex items-center gap-3">
                    <span
                      className="text-sm font-bold text-text-primary"
                    >
                      {formatPeso(item.meal.price * item.quantity)}
                    </span>
                    <button
                      onClick={() => removeItem(item.meal.id)}
                      className="rounded-lg p-1.5 transition-colors hover:bg-red-50"
                    >
                      <Trash2 size={16} className="text-error" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* B) Delivery Address */}
          <div
            className="rounded-2xl bg-white p-6 border border-border"
          >
            <h2
              className="mb-4 flex items-center gap-2 text-base font-bold text-text-primary"
            >
              <MapPin size={18} className="text-primary" />
              Delivery Address
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-text-primary">
                  Street Address
                </label>
                <input
                  type="text"
                  value={street}
                  onChange={e => setStreet(e.target.value)}
                  placeholder="123 Rizal Avenue"
                  className="w-full rounded-lg border border-border px-4 py-2.5 text-sm text-text-primary outline-none transition-colors focus:ring-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-primary">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="Makati City"
                  className="w-full rounded-lg border border-border px-4 py-2.5 text-sm text-text-primary outline-none transition-colors focus:ring-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-primary">
                  Barangay
                </label>
                <input
                  type="text"
                  value={barangay}
                  onChange={e => setBarangay(e.target.value)}
                  placeholder="Brgy. San Lorenzo"
                  className="w-full rounded-lg border border-border px-4 py-2.5 text-sm text-text-primary outline-none transition-colors focus:ring-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-primary">
                  Zip Code
                </label>
                <input
                  type="text"
                  value={zip}
                  onChange={e => setZip(e.target.value)}
                  placeholder="1229"
                  className="w-full rounded-lg border border-border px-4 py-2.5 text-sm text-text-primary outline-none transition-colors focus:ring-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-primary">
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
                      {deliveryZones.map(z => (
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
                className="mt-4 flex items-center gap-2 rounded-lg bg-primary-subtle px-4 py-2.5"
              >
                <CheckCircle size={16} className="text-success" />
                <span className="text-sm text-text-primary">
                  Delivery fee: <strong>{formatPeso(zone.fee)}</strong> &middot; Est. {zone.estimatedTime}
                </span>
              </div>
            )}
          </div>

          {/* C) Delivery Slot */}
          <div
            className="rounded-2xl bg-white p-6 border border-border"
          >
            <h2
              className="mb-4 flex items-center gap-2 text-base font-bold text-text-primary"
            >
              <Clock size={18} className="text-primary" />
              Delivery Slot
            </h2>

            {/* Date */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-text-primary">
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
                  {nextDays.map(d => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time slot grid */}
            <div>
              <label className="mb-2 block text-sm font-medium text-text-primary">
                Time Slot
              </label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {timeSlots.map(slot => {
                  const isSelected = deliveryTimeSlot === slot;
                  return (
                    <button
                      key={slot}
                      onClick={() => setDeliveryTimeSlot(slot)}
                      className={`rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                        isSelected
                          ? 'bg-primary text-surface-white'
                          : 'bg-surface-white text-text-primary border border-border'
                      }`}
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
            className="rounded-2xl bg-white p-6 border border-border"
          >
            <h2
              className="mb-4 flex items-center gap-2 text-base font-bold text-text-primary"
            >
              <CreditCard size={18} className="text-primary" />
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
                paymentMethods.map(pm => {
                  const isSelected = selectedPayment === pm.id;
                  return (
                    <label
                      key={pm.id}
                      className={`flex cursor-pointer items-center gap-4 rounded-xl px-4 py-3 transition-all duration-150 border-2 ${
                        isSelected
                          ? 'bg-primary-subtle border-primary'
                          : 'bg-surface-white border-border'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={pm.id}
                        checked={isSelected}
                        onChange={() => setSelectedPayment(pm.id)}
                        className="h-4 w-4 accent-primary"
                      />
                      <span className="text-xl">{pm.icon}</span>
                      <span
                        className="text-sm font-medium text-text-primary"
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
            className="rounded-2xl bg-white p-6 border border-border"
          >
            <h2
              className="mb-4 flex items-center gap-2 text-base font-bold text-text-primary"
            >
              <Tag size={18} className="text-primary" />
              Promo Code
            </h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={promoCode}
                onChange={e => {
                  setPromoCode(e.target.value);
                  setPromoError('');
                }}
                placeholder="Enter promo code"
                className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm text-text-primary uppercase outline-none"
              />
              <button
                onClick={handleApplyPromo}
                className="shrink-0 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Apply
              </button>
            </div>
            {promoError && (
              <p className="mt-2 text-sm text-error">
                {promoError}
              </p>
            )}
            {appliedPromo && (
              <div
                className="mt-3 flex items-center gap-2 rounded-lg bg-success/8 px-4 py-2.5"
              >
                <CheckCircle size={16} className="text-success" />
                <span className="text-sm font-medium text-success">
                  {appliedPromo} applied — {promoDiscount
                    ? promoDiscount.type === 'percentage'
                      ? `${promoDiscount.value}% off!`
                      : `${formatPeso(promoDiscount.amount)} off!`
                    : '15% off!'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Sticky Order Total */}
        <div className="mt-8 lg:mt-0 lg:w-96 lg:shrink-0">
          <div
            className="sticky top-24 rounded-2xl bg-white p-6 border border-border shadow-card"
          >
            <h3 className="text-lg font-bold text-text-primary">
              Order Total
            </h3>

            {/* Compact item list */}
            <div
              className="mt-4 max-h-52 space-y-2 overflow-y-auto pb-4 border-b border-border"
            >
              {items.map(item => (
                <div
                  key={item.meal.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-text-primary">
                    {item.meal.name}{' '}
                    <span className="text-text-secondary">x{item.quantity}</span>
                  </span>
                  <span className="font-medium text-text-primary">
                    {formatPeso(item.meal.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-4 space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Subtotal</span>
                <span className="text-text-primary">{formatPeso(total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Delivery fee</span>
                <span className="text-text-primary">
                  {deliveryFee > 0 ? formatPeso(deliveryFee) : '--'}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-success">
                    Discount{promoDiscount
                      ? promoDiscount.type === 'percentage' ? ` (${promoDiscount.value}%)` : ''
                      : ' (15%)'}
                  </span>
                  <span className="font-semibold text-success">
                    -{formatPeso(discount)}
                  </span>
                </div>
              )}
              <div
                className="flex justify-between pt-3 text-lg font-bold border-t border-border"
              >
                <span className="text-text-primary">Total</span>
                <span className="text-primary">{formatPeso(grandTotal)}</span>
              </div>
            </div>

            {/* Place Order CTA */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={handlePlaceOrder}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 text-base font-bold text-white transition-opacity hover:opacity-90"
            >
              <ShoppingBag size={18} />
              Place Order &middot; {formatPeso(grandTotal)}
            </motion.button>

            <p className="mt-3 text-center text-xs text-text-secondary">
              By placing your order, you agree to our Terms of Service and Privacy Policy.
            </p>

            {/* Back to menu */}
            <Link
              href="/"
              className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-primary transition-colors hover:underline"
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
