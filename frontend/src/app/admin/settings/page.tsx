'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Truck,
  CreditCard,
  Bell,
  Receipt,
  Users,
  Upload,
  Plus,
  Trash2,
  Eye,
  X,
} from 'lucide-react';
import { deliveryZones as initialZones, paymentMethods as initialPaymentMethods } from '@/lib/mock-data';
import Modal from '@/components/Modal';
import { useToast } from '@/context/ToastContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type TabKey = 'general' | 'delivery' | 'payments' | 'notifications' | 'tax' | 'team';

const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'general', label: 'General', icon: Settings },
  { key: 'delivery', label: 'Delivery', icon: Truck },
  { key: 'payments', label: 'Payments', icon: CreditCard },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'tax', label: 'Tax', icon: Receipt },
  { key: 'team', label: 'Team', icon: Users },
];

// Notification templates
const defaultTemplates = [
  { id: 'order_confirm', name: 'Order Confirmation', snippet: 'Hi {customer_name}, your order {order_id} has been confirmed...', subject: 'Order Confirmed - {order_id}', body: 'Hi {customer_name},\n\nYour order {order_id} has been confirmed and is being prepared.\n\nDelivery date: {delivery_date}\n\nThank you for choosing PrepFlow!' },
  { id: 'delivery_update', name: 'Delivery Update', snippet: 'Your order {order_id} is on its way to you...', subject: 'Your Order is On Its Way - {order_id}', body: 'Hi {customer_name},\n\nGreat news! Your order {order_id} is now out for delivery.\n\nExpected delivery: {delivery_date}\n\nTrack your order in the app.' },
  { id: 'payment_reminder', name: 'Payment Reminder', snippet: 'This is a reminder that your payment for order {order_id} is pending...', subject: 'Payment Reminder - {order_id}', body: 'Hi {customer_name},\n\nThis is a friendly reminder that your payment for order {order_id} is still pending.\n\nPlease complete your payment to avoid any delays.' },
  { id: 'subscription_renewal', name: 'Subscription Renewal', snippet: 'Your subscription is up for renewal on {delivery_date}...', subject: 'Subscription Renewal Notice', body: 'Hi {customer_name},\n\nYour PrepFlow subscription is up for renewal on {delivery_date}.\n\nYour plan will automatically renew. Update your preferences anytime in the app.' },
  { id: 'welcome', name: 'Welcome Email', snippet: 'Welcome to PrepFlow, {customer_name}! We are excited...', subject: 'Welcome to PrepFlow!', body: 'Hi {customer_name},\n\nWelcome to PrepFlow! We are excited to have you.\n\nExplore our weekly menu and start your healthy eating journey today.\n\nBest,\nThe PrepFlow Team' },
];

// Team members
const defaultTeam = [
  { id: 1, name: 'Ana Santos', email: 'ana@prepflow.ph', role: 'Owner', status: 'active' as const },
  { id: 2, name: 'Marco Reyes', email: 'marco@prepflow.ph', role: 'Kitchen Manager', status: 'active' as const },
  { id: 3, name: 'Joy Lim', email: 'joy@prepflow.ph', role: 'Delivery', status: 'active' as const },
  { id: 4, name: 'Ben Torres', email: 'ben@prepflow.ph', role: 'Support', status: 'invited' as const },
];

// Cutoff schedule
const deliveryDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const cutoffDefaults: Record<string, { day: string; time: string }> = {
  Monday: { day: 'Saturday', time: '18:00' },
  Tuesday: { day: 'Sunday', time: '18:00' },
  Wednesday: { day: 'Monday', time: '18:00' },
  Thursday: { day: 'Tuesday', time: '18:00' },
  Friday: { day: 'Wednesday', time: '18:00' },
  Saturday: { day: 'Thursday', time: '18:00' },
};

const dayOptions = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const roleOptions = ['Owner', 'Kitchen Manager', 'Delivery', 'Support'];

export default function SettingsPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>('general');

  // General
  const [general, setGeneral] = useState({
    businessName: 'PrepFlow Kitchen',
    email: 'hello@prepflow.ph',
    phone: '+63 917 000 1234',
    address: '15th Floor, Tower One, Ayala Triangle, Makati City 1226',
  });

  // Delivery
  const [zones, setZones] = useState(initialZones.map((z, i) => ({ ...z, id: i })));
  const [editingZone, setEditingZone] = useState<number | null>(null);
  const [newZone, setNewZone] = useState({ name: '', fee: 0, estimatedTime: '' });
  const [showAddZone, setShowAddZone] = useState(false);
  const [cutoffs, setCutoffs] = useState<Record<string, { day: string; time: string }>>(cutoffDefaults);

  // Payments
  const [paymentMethodsConfig, setPaymentMethodsConfig] = useState(
    initialPaymentMethods.map(m => ({
      ...m,
      enabled: ['gcash', 'maya', 'grabpay', 'card'].includes(m.id),
      qrCode: '',
      accountNumber: '',
      displayName: m.name,
      email: ''
    }))
  );
  const [minOrder, setMinOrder] = useState(500);

  const updatePaymentMethod = (id: string, field: string, value: string | boolean) => {
    setPaymentMethodsConfig(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  // Notifications
  const [templates, setTemplates] = useState(defaultTemplates);
  const [editingTemplate, setEditingTemplate] = useState<typeof defaultTemplates[0] | null>(null);
  const [templateForm, setTemplateForm] = useState({ subject: '', body: '' });
  const [previewTemplate, setPreviewTemplate] = useState(false);

  // Tax
  const [vatRate, setVatRate] = useState(12);
  const [taxInclusive, setTaxInclusive] = useState(true);
  const [taxId, setTaxId] = useState('');

  // Team
  const [team, setTeam] = useState(defaultTeam);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'Support' });

  // Zone editing handlers
  function handleZoneFeeChange(idx: number, fee: number) {
    setZones((prev) => prev.map((z, i) => (i === idx ? { ...z, fee } : z)));
  }

  function handleRemoveZone(idx: number) {
    setZones((prev) => prev.filter((_, i) => i !== idx));
    showToast('Zone removed');
  }

  function handleAddZone() {
    if (!newZone.name.trim()) return;
    setZones((prev) => [...prev, { ...newZone, id: Date.now() }]);
    setNewZone({ name: '', fee: 0, estimatedTime: '' });
    setShowAddZone(false);
    showToast('Zone added');
  }

  // Template editing
  function openTemplateEditor(t: typeof defaultTemplates[0]) {
    setEditingTemplate(t);
    setTemplateForm({ subject: t.subject, body: t.body });
    setPreviewTemplate(false);
  }

  function handleSaveTemplate() {
    if (!editingTemplate) return;
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === editingTemplate.id
          ? { ...t, subject: templateForm.subject, body: templateForm.body, snippet: templateForm.body.substring(0, 60) + '...' }
          : t
      )
    );
    setEditingTemplate(null);
    showToast('Template saved');
  }

  function renderPreview(text: string) {
    return text
      .replace(/\{customer_name\}/g, 'Maria Santos')
      .replace(/\{order_id\}/g, 'PF-2026-04-0847')
      .replace(/\{delivery_date\}/g, 'April 1, 2026');
  }

  // Team
  function handleRemoveTeamMember(id: number) {
    setTeam((prev) => prev.filter((m) => m.id !== id));
    showToast('Team member removed');
  }

  function handleInvite() {
    if (!inviteForm.email.trim()) return;
    setTeam((prev) => [
      ...prev,
      { id: Date.now(), name: inviteForm.email.split('@')[0], email: inviteForm.email, role: inviteForm.role, status: 'invited' as const },
    ]);
    showToast(`Invitation sent to ${inviteForm.email}`);
    setInviteForm({ email: '', role: 'Support' });
    setInviteModalOpen(false);
  }

  function handleTeamRoleChange(id: number, role: string) {
    setTeam((prev) => prev.map((m) => (m.id === id ? { ...m, role } : m)));
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: '#1A1A2E' }}>Settings</h1>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Tabs - vertical desktop, horizontal mobile */}
        <div className="w-full lg:w-52">
          {/* Mobile horizontal */}
          <div className="flex gap-2 overflow-x-auto pb-2 lg:hidden">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="flex flex-shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: activeTab === tab.key ? '#1B4332' : '#FFFFFF',
                    color: activeTab === tab.key ? '#FFFFFF' : '#6B7280',
                    border: activeTab === tab.key ? 'none' : '1px solid #E5E7EB',
                  }}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
          {/* Desktop vertical */}
          <div className="hidden rounded-xl bg-white p-3 shadow-sm lg:block" style={{ border: '1px solid #E5E7EB' }}>
            <div className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: activeTab === tab.key ? '#1B4332' : 'transparent',
                      color: activeTab === tab.key ? '#FFFFFF' : '#1A1A2E',
                    }}
                  >
                    <Icon size={18} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="rounded-xl bg-white p-6 shadow-sm" style={{ border: '1px solid #E5E7EB' }}>
            {/* GENERAL TAB */}
            {activeTab === 'general' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                <h2 className="text-lg font-semibold" style={{ color: '#1A1A2E' }}>General Settings</h2>
                <div>
                  <label className="mb-1 block text-sm font-medium" style={{ color: '#1A1A2E' }}>Business Name</label>
                  <input
                    type="text"
                    value={general.businessName}
                    onChange={(e) => setGeneral((g) => ({ ...g, businessName: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-sm"
                    style={{ border: '1px solid #E5E7EB', color: '#1A1A2E' }}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium" style={{ color: '#1A1A2E' }}>Logo</label>
                  <div
                    className="flex items-center justify-center rounded-lg py-10"
                    style={{ border: '2px dashed #E5E7EB', backgroundColor: '#F9FAFB' }}
                  >
                    <div className="text-center">
                      <Upload size={28} className="mx-auto mb-2" style={{ color: '#6B7280' }} />
                      <p className="text-sm" style={{ color: '#6B7280' }}>Click or drag to upload logo</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium" style={{ color: '#1A1A2E' }}>Contact Email</label>
                    <input
                      type="email"
                      value={general.email}
                      onChange={(e) => setGeneral((g) => ({ ...g, email: e.target.value }))}
                      className="w-full rounded-lg px-3 py-2 text-sm"
                      style={{ border: '1px solid #E5E7EB', color: '#1A1A2E' }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium" style={{ color: '#1A1A2E' }}>Phone</label>
                    <input
                      type="text"
                      value={general.phone}
                      onChange={(e) => setGeneral((g) => ({ ...g, phone: e.target.value }))}
                      className="w-full rounded-lg px-3 py-2 text-sm"
                      style={{ border: '1px solid #E5E7EB', color: '#1A1A2E' }}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium" style={{ color: '#1A1A2E' }}>Business Address</label>
                  <textarea
                    value={general.address}
                    onChange={(e) => setGeneral((g) => ({ ...g, address: e.target.value }))}
                    rows={3}
                    className="w-full rounded-lg px-3 py-2 text-sm"
                    style={{ border: '1px solid #E5E7EB', color: '#1A1A2E' }}
                  />
                </div>
                <div>
                  <button
                    onClick={() => showToast('Settings saved')}
                    className="rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90"
                    style={{ backgroundColor: '#1B4332' }}
                  >
                    Save Changes
                  </button>
                </div>
              </motion.div>
            )}

            {/* DELIVERY TAB */}
            {activeTab === 'delivery' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold" style={{ color: '#1A1A2E' }}>Delivery Zones</h2>
                  <button
                    onClick={() => setShowAddZone(true)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
                    style={{ backgroundColor: '#1B4332' }}
                  >
                    <Plus size={16} /> Add Zone
                  </button>
                </div>

                <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid #E5E7EB' }}>
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                        <th className="px-4 py-3 text-xs font-semibold uppercase" style={{ color: '#6B7280' }}>Zone</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase" style={{ color: '#6B7280' }}>Delivery Fee</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase" style={{ color: '#6B7280' }}>Est. Time</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase" style={{ color: '#6B7280' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {zones.map((zone, idx) => (
                        <tr key={zone.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                          <td className="px-4 py-3 font-medium" style={{ color: '#1A1A2E' }}>{zone.name}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <span style={{ color: '#6B7280' }}>&#8369;</span>
                              <input
                                type="number"
                                value={zone.fee}
                                onChange={(e) => handleZoneFeeChange(idx, Number(e.target.value))}
                                className="w-20 rounded px-2 py-1 text-sm"
                                style={{ border: '1px solid #E5E7EB', color: '#1A1A2E' }}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3" style={{ color: '#6B7280' }}>{zone.estimatedTime}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleRemoveZone(idx)}
                              className="rounded p-1 text-red-500 transition-colors hover:bg-red-50"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Add Zone inline form */}
                {showAddZone && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="rounded-lg p-4"
                    style={{ border: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}
                  >
                    <h3 className="mb-3 text-sm font-semibold" style={{ color: '#1A1A2E' }}>Add New Zone</h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-xs" style={{ color: '#6B7280' }}>Zone Name</label>
                        <input
                          type="text"
                          value={newZone.name}
                          onChange={(e) => setNewZone((z) => ({ ...z, name: e.target.value }))}
                          className="w-full rounded-lg px-3 py-2 text-sm"
                          style={{ border: '1px solid #E5E7EB', color: '#1A1A2E' }}
                          placeholder="e.g., Las Pinas"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs" style={{ color: '#6B7280' }}>Delivery Fee</label>
                        <input
                          type="number"
                          value={newZone.fee}
                          onChange={(e) => setNewZone((z) => ({ ...z, fee: Number(e.target.value) }))}
                          className="w-full rounded-lg px-3 py-2 text-sm"
                          style={{ border: '1px solid #E5E7EB', color: '#1A1A2E' }}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs" style={{ color: '#6B7280' }}>Est. Time</label>
                        <input
                          type="text"
                          value={newZone.estimatedTime}
                          onChange={(e) => setNewZone((z) => ({ ...z, estimatedTime: e.target.value }))}
                          className="w-full rounded-lg px-3 py-2 text-sm"
                          style={{ border: '1px solid #E5E7EB', color: '#1A1A2E' }}
                          placeholder="e.g., 60-90 min"
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={handleAddZone}
                        className="rounded-lg px-4 py-2 text-sm font-medium text-white"
                        style={{ backgroundColor: '#1B4332' }}
                      >
                        Add
                      </button>
                      <button
                        onClick={() => setShowAddZone(false)}
                        className="rounded-lg px-4 py-2 text-sm font-medium"
                        style={{ color: '#6B7280', border: '1px solid #E5E7EB' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Order cutoff settings */}
                <div>
                  <h3 className="mb-3 text-lg font-semibold" style={{ color: '#1A1A2E' }}>Order Cutoff Times</h3>
                  <div className="space-y-3">
                    {deliveryDays.map((day) => (
                      <div key={day} className="flex flex-wrap items-center gap-3 rounded-lg p-3" style={{ border: '1px solid #E5E7EB' }}>
                        <span className="w-24 text-sm font-medium" style={{ color: '#1A1A2E' }}>{day} deliveries:</span>
                        <span className="text-sm" style={{ color: '#6B7280' }}>cutoff</span>
                        <Select
                          value={cutoffs[day]?.day || ''}
                          onValueChange={(value) => setCutoffs((c) => ({ ...c, [day]: { ...c[day], day: value } }))}
                        >
                          <SelectTrigger className="w-[140px] bg-white text-sm">
                            <SelectValue placeholder="Select day" />
                          </SelectTrigger>
                          <SelectContent>
                            {dayOptions.map((d) => (
                              <SelectItem key={d} value={d}>{d}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <input
                          type="time"
                          value={cutoffs[day]?.time || '18:00'}
                          onChange={(e) => setCutoffs((c) => ({ ...c, [day]: { ...c[day], time: e.target.value } }))}
                          className="rounded-lg px-3 py-1.5 text-sm"
                          style={{ border: '1px solid #E5E7EB', color: '#1A1A2E' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => showToast('Delivery settings saved')}
                  className="rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90"
                  style={{ backgroundColor: '#1B4332' }}
                >
                  Save Changes
                </button>
              </motion.div>
            )}

            {/* PAYMENTS TAB */}
            {activeTab === 'payments' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <h2 className="text-lg font-semibold" style={{ color: '#1A1A2E' }}>Payment Methods</h2>
                <div className="space-y-3">
                  {paymentMethodsConfig.map((method) => (
                    <div key={method.id} className="rounded-lg p-4 transition-all" style={{ border: '1px solid #E5E7EB', backgroundColor: method.enabled ? '#FFFFFF' : '#F9FAFB' }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{method.icon}</span>
                          <span className="text-sm font-medium" style={{ color: '#1A1A2E' }}>{method.name}</span>
                        </div>
                        <button
                          onClick={() => updatePaymentMethod(method.id, 'enabled', !method.enabled)}
                          className="relative flex h-6 w-11 shrink-0 items-center rounded-full transition-colors"
                          style={{ backgroundColor: method.enabled ? '#40916C' : '#D1D5DB' }}
                        >
                          <span
                            className={`absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${method.enabled ? 'translate-x-5' : 'translate-x-0'}`}
                          />
                        </button>
                      </div>

                      {method.enabled && method.id !== 'cod' && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 pt-4" style={{ borderTop: '1px solid #E5E7EB' }}>
                          <div>
                            <label className="mb-1 block text-xs font-medium" style={{ color: '#1A1A2E' }}>Display Name</label>
                            <input
                              type="text"
                              value={method.displayName}
                              onChange={(e) => updatePaymentMethod(method.id, 'displayName', e.target.value)}
                              className="w-full rounded-lg px-3 py-2 text-sm"
                              style={{ border: '1px solid #E5E7EB', color: '#1A1A2E' }}
                              placeholder={method.name}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium" style={{ color: '#1A1A2E' }}>Account Number</label>
                            <input
                              type="text"
                              value={method.accountNumber}
                              onChange={(e) => updatePaymentMethod(method.id, 'accountNumber', e.target.value)}
                              className="w-full rounded-lg px-3 py-2 text-sm"
                              style={{ border: '1px solid #E5E7EB', color: '#1A1A2E' }}
                              placeholder="e.g., 0917 123 4567"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium" style={{ color: '#1A1A2E' }}>Email (Optional)</label>
                            <input
                              type="email"
                              value={method.email}
                              onChange={(e) => updatePaymentMethod(method.id, 'email', e.target.value)}
                              className="w-full rounded-lg px-3 py-2 text-sm"
                              style={{ border: '1px solid #E5E7EB', color: '#1A1A2E' }}
                              placeholder="e.g., payments@domain.com"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium" style={{ color: '#1A1A2E' }}>QR Code Image</label>
                            <div
                                className="flex items-center justify-center rounded-lg py-1.5 cursor-pointer transition-colors hover:bg-gray-50"
                                style={{ border: '1px dashed #E5E7EB', backgroundColor: '#F9FAFB' }}
                                onClick={() => showToast('QR Code upload clicked')}
                              >
                                <div className="text-center flex gap-2 items-center">
                                  <Upload size={16} style={{ color: '#6B7280' }} />
                                  <span className="text-xs" style={{ color: '#6B7280' }}>
                                    {method.qrCode ? 'Change QR Code' : 'Upload QR Code'}
                                  </span>
                                </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  ))}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium" style={{ color: '#1A1A2E' }}>Minimum Order Amount</label>
                  <div className="flex items-center gap-2">
                    <span style={{ color: '#6B7280' }}>&#8369;</span>
                    <input
                      type="number"
                      value={minOrder}
                      onChange={(e) => setMinOrder(Number(e.target.value))}
                      className="w-32 rounded-lg px-3 py-2 text-sm"
                      style={{ border: '1px solid #E5E7EB', color: '#1A1A2E' }}
                    />
                  </div>
                </div>

                <button
                  onClick={() => showToast('Payment settings saved')}
                  className="rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90"
                  style={{ backgroundColor: '#1B4332' }}
                >
                  Save Changes
                </button>
              </motion.div>
            )}

            {/* NOTIFICATIONS TAB */}
            {activeTab === 'notifications' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <h2 className="text-lg font-semibold" style={{ color: '#1A1A2E' }}>Notification Templates</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {templates.map((t) => (
                    <div key={t.id} className="rounded-lg p-4" style={{ border: '1px solid #E5E7EB' }}>
                      <h3 className="text-sm font-semibold" style={{ color: '#1A1A2E' }}>{t.name}</h3>
                      <p className="mt-1 text-xs leading-relaxed" style={{ color: '#6B7280' }}>
                        {t.snippet}
                      </p>
                      <button
                        onClick={() => openTemplateEditor(t)}
                        className="mt-3 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:bg-gray-100"
                        style={{ color: '#1B4332', border: '1px solid #E5E7EB' }}
                      >
                        Edit Template
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* TAX TAB */}
            {activeTab === 'tax' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                <h2 className="text-lg font-semibold" style={{ color: '#1A1A2E' }}>Tax Settings</h2>
                <div>
                  <label className="mb-1 block text-sm font-medium" style={{ color: '#1A1A2E' }}>VAT Rate (%)</label>
                  <input
                    type="number"
                    value={vatRate}
                    onChange={(e) => setVatRate(Number(e.target.value))}
                    className="w-32 rounded-lg px-3 py-2 text-sm"
                    style={{ border: '1px solid #E5E7EB', color: '#1A1A2E' }}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium" style={{ color: '#1A1A2E' }}>Pricing Model</label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setTaxInclusive(true)}
                      className="rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
                      style={{
                        backgroundColor: taxInclusive ? '#1B4332' : '#FFFFFF',
                        color: taxInclusive ? '#FFFFFF' : '#1A1A2E',
                        border: taxInclusive ? 'none' : '1px solid #E5E7EB',
                      }}
                    >
                      Tax-inclusive pricing
                    </button>
                    <button
                      onClick={() => setTaxInclusive(false)}
                      className="rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
                      style={{
                        backgroundColor: !taxInclusive ? '#1B4332' : '#FFFFFF',
                        color: !taxInclusive ? '#FFFFFF' : '#1A1A2E',
                        border: !taxInclusive ? 'none' : '1px solid #E5E7EB',
                      }}
                    >
                      Tax-exclusive pricing
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium" style={{ color: '#1A1A2E' }}>Tax ID</label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="e.g., 123-456-789-000"
                    className="w-full max-w-sm rounded-lg px-3 py-2 text-sm"
                    style={{ border: '1px solid #E5E7EB', color: '#1A1A2E' }}
                  />
                </div>
                <button
                  onClick={() => showToast('Tax settings saved')}
                  className="rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90"
                  style={{ backgroundColor: '#1B4332' }}
                >
                  Save
                </button>
              </motion.div>
            )}

            {/* TEAM TAB */}
            {activeTab === 'team' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold" style={{ color: '#1A1A2E' }}>Team Members</h2>
                  <button
                    onClick={() => setInviteModalOpen(true)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
                    style={{ backgroundColor: '#1B4332' }}
                  >
                    <Plus size={16} /> Invite Team Member
                  </button>
                </div>

                <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid #E5E7EB' }}>
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                        <th className="px-4 py-3 text-xs font-semibold uppercase" style={{ color: '#6B7280' }}>Name</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase" style={{ color: '#6B7280' }}>Email</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase" style={{ color: '#6B7280' }}>Role</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase" style={{ color: '#6B7280' }}>Status</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase" style={{ color: '#6B7280' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {team.map((member) => (
                        <tr key={member.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                          <td className="px-4 py-3 font-medium" style={{ color: '#1A1A2E' }}>{member.name}</td>
                          <td className="px-4 py-3" style={{ color: '#6B7280' }}>{member.email}</td>
                          <td className="px-4 py-3">
                            <Select
                              value={member.role}
                              onValueChange={(value) => handleTeamRoleChange(member.id, value)}
                              disabled={member.role === 'Owner'}
                            >
                              <SelectTrigger className="w-[150px] bg-white text-sm disabled:opacity-50">
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent>
                                {roleOptions.map((r) => (
                                  <SelectItem key={r} value={r}>{r}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="rounded-full px-2 py-0.5 text-xs font-medium capitalize"
                              style={{
                                backgroundColor: member.status === 'active' ? '#D1FAE5' : '#FEF3C7',
                                color: member.status === 'active' ? '#065F46' : '#92400E',
                              }}
                            >
                              {member.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {member.role !== 'Owner' && (
                              <button
                                onClick={() => handleRemoveTeamMember(member.id)}
                                className="rounded p-1 text-red-500 transition-colors hover:bg-red-50"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Template Editor Modal */}
      <Modal isOpen={editingTemplate !== null} onClose={() => setEditingTemplate(null)} title={`Edit: ${editingTemplate?.name || ''}`} size="lg">
        <div className="space-y-4">
          {!previewTemplate ? (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium" style={{ color: '#1A1A2E' }}>Subject Line</label>
                <input
                  type="text"
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm((f) => ({ ...f, subject: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ border: '1px solid #E5E7EB', color: '#1A1A2E' }}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium" style={{ color: '#1A1A2E' }}>Body</label>
                <textarea
                  value={templateForm.body}
                  onChange={(e) => setTemplateForm((f) => ({ ...f, body: e.target.value }))}
                  rows={8}
                  className="w-full rounded-lg px-3 py-2 text-sm font-mono"
                  style={{ border: '1px solid #E5E7EB', color: '#1A1A2E' }}
                />
                <p className="mt-1 text-xs" style={{ color: '#6B7280' }}>
                  Available tokens: {'{customer_name}'}, {'{order_id}'}, {'{delivery_date}'}
                </p>
              </div>
            </>
          ) : (
            <div className="rounded-lg p-4" style={{ border: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
              <p className="mb-2 text-xs font-semibold uppercase" style={{ color: '#6B7280' }}>Preview</p>
              <p className="mb-3 text-sm font-semibold" style={{ color: '#1A1A2E' }}>
                Subject: {renderPreview(templateForm.subject)}
              </p>
              <div className="whitespace-pre-wrap text-sm" style={{ color: '#1A1A2E' }}>
                {renderPreview(templateForm.body)}
              </div>
            </div>
          )}
          <div className="flex justify-between pt-2" style={{ borderTop: '1px solid #E5E7EB' }}>
            <button
              onClick={() => setPreviewTemplate(!previewTemplate)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-100"
              style={{ color: '#6B7280', border: '1px solid #E5E7EB' }}
            >
              <Eye size={16} /> {previewTemplate ? 'Edit' : 'Preview'}
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => setEditingTemplate(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-100"
                style={{ color: '#6B7280', border: '1px solid #E5E7EB' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: '#1B4332' }}
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Invite Team Member Modal */}
      <Modal isOpen={inviteModalOpen} onClose={() => setInviteModalOpen(false)} title="Invite Team Member" size="sm">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: '#1A1A2E' }}>Email Address</label>
            <input
              type="email"
              value={inviteForm.email}
              onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="colleague@example.com"
              className="w-full rounded-lg px-3 py-2 text-sm"
              style={{ border: '1px solid #E5E7EB', color: '#1A1A2E' }}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: '#1A1A2E' }}>Role</label>
            <Select
              value={inviteForm.role}
              onValueChange={(value) => setInviteForm((f) => ({ ...f, role: value }))}
            >
              <SelectTrigger className="w-full bg-white text-sm">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.filter((r) => r !== 'Owner').map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setInviteModalOpen(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-100"
              style={{ color: '#6B7280', border: '1px solid #E5E7EB' }}
            >
              Cancel
            </button>
            <button
              onClick={handleInvite}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: '#1B4332' }}
            >
              Send Invitation
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
