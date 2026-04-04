'use client';

import * as React from 'react';
import { useState } from 'react';
import { Bell, type LucideIcon } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface AlertItem {
  id: string;
  type: 'warning' | 'error' | 'info';
  icon: LucideIcon;
  text: string;
  time: string;
  action: string;
  read: boolean;
}

interface NotificationBellProps {
  alerts: AlertItem[];
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onActionClick?: (alert: AlertItem) => void;
}

const alertStyles = {
  warning: {
    iconColorClass: 'text-warning',
    iconBgClass: 'bg-warning/8',
    bgClass: 'bg-warning-light',
    actionBgClass: 'bg-warning',
  },
  error: {
    iconColorClass: 'text-error',
    iconBgClass: 'bg-error/8',
    bgClass: 'bg-error-light',
    actionBgClass: 'bg-error',
  },
  info: {
    iconColorClass: 'text-info',
    iconBgClass: 'bg-info/8',
    bgClass: 'bg-info-light',
    actionBgClass: 'bg-info',
  },
};

export default function NotificationBell({
  alerts,
  onMarkAsRead,
  onMarkAllAsRead,
  onActionClick,
}: NotificationBellProps) {
  const [tab, setTab] = useState<'unread' | 'read'>('unread');
  const unreadCount = alerts.filter((a) => !a.read).length;
  const filtered = alerts.filter((a) => (tab === 'unread' ? !a.read : a.read));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative inline-flex items-center justify-center rounded-full p-2 transition-colors text-text-secondary hover:bg-muted"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white bg-error">
              {unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-96 p-0 bg-surface-white border border-border rounded-xl shadow-elevated"
        align="end"
        side="bottom"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-display text-sm font-semibold text-text-primary">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              className="text-xs font-medium transition-colors hover:underline text-primary"
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {(['unread', 'read'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 px-4 py-2 text-xs font-medium capitalize transition-colors ${
                tab === t
                  ? 'text-primary border-b-2 border-primary bg-success-light'
                  : 'text-text-secondary border-b-2 border-transparent bg-transparent'
              }`}
            >
              {t}
              {t === 'unread' && unreadCount > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white bg-error">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Alert List */}
        <div className="max-h-80 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="py-8 text-center">
              <Bell className="mx-auto mb-2 h-8 w-8 text-gray-300" />
              <p className="text-sm text-text-secondary">
                {tab === 'unread' ? 'All caught up!' : 'No read notifications'}
              </p>
            </div>
          ) : (
            <ul>
              {filtered.map((alert) => {
                const Icon = alert.icon;
                const style = alertStyles[alert.type];
                return (
                  <li
                    key={alert.id}
                    className={`flex items-start gap-3 px-4 py-3 transition-colors border-b border-muted ${
                      !alert.read ? style.bgClass : 'bg-transparent'
                    } ${!alert.read ? 'cursor-pointer' : 'cursor-default'}`}
                    onClick={() => {
                      if (!alert.read) onMarkAsRead?.(alert.id);
                    }}
                  >
                    <div
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${style.iconColorClass} ${style.iconBgClass}`}
                    >
                      <Icon size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm leading-snug text-text-primary ${!alert.read ? 'font-semibold' : 'font-normal'}`}
                      >
                        {alert.text}
                      </p>
                      <p className="mt-0.5 text-xs text-text-tertiary">
                        {alert.time}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onActionClick?.(alert);
                      }}
                      className={`mt-0.5 shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium text-white transition-opacity hover:opacity-80 ${style.actionBgClass}`}
                    >
                      {alert.action}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
