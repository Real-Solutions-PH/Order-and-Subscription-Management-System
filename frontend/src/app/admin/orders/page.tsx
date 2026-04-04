'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ChefHat,
  X,
  Check,
  Printer,
  ChevronUp,
  ChevronDown,
  CheckSquare,
  Square,
  Clock,
  MapPin,
  Phone,
  CreditCard,
  StickyNote,
  Package,
} from 'lucide-react';
import Link from 'next/link';
import { orders, customers, formatPeso } from '@/lib/mock-data';
import type { Order } from '@/lib/mock-data';
import StatusBadge from '@/components/StatusBadge';
import { useOrders, useOrderMutations } from '@/hooks';
import { SkeletonRow } from '@/components/ui/skeleton';

type StatusTab =
  | 'all'
  | 'new'
  | 'preparing'
  | 'ready'
  | 'delivering'
  | 'delivered'
  | 'cancelled';

type SortField = 'deliveryDate' | 'total';
type SortDirection = 'asc' | 'desc';

const tabs: { label: string; value: StatusTab }[] = [
  { label: 'All', value: 'all' },
  { label: 'New', value: 'new' },
  { label: 'Preparing', value: 'preparing' },
  { label: 'Ready', value: 'ready' },
  { label: 'Out for Delivery', value: 'delivering' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
];

const timelineSteps = [
  { key: 'placed', label: 'Order Placed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready', label: 'Ready' },
  { key: 'delivering', label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' },
];

function SortIcon({ field, sortField, sortDirection }: { field: SortField; sortField: SortField; sortDirection: SortDirection }) {
  if (sortField !== field) return null;
  return sortDirection === 'asc' ? (
    <ChevronUp size={14} />
  ) : (
    <ChevronDown size={14} />
  );
}

function getTimelineIndex(status: string): number {
  const map: Record<string, number> = {
    new: 1,
    preparing: 2,
    ready: 3,
    delivering: 4,
    delivered: 5,
    cancelled: -1,
  };
  return map[status] ?? 0;
}

export default function OrdersPage() {
  const [selectedTab, setSelectedTab] = useState<StatusTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortField, setSortField] = useState<SortField>('deliveryDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [internalNote, setInternalNote] = useState('');
  const [orderNotes, setOrderNotes] = useState<Record<string, string[]>>({});

  const ordersQuery = useOrders();
  const { updateStatus, isUpdatingStatus } = useOrderMutations();
  const isLoadingOrders = ordersQuery.isLoading;

  const displayOrders = ordersQuery.data?.items?.map((o) => ({
    id: o.order_number,
    customerId: 0,
    customerName: o.items[0]?.product_name ?? 'Customer',
    items: o.items.map((i) => ({
      mealId: 0,
      mealName: i.product_name,
      quantity: i.quantity,
      price: Number(i.unit_price),
    })),
    total: Number(o.total),
    status: o.status as Order['status'],
    deliveryDate: o.delivered_at ?? o.placed_at ?? o.created_at,
    deliverySlot: '',
    paymentMethod: '',
    paymentStatus: 'paid' as const,
    address: o.notes ?? '',
    notes: o.notes ?? '',
    createdAt: o.created_at,
  })) ?? orders;

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: displayOrders.length };
    displayOrders.forEach((o: { status: string }) => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });
    return counts;
  }, [displayOrders]);

  const filteredOrders = useMemo(() => {
    let result = [...displayOrders];

    // Tab filter
    if (selectedTab !== 'all') {
      result = result.filter((o) => o.status === selectedTab);
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q)
      );
    }

    // Date range
    if (dateFrom) {
      result = result.filter((o) => o.deliveryDate >= dateFrom);
    }
    if (dateTo) {
      result = result.filter((o) => o.deliveryDate <= dateTo);
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'deliveryDate') {
        cmp = a.deliveryDate.localeCompare(b.deliveryDate);
      } else if (sortField === 'total') {
        cmp = a.total - b.total;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [displayOrders, selectedTab, searchQuery, dateFrom, dateTo, sortField, sortDirection]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredOrders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredOrders.map((o) => o.id)));
    }
  }

  async function handleUpdateStatus(orderId: string, status: string) {
    try {
      await updateStatus({ id: orderId, status });
    } catch (err) {
      console.error('Failed to update order status via API, falling back to local state', err);
    }
  }

  async function handleBulkUpdateStatus(status: string) {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await handleUpdateStatus(id, status);
    }
    setSelectedIds(new Set());
  }

  function addNote() {
    if (!selectedOrder || !internalNote.trim()) return;
    setOrderNotes((prev) => ({
      ...prev,
      [selectedOrder.id]: [
        ...(prev[selectedOrder.id] || []),
        internalNote.trim(),
      ],
    }));
    setInternalNote('');
  }

  const selectedCustomer = selectedOrder
    ? customers.find((c) => c.id === selectedOrder.customerId)
    : null;
  const currentTimeline = selectedOrder
    ? getTimelineIndex(selectedOrder.status)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1
          className="text-2xl font-bold text-text-primary font-display"
        >
          Orders
        </h1>
        <Link
          href="/admin/production"
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 bg-primary"
        >
          <ChefHat size={16} />
          Generate Cooking Report
        </Link>
      </div>

      {/* Main Content Areas */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Left Sidebar: Operational Flow / Roadmap */}
        <div className="w-full shrink-0 lg:w-64">
          <div
            className="sticky top-6 rounded-xl p-5 bg-surface-white border border-border"
            style={{
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <h2
              className="mb-6 text-xs font-bold uppercase tracking-wider text-text-secondary"
            >
              Operational Flow
            </h2>
            <div className="relative ml-2 space-y-0">
              {tabs.map((tab, i) => {
                const isSelected = selectedTab === tab.value;
                const count = tabCounts[tab.value] || 0;

                // Determine dot classes based on tab and selection
                const isCancelled = tab.value === 'cancelled';
                const dotBgClass = isSelected
                  ? isCancelled ? 'bg-error' : 'bg-primary'
                  : 'bg-gray-50';
                const dotBorderClass = isSelected
                  ? ''
                  : count > 0 ? 'border-2 border-primary' : 'border-2 border-border';
                const dotShadowClass = isSelected
                  ? isCancelled ? 'shadow-[0_0_0_4px_rgba(220,38,38,0.13)]' : 'shadow-[0_0_0_4px_rgba(27,67,50,0.13)]'
                  : '';
                const countBgClass = isSelected
                  ? isCancelled ? 'bg-error/10' : 'bg-primary/10'
                  : 'bg-muted';
                const countTextClass = isSelected
                  ? isCancelled ? 'text-error' : 'text-primary'
                  : 'text-text-secondary';

                return (
                  <div
                    key={tab.value}
                    className="group relative flex cursor-pointer gap-4 pb-6"
                    onClick={() => setSelectedTab(tab.value)}
                  >
                    {/* Vertical line connecting nodes */}
                    {i < tabs.length - 1 && (
                      <div
                        className="absolute bottom-[-6px] left-[11px] top-[24px] w-[2px] bg-muted"
                      />
                    )}

                    <div className="relative z-10 flex flex-col items-center">
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full transition-all duration-200 ${dotBgClass} ${dotBorderClass} ${dotShadowClass}`}
                      >
                        {isSelected && (
                          <div
                            className="h-2 w-2 rounded-full bg-surface-white"
                          />
                        )}
                        {!isSelected && count > 0 && (
                          <div
                            className="h-2 w-2 rounded-full bg-primary"
                          />
                        )}
                      </div>
                    </div>

                    <div className="-mt-1 flex-1">
                      <div className="flex items-center justify-between">
                        <p
                          className={`text-sm transition-colors ${isSelected ? 'text-text-primary font-semibold' : 'text-text-secondary font-medium'}`}
                        >
                          {tab.label}
                        </p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${countBgClass} ${countTextClass}`}
                        >
                          {count}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="min-w-0 flex-1 space-y-6">
          {/* Search and Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
              />
              <input
                type="text"
                placeholder="Search by order ID or customer name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg py-2.5 pl-10 pr-4 text-sm outline-none transition-colors border border-border bg-surface-white text-text-primary"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-lg px-3 py-2.5 text-sm outline-none border border-border text-text-primary"
              />
              <span className="text-sm text-text-secondary">
                to
              </span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-lg px-3 py-2.5 text-sm outline-none border border-border text-text-primary"
              />
            </div>
          </div>

          {/* Bulk Actions Bar */}
          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-3 rounded-xl p-3 bg-info-light border border-info-200"
              >
                <span className="text-sm font-medium text-info-800">
                  {selectedIds.size} selected
                </span>
                <button
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 bg-warning"
                  disabled={isUpdatingStatus}
                  onClick={() => handleBulkUpdateStatus('preparing')}
                >
                  {isUpdatingStatus ? 'Updating...' : 'Mark as Preparing'}
                </button>
                <button
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 bg-success"
                  disabled={isUpdatingStatus}
                  onClick={() => handleBulkUpdateStatus('ready')}
                >
                  {isUpdatingStatus ? 'Updating...' : 'Mark as Ready'}
                </button>
                <button
                  className="flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium text-white bg-primary"
                >
                  <Printer size={12} />
                  Print Labels
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Orders Table */}
          <div
            className="overflow-x-auto rounded-xl bg-surface-white shadow-card border border-border"
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left">
                    <button onClick={toggleSelectAll}>
                      {selectedIds.size === filteredOrders.length &&
                      filteredOrders.length > 0 ? (
                        <CheckSquare size={16} className="text-primary" />
                      ) : (
                        <Square size={16} className="text-text-secondary" />
                      )}
                    </button>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary"
                  >
                    Order ID
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary"
                  >
                    Customer
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary"
                  >
                    Items
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary"
                    onClick={() => toggleSort('total')}
                  >
                    <span className="inline-flex items-center gap-1">
                      Total <SortIcon field="total" sortField={sortField} sortDirection={sortDirection} />
                    </span>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary"
                  >
                    Status
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary"
                    onClick={() => toggleSort('deliveryDate')}
                  >
                    <span className="inline-flex items-center gap-1">
                      Delivery Date <SortIcon field="deliveryDate" sortField={sortField} sortDirection={sortDirection} />
                    </span>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoadingOrders ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={8} />)
                ) : (
                  filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="cursor-pointer transition-colors hover:bg-gray-50 border-b border-muted"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => toggleSelect(order.id)}>
                          {selectedIds.has(order.id) ? (
                            <CheckSquare size={16} className="text-primary" />
                          ) : (
                            <Square size={16} className="text-text-secondary" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs font-medium text-primary"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          {order.id}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-text-primary">
                        {order.customerName}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {order.items.reduce((s: number, i: { quantity: number }) => s + i.quantity, 0)} items
                      </td>
                      <td className="px-4 py-3 font-medium text-text-primary">
                        {formatPeso(order.total)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={order.status} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {order.deliveryDate}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          className="rounded-md px-2.5 py-1 text-xs font-medium transition-colors hover:opacity-80 bg-muted text-text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(order);
                          }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {filteredOrders.length === 0 && (
              <div className="py-12 text-center text-sm text-text-secondary">
                No orders found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Order Detail Slide-out Panel */}
      <AnimatePresence>
        {selectedOrder && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed top-0 left-0 z-40 bg-black/30"
              style={{ width: '100vw', height: '100vh' }}
              onClick={() => setSelectedOrder(null)}
            />
            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto sm:w-[480px] bg-surface-white"
              style={{ boxShadow: '-4px 0 24px rgba(0,0,0,0.12)' }}
            >
              {/* Panel Header */}
              <div
                className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-surface-white border-b border-border"
              >
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">
                    Order Details
                  </h2>
                  <p
                    className="text-xs text-text-secondary"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {selectedOrder.id}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="rounded-lg p-1.5 transition-colors hover:bg-gray-100"
                >
                  <X size={20} className="text-text-secondary" />
                </button>
              </div>

              <div className="space-y-6 p-6">
                {/* Status */}
                <div className="flex items-center gap-3">
                  <StatusBadge status={selectedOrder.status} />
                  <span className="text-sm text-text-secondary">
                    Created{' '}
                    {new Date(selectedOrder.createdAt).toLocaleDateString(
                      'en-PH',
                      {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }
                    )}
                  </span>
                </div>

                {/* Customer Info */}
                <div className="rounded-lg p-4 bg-gray-50 border border-border">
                  <h3 className="mb-2 text-sm font-semibold text-text-primary">
                    Customer
                  </h3>
                  <p className="text-sm font-medium text-text-primary">
                    {selectedOrder.customerName}
                  </p>
                  {selectedCustomer && (
                    <div className="mt-2 space-y-1">
                      <p className="flex items-center gap-2 text-xs text-text-secondary">
                        <Phone size={12} /> {selectedCustomer.phone}
                      </p>
                      <p className="flex items-center gap-2 text-xs text-text-secondary">
                        <MapPin size={12} /> {selectedCustomer.address}
                      </p>
                    </div>
                  )}
                </div>

                {/* Items */}
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-text-primary">
                    Items
                  </h3>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg p-3 bg-gray-50 border border-border"
                      >
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            {item.mealName}
                          </p>
                          <p className="text-xs text-text-secondary">
                            Qty: {item.quantity}
                            {item.customizations &&
                              item.customizations.length > 0 &&
                              ` | ${item.customizations.join(', ')}`}
                          </p>
                        </div>
                        <span className="text-sm font-medium text-text-primary">
                          {formatPeso(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-border pt-2">
                      <span className="text-sm font-semibold text-text-primary">
                        Total
                      </span>
                      <span className="text-sm font-bold text-primary">
                        {formatPeso(selectedOrder.total)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment */}
                <div className="rounded-lg p-4 bg-gray-50 border border-border">
                  <h3 className="mb-2 text-sm font-semibold text-text-primary">
                    <CreditCard size={14} className="mr-1 inline text-text-secondary" />
                    Payment
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">
                      {selectedOrder.paymentMethod}
                    </span>
                    <StatusBadge
                      status={selectedOrder.paymentStatus}
                      size="sm"
                    />
                  </div>
                </div>

                {/* Delivery */}
                <div className="rounded-lg p-4 bg-gray-50 border border-border">
                  <h3 className="mb-2 text-sm font-semibold text-text-primary">
                    <Package size={14} className="mr-1 inline text-text-secondary" />
                    Delivery
                  </h3>
                  <div className="space-y-1 text-sm text-text-secondary">
                    <p>{selectedOrder.address}</p>
                    <p>{selectedOrder.deliveryDate} | {selectedOrder.deliverySlot}</p>
                    {selectedOrder.notes && (
                      <p className="italic">Note: {selectedOrder.notes}</p>
                    )}
                  </div>
                </div>

                {/* Timeline */}
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-text-primary">
                    <Clock size={14} className="mr-1 inline text-text-secondary" />
                    Timeline
                  </h3>
                  <div className="relative ml-3 space-y-0">
                    {timelineSteps.map((step, i) => {
                      const isCompleted =
                        selectedOrder.status !== 'cancelled' &&
                        i <= currentTimeline;
                      const isCurrent =
                        selectedOrder.status !== 'cancelled' &&
                        i === currentTimeline;
                      return (
                        <div key={step.key} className="flex gap-3 pb-4">
                          {/* Vertical line */}
                          <div className="relative flex flex-col items-center">
                            <div
                              className={`flex h-6 w-6 items-center justify-center rounded-full ${isCompleted ? 'bg-success' : 'bg-border'} ${isCurrent ? 'border-2 border-primary' : ''}`}
                            >
                              {isCompleted && (
                                <Check size={12} className="text-white" />
                              )}
                            </div>
                            {i < timelineSteps.length - 1 && (
                              <div
                                className={`w-0.5 flex-1 min-h-4 ${isCompleted ? 'bg-success' : 'bg-border'}`}
                              />
                            )}
                          </div>
                          <div className="pb-1">
                            <p className={`text-sm font-medium ${isCompleted ? 'text-text-primary' : 'text-text-tertiary'}`}>
                              {step.label}
                            </p>
                            {isCompleted && (
                              <p className="text-xs text-text-secondary">
                                {isCurrent ? 'Current' : 'Completed'}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {selectedOrder.status === 'cancelled' && (
                      <div className="flex gap-3 pb-4">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-error">
                          <X size={12} className="text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-error">Cancelled</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Internal Notes */}
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-text-primary">
                    <StickyNote size={14} className="mr-1 inline text-text-secondary" />
                    Internal Notes
                  </h3>
                  {(orderNotes[selectedOrder.id] || []).length > 0 && (
                    <div className="mb-2 space-y-1">
                      {(orderNotes[selectedOrder.id] || []).map((note, i) => (
                        <p
                          key={i}
                          className="rounded-md p-2 text-xs bg-warning-light text-warning-dark"
                        >
                          {note}
                        </p>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <textarea
                      value={internalNote}
                      onChange={(e) => setInternalNote(e.target.value)}
                      placeholder="Add an internal note..."
                      rows={2}
                      className="flex-1 rounded-lg p-2.5 text-sm outline-none border border-border text-text-primary resize-none"
                    />
                    <button
                      onClick={addNote}
                      className="self-end rounded-lg px-3 py-2 text-xs font-medium text-white transition-colors hover:opacity-90 bg-primary"
                    >
                      Add Note
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
