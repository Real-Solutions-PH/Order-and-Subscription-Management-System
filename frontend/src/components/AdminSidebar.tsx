"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  ChefHat,
  UtensilsCrossed,
  Utensils,
  Leaf,
  Users,
  Shield,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { useAuthContext } from "@/context/AuthContext";

export default function AdminSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isSuperAdmin } = useAuthContext();

  const navItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Orders", href: "/admin/orders", icon: ClipboardList },
    { label: "Production", href: "/admin/production", icon: ChefHat },
    { label: "Menu", href: "/admin/menu", icon: UtensilsCrossed },
    { label: "Menu Items", href: "/admin/menu-items", icon: Utensils },
    { label: "Ingredients", href: "/admin/ingredients", icon: Leaf },
    { label: "Customers", href: "/admin/customers", icon: Users },
    ...(isSuperAdmin
      ? [
          {
            label: "User Management",
            href: "/admin/user-management",
            icon: Shield,
          },
        ]
      : []),
    { label: "Settings", href: "/admin/settings", icon: Settings },
  ];

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  const sidebarContent = (
    <div
      className="flex h-full flex-col"
      style={{ backgroundColor: "#1A1A2E" }}
    >
      {/* Logo */}
      <div
        className="flex h-16 items-center px-6"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
      >
        <span
          className="text-xl font-bold tracking-tight text-white"
          style={{ fontFamily: "'DM Serif Display', serif" }}
        >
          PrepFlow{" "}
          <span className="text-sm font-normal" style={{ color: "#40916C" }}>
            Admin
          </span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150"
              style={{
                color: active ? "#FFFFFF" : "rgba(255,255,255,0.6)",
                backgroundColor: active ? "#40916C" : "transparent",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor =
                    "rgba(255,255,255,0.08)";
                  e.currentTarget.style.color = "#FFFFFF";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "rgba(255,255,255,0.6)";
                }
              }}
            >
              <Icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        className="fixed left-4 top-4 z-50 rounded-lg p-2 shadow-md lg:hidden"
        style={{ backgroundColor: "#1A1A2E" }}
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? "Close sidebar" : "Open sidebar"}
      >
        {mobileOpen ? (
          <X size={20} className="text-white" />
        ) : (
          <Menu size={20} className="text-white" />
        )}
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-200 lg:hidden"
        style={{
          transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden h-screen w-64 flex-shrink-0 sticky top-0 lg:block">
        {sidebarContent}
      </aside>
    </>
  );
}
