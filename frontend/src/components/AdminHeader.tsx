'use client';

import React, { useState } from 'react';
import {
  Clock,
  AlertCircle,
  AlertTriangle,
  UserPlus,
} from 'lucide-react';
import NotificationBell, { type AlertItem } from '@/components/ui/notifications';

const initialAlerts: AlertItem[] = [
  {
    id: '1',
    type: 'warning',
    icon: Clock,
    text: 'Menu cutoff in 4 hours',
    time: '2 min ago',
    action: 'View Menu',
    read: false,
  },
  {
    id: '2',
    type: 'error',
    icon: AlertCircle,
    text: '3 failed payments need attention',
    time: '15 min ago',
    action: 'Review',
    read: false,
  },
  {
    id: '3',
    type: 'warning',
    icon: AlertTriangle,
    text: 'Low stock: Salmon Fillet (2 portions left)',
    time: '1 hr ago',
    action: 'Restock',
    read: false,
  },
  {
    id: '4',
    type: 'info',
    icon: UserPlus,
    text: 'New subscriber: Carlos Mendoza',
    time: '3 hrs ago',
    action: 'View',
    read: false,
  },
];

export default function AdminHeader() {
  const [alerts, setAlerts] = useState<AlertItem[]>(initialAlerts);

  const handleMarkAsRead = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, read: true } : a))
    );
  };

  const handleMarkAllAsRead = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
  };

  return (
    <header
      className="flex h-14 items-center justify-end px-4 lg:px-8"
      style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
      }}
    >
      <NotificationBell
        alerts={alerts}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
      />
    </header>
  );
}
