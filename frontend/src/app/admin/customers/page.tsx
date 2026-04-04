'use client';

import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Download,
  Star,
  Building2,
  X,
  Mail,
  MessageSquare,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { customers, orders, formatPeso } from '@/lib/mock-data';
import type { Customer } from '@/lib/mock-data';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import { useToast } from '@/context/ToastContext';
import { useUsers, useNotificationMutations } from '@/hooks';
import type { UserResponse } from '@/lib/api-client';
import { SkeletonRow } from '@/components/ui/skeleton';

type Segment = 'all' | 'active' | 'paused' | 'at_risk' | 'churned' | 'vip';
type SortKey = 'name' | 'email' | 'phone' | 'planType' | 'status' | 'ltv' | 'lastOrder' | 'joinDate';
type SortDir = 'asc' | 'desc';

const segments: { key: Segment; label: string; count: (cs: Customer[]) => number }[] = [
  { key: 'all', label: 'All Customers', count: (cs) => cs.length },
  { key: 'active', label: 'Active Subscribers', count: (cs) => cs.filter((c) => c.status === 'active' && c.planType !== 'A la carte').length },
  { key: 'paused', label: 'Paused', count: (cs) => cs.filter((c) => c.status === 'paused').length },
  { key: 'at_risk', label: 'At Risk', count: (cs) => cs.filter((c) => c.status === 'at_risk').length },
  { key: 'churned', label: 'Churned', count: (cs) => cs.filter((c) => c.status === 'churned').length },
  { key: 'vip', label: 'VIP', count: (cs) => cs.filter((c) => c.isVIP).length },
];

export default function CustomersPage() {
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeSegment, setActiveSegment] = useState<Segment>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newNote, setNewNote] = useState('');
  const [customerNotes, setCustomerNotes] = useState<Record<number, { text: string; time: string }[]>>({});

  // Compose modals
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [smsModalOpen, setSmsModalOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({ to: '', subject: '', body: '' });
  const [smsForm, setSmsForm] = useState({ phone: '', message: '' });

  // TanStack Query hooks
  const usersQuery = useUsers();
  const isLoadingCustomers = usersQuery.isLoading;
  const { sendNotification } = useNotificationMutations();

  // Map API users to Customer format, falling back to mock data
  const displayCustomers: Customer[] = usersQuery.data?.items?.map((u: UserResponse) => ({
    id: 0,
    name: `${u.first_name} ${u.last_name}`,
    email: u.email,
    phone: u.phone ?? '',
    planType: 'A la carte' as const,
    status: (u.status === 'active' ? 'active' : 'churned') as Customer['status'],
    monthsSubscribed: 0,
    ltv: 0,
    joinDate: u.created_at.split('T')[0] ?? '',
    lastOrder: u.last_login_at?.split('T')[0] ?? '',
    notes: [] as string[],
    address: '',
    dietaryPreferences: [] as string[],
  })) ?? customers;

  // Filter by segment
  const segmentFiltered = useMemo(() => {
    switch (activeSegment) {
      case 'active': return displayCustomers.filter((c) => c.status === 'active' && c.planType !== 'A la carte');
      case 'paused': return displayCustomers.filter((c) => c.status === 'paused');
      case 'at_risk': return displayCustomers.filter((c) => c.status === 'at_risk');
      case 'churned': return displayCustomers.filter((c) => c.status === 'churned');
      case 'vip': return displayCustomers.filter((c) => c.isVIP);
      default: return displayCustomers;
    }
  }, [activeSegment, displayCustomers]);

  // Filter by search
  const searchFiltered = useMemo(() => {
    if (!searchQuery.trim()) return segmentFiltered;
    const q = searchQuery.toLowerCase();
    return segmentFiltered.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q)
    );
  }, [segmentFiltered, searchQuery]);

  // Sort
  const sorted = useMemo(() => {
    return [...searchFiltered].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'email': cmp = a.email.localeCompare(b.email); break;
        case 'phone': cmp = a.phone.localeCompare(b.phone); break;
        case 'planType': cmp = a.planType.localeCompare(b.planType); break;
        case 'status': cmp = a.status.localeCompare(b.status); break;
        case 'ltv': cmp = a.ltv - b.ltv; break;
        case 'lastOrder': cmp = a.lastOrder.localeCompare(b.lastOrder); break;
        case 'joinDate': cmp = a.joinDate.localeCompare(b.joinDate); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [searchFiltered, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column) return null;
    return sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  }

  function getCustomerOrders(customerId: number) {
    return orders.filter((o) => o.customerId === customerId).slice(0, 5);
  }

  function getAllNotes(customer: Customer) {
    const added = customerNotes[customer.id] || [];
    return [
      ...customer.notes.map((n) => ({ text: n, time: '' })),
      ...added,
    ];
  }

  function handleAddNote() {
    if (!newNote.trim() || !selectedCustomer) return;
    const now = new Date().toLocaleString();
    setCustomerNotes((prev) => ({
      ...prev,
      [selectedCustomer.id]: [
        ...(prev[selectedCustomer.id] || []),
        { text: newNote.trim(), time: now },
      ],
    }));
    setNewNote('');
    showToast('Note added');
  }

  function openEmailModal() {
    if (!selectedCustomer) return;
    setEmailForm({ to: selectedCustomer.email, subject: '', body: '' });
    setEmailModalOpen(true);
  }

  function openSmsModal() {
    if (!selectedCustomer) return;
    setSmsForm({ phone: selectedCustomer.phone, message: '' });
    setSmsModalOpen(true);
  }

  async function handleSendEmail() {
    if (!selectedCustomer) return;
    setEmailModalOpen(false);
    try {
      await sendNotification({
        user_id: String(selectedCustomer.id),
        channel: 'email',
        subject: emailForm.subject,
        body: emailForm.body,
      });
      showToast(`Email sent to ${selectedCustomer.name}`);
    } catch {
      // API not available – fall back to local toast
      showToast(`Message sent to ${selectedCustomer.name}`);
    }
  }

  async function handleSendSms() {
    if (!selectedCustomer) return;
    setSmsModalOpen(false);
    try {
      await sendNotification({
        user_id: String(selectedCustomer.id),
        channel: 'sms',
        subject: '',
        body: smsForm.message,
      });
      showToast(`SMS sent to ${selectedCustomer.name}`);
    } catch {
      // API not available – fall back to local toast
      showToast(`Message sent to ${selectedCustomer.name}`);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-text-primary">
          Customers
        </h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              placeholder="Search by name, email, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 rounded-lg border border-border py-2 pl-9 pr-3 text-sm text-text-primary"
            />
          </div>
          <button
            onClick={() => showToast('Exported 127 customers')}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-gray-100"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Segments Sidebar (desktop) / Tabs (mobile) */}
        <div className="w-full lg:w-56">
          {/* Mobile horizontal tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 lg:hidden">
            {segments.map((seg) => (
              <button
                key={seg.key}
                onClick={() => setActiveSegment(seg.key)}
                className={`flex-shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  activeSegment === seg.key
                    ? 'bg-primary text-white'
                    : 'border border-border bg-surface-white text-text-secondary'
                }`}
              >
                {seg.label} ({seg.count(displayCustomers)})
              </button>
            ))}
          </div>

          {/* Desktop vertical sidebar */}
          <div className="hidden rounded-xl border border-border bg-white p-3 shadow-sm lg:block">
            <div className="space-y-1">
              {segments.map((seg) => (
                <button
                  key={seg.key}
                  onClick={() => setActiveSegment(seg.key)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    activeSegment === seg.key
                      ? 'bg-primary text-white'
                      : 'bg-transparent text-text-primary'
                  }`}
                >
                  <span>{seg.label}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      activeSegment === seg.key
                        ? 'bg-white/20 text-white'
                        : 'bg-muted text-text-secondary'
                    }`}
                  >
                    {seg.count(displayCustomers)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Customer Table */}
        <div className="flex-1">
          <div className="overflow-x-auto rounded-xl border border-border bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  {([
                    { key: 'name' as SortKey, label: 'Name' },
                    { key: 'email' as SortKey, label: 'Email' },
                    { key: 'phone' as SortKey, label: 'Phone' },
                    { key: 'planType' as SortKey, label: 'Plan' },
                    { key: 'status' as SortKey, label: 'Status' },
                    { key: 'ltv' as SortKey, label: 'LTV' },
                    { key: 'lastOrder' as SortKey, label: 'Last Order' },
                    { key: 'joinDate' as SortKey, label: 'Joined' },
                  ]).map((col) => (
                    <th
                      key={col.key}
                      className="cursor-pointer select-none whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-secondary"
                      onClick={() => handleSort(col.key)}
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        <SortIcon column={col.key} />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoadingCustomers ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonRow key={i} cols={8} />
                  ))
                ) : (
                  <>
                    {sorted.map((customer) => (
                      <tr
                        key={customer.id}
                        className="cursor-pointer border-b border-border transition-colors hover:bg-gray-50"
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-text-primary">{customer.name}</span>
                            {customer.isVIP && <Star size={14} className="text-amber-500" fill="#F59E0B" />}
                            {customer.isCorporate && <Building2 size={14} className="text-blue-500" />}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-text-secondary">{customer.email}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-text-secondary">{customer.phone}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-text-secondary">{customer.planType}</td>
                        <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={customer.status} size="sm" /></td>
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-text-primary">{formatPeso(customer.ltv)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-text-secondary">{customer.lastOrder}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-text-secondary">{customer.joinDate}</td>
                      </tr>
                    ))}
                    {sorted.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-sm text-text-secondary">
                          No customers found.
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Customer Detail Slide-out Panel */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {selectedCustomer && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/30"
                onClick={() => setSelectedCustomer(null)}
              />
              {/* Panel */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed inset-y-0 right-0 z-50 w-full max-w-lg overflow-y-auto bg-white shadow-2xl"
              >
              <div className="p-6">
                {/* Close */}
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-text-primary">Customer Details</h2>
                  <button onClick={() => setSelectedCustomer(null)} className="rounded-lg p-1.5 transition-colors hover:bg-gray-100">
                    <X size={20} className="text-text-secondary" />
                  </button>
                </div>

                {/* Profile Header */}
                <div className="mb-6 rounded-xl border border-border bg-gray-50 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-text-primary">
                        {selectedCustomer.name}
                      </h3>
                      <p className="text-sm text-text-secondary">{selectedCustomer.email}</p>
                      <p className="text-sm text-text-secondary">{selectedCustomer.phone}</p>
                    </div>
                    <StatusBadge status={selectedCustomer.status} />
                  </div>
                  <p className="mt-2 text-xs text-text-secondary">
                    Member since {selectedCustomer.joinDate}
                  </p>
                  {/* Tags */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedCustomer.isVIP && (
                      <span className="flex items-center gap-1 rounded-full border border-amber-300 bg-warning-light px-2.5 py-1 text-xs font-semibold text-warning-dark">
                        <Star size={12} fill="#F59E0B" className="text-amber-500" /> VIP
                      </span>
                    )}
                    {selectedCustomer.isCorporate && (
                      <span className="flex items-center gap-1 rounded-full border border-blue-300 bg-info-light px-2.5 py-1 text-xs font-semibold text-blue-800">
                        <Building2 size={12} /> Corporate
                      </span>
                    )}
                  </div>
                </div>

                {/* Subscription Details */}
                <div className="mb-6">
                  <h4 className="mb-2 text-sm font-semibold text-text-primary">Subscription</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg border border-border bg-gray-50 p-3">
                      <p className="text-xs text-text-secondary">Plan</p>
                      <p className="font-semibold text-text-primary">{selectedCustomer.planType}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-gray-50 p-3">
                      <p className="text-xs text-text-secondary">Billing</p>
                      <p className="font-semibold text-text-primary">Monthly</p>
                    </div>
                    <div className="rounded-lg border border-border bg-gray-50 p-3">
                      <p className="text-xs text-text-secondary">Months</p>
                      <p className="font-semibold text-text-primary">{selectedCustomer.monthsSubscribed}</p>
                    </div>
                  </div>
                </div>

                {/* Dietary Preferences */}
                <div className="mb-6">
                  <h4 className="mb-2 text-sm font-semibold text-text-primary">Dietary Preferences</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedCustomer.dietaryPreferences.map((pref) => (
                      <span key={pref} className="rounded-full bg-success-light px-2.5 py-1 text-xs font-medium text-emerald-800">
                        {pref}
                      </span>
                    ))}
                    {selectedCustomer.dietaryPreferences.length === 0 && (
                      <span className="text-xs text-text-secondary">None specified</span>
                    )}
                  </div>
                </div>

                {/* Lifetime Spend */}
                <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4">
                  <p className="text-xs font-medium text-emerald-800">Lifetime Spend</p>
                  <p className="text-2xl font-bold text-primary">{formatPeso(selectedCustomer.ltv)}</p>
                </div>

                {/* Order History */}
                <div className="mb-6">
                  <h4 className="mb-2 text-sm font-semibold text-text-primary">Recent Orders</h4>
                  {getCustomerOrders(selectedCustomer.id).length > 0 ? (
                    <div className="overflow-hidden rounded-lg border border-border">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-border bg-gray-50">
                            <th className="px-3 py-2 font-semibold text-text-secondary">Order</th>
                            <th className="px-3 py-2 font-semibold text-text-secondary">Date</th>
                            <th className="px-3 py-2 font-semibold text-text-secondary">Total</th>
                            <th className="px-3 py-2 font-semibold text-text-secondary">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getCustomerOrders(selectedCustomer.id).map((order) => (
                            <tr key={order.id} className="border-b border-border">
                              <td className="px-3 py-2 font-medium text-text-primary">{order.id}</td>
                              <td className="px-3 py-2 text-text-secondary">{order.deliveryDate}</td>
                              <td className="px-3 py-2 font-medium text-text-primary">{formatPeso(order.total)}</td>
                              <td className="px-3 py-2"><StatusBadge status={order.status} size="sm" /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-text-secondary">No orders found.</p>
                  )}
                </div>

                {/* Internal Notes */}
                <div className="mb-6">
                  <h4 className="mb-2 text-sm font-semibold text-text-primary">Internal Notes</h4>
                  <div className="space-y-2">
                    {getAllNotes(selectedCustomer).map((note, idx) => (
                      <div key={idx} className="rounded-lg border border-amber-300 bg-amber-50 p-3">
                        <p className="text-sm text-text-primary">{note.text}</p>
                        {note.time && (
                          <p className="mt-1 text-xs text-text-secondary">{note.time}</p>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add a note..."
                      rows={2}
                      className="flex-1 rounded-lg border border-border px-3 py-2 text-sm text-text-primary"
                    />
                    <button
                      onClick={handleAddNote}
                      className="self-end rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={openEmailModal}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90"
                  >
                    <Mail size={16} /> Send Email
                  </button>
                  <button
                    onClick={openSmsModal}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-gray-100"
                  >
                    <MessageSquare size={16} /> Send SMS
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
        </AnimatePresence>,
        document.body
      )}

      {/* Email Compose Modal */}
      <Modal isOpen={emailModalOpen} onClose={() => setEmailModalOpen(false)} title="Send Email" size="md">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">To</label>
            <input
              type="email"
              value={emailForm.to}
              onChange={(e) => setEmailForm((f) => ({ ...f, to: e.target.value }))}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm text-text-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">Subject</label>
            <input
              type="text"
              value={emailForm.subject}
              onChange={(e) => setEmailForm((f) => ({ ...f, subject: e.target.value }))}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm text-text-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">Body</label>
            <textarea
              value={emailForm.body}
              onChange={(e) => setEmailForm((f) => ({ ...f, body: e.target.value }))}
              rows={6}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm text-text-primary"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setEmailModalOpen(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSendEmail}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
            >
              Send Email
            </button>
          </div>
        </div>
      </Modal>

      {/* SMS Compose Modal */}
      <Modal isOpen={smsModalOpen} onClose={() => setSmsModalOpen(false)} title="Send SMS" size="sm">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">Phone</label>
            <input
              type="text"
              value={smsForm.phone}
              onChange={(e) => setSmsForm((f) => ({ ...f, phone: e.target.value }))}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm text-text-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">Message</label>
            <textarea
              value={smsForm.message}
              onChange={(e) => setSmsForm((f) => ({ ...f, message: e.target.value }))}
              rows={4}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm text-text-primary"
              maxLength={160}
            />
            <p className="mt-1 text-right text-xs text-text-secondary">
              {smsForm.message.length}/160
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setSmsModalOpen(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSendSms}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
            >
              Send SMS
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
