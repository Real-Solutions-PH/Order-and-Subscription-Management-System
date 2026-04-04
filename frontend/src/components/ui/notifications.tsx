"use client";

import * as React from "react";
import { useState } from "react";
import { Bell, type LucideIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface AlertItem {
  id: string;
  type: "warning" | "error" | "info";
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
    iconColor: "#D97706",
    bg: "#FFFBEB",
    border: "#FDE68A",
    actionBg: "#D97706",
  },
  error: {
    iconColor: "#DC2626",
    bg: "#FEF2F2",
    border: "#FECACA",
    actionBg: "#DC2626",
  },
  info: {
    iconColor: "#2563EB",
    bg: "#EFF6FF",
    border: "#BFDBFE",
    actionBg: "#2563EB",
  },
};

export default function NotificationBell({
  alerts,
  onMarkAsRead,
  onMarkAllAsRead,
  onActionClick,
}: NotificationBellProps) {
  const [tab, setTab] = useState<"unread" | "read">("unread");
  const unreadCount = alerts.filter((a) => !a.read).length;
  const filtered = alerts.filter((a) => (tab === "unread" ? !a.read : a.read));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative inline-flex items-center justify-center rounded-full p-2 transition-colors"
          style={{ color: "#6B7280" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "#F3F4F6")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "transparent")
          }
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
              style={{ backgroundColor: "#DC2626" }}
            >
              {unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-96 p-0"
        align="end"
        side="bottom"
        sideOffset={8}
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #E5E7EB",
          borderRadius: 12,
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid #E5E7EB" }}
        >
          <h3
            className="text-sm font-semibold"
            style={{
              color: "#1A1A2E",
              fontFamily: "'DM Serif Display', serif",
            }}
          >
            Notifications
          </h3>
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              className="text-xs font-medium transition-colors hover:underline"
              style={{ color: "#1B4332" }}
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex" style={{ borderBottom: "1px solid #E5E7EB" }}>
          {(["unread", "read"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 px-4 py-2 text-xs font-medium capitalize transition-colors"
              style={{
                color: tab === t ? "#1B4332" : "#6B7280",
                borderBottom:
                  tab === t ? "2px solid #1B4332" : "2px solid transparent",
                backgroundColor: tab === t ? "#F0FDF4" : "transparent",
              }}
            >
              {t}
              {t === "unread" && unreadCount > 0 && (
                <span
                  className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                  style={{ backgroundColor: "#DC2626" }}
                >
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
              <Bell
                className="mx-auto mb-2 h-8 w-8"
                style={{ color: "#D1D5DB" }}
              />
              <p className="text-sm" style={{ color: "#6B7280" }}>
                {tab === "unread" ? "All caught up!" : "No read notifications"}
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
                    className="flex items-start gap-3 px-4 py-3 transition-colors"
                    style={{
                      backgroundColor: !alert.read ? style.bg : "transparent",
                      borderBottom: "1px solid #F3F4F6",
                      cursor: !alert.read ? "pointer" : "default",
                    }}
                    onClick={() => {
                      if (!alert.read) onMarkAsRead?.(alert.id);
                    }}
                  >
                    <div
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: `${style.iconColor}15` }}
                    >
                      <Icon size={14} style={{ color: style.iconColor }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-sm leading-snug"
                        style={{
                          color: "#1A1A2E",
                          fontWeight: !alert.read ? 600 : 400,
                        }}
                      >
                        {alert.text}
                      </p>
                      <p
                        className="mt-0.5 text-xs"
                        style={{ color: "#9CA3AF" }}
                      >
                        {alert.time}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onActionClick?.(alert);
                      }}
                      className="mt-0.5 shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium text-white transition-opacity hover:opacity-80"
                      style={{ backgroundColor: style.actionBg }}
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
