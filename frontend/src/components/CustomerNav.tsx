"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Menu,
  X,
  LogOut,
  User,
  LayoutDashboard,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuthContext } from "@/context/AuthContext";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function CustomerNav() {
  const { itemCount } = useCart();
  const { isAuthenticated, user, logout, openAuthModal } = useAuthContext();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { label: "Menu", href: "/#menu" },
    { label: "Meal Plans", href: "/meal-plan" },
  ];

  return (
    <header
      className="sticky top-0 z-50 bg-white"
      style={{ borderBottom: '1px solid #E5E7EB' }}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1">
          <span
            className="text-2xl"
            style={{ fontFamily: "'DM Serif Display', serif", color: '#1B4332' }}
          >
            PrepFlow
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium transition-colors duration-150 hover:opacity-80"
              style={{ color: '#1A1A2E' }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right section */}
        <div className="flex items-center gap-3">
          {/* Auth: User dropdown or Sign In */}
          {isAuthenticated ? (
            <Popover>
              <PopoverTrigger asChild>
                <button className="hidden items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-50 md:flex">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: "#1B4332" }}
                  >
                    {user?.first_name?.[0]}
                    {user?.last_name?.[0]}
                  </div>
                  <span
                    className="hidden text-sm font-medium lg:inline"
                    style={{ color: "#1A1A2E" }}
                  >
                    {user?.first_name}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                sideOffset={8}
                className="w-48 rounded-xl border bg-white p-2 shadow-lg"
                style={{ borderColor: "#E5E7EB" }}
              >
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-50"
                  style={{ color: "#1A1A2E" }}
                >
                  <LayoutDashboard size={16} style={{ color: "#6B7280" }} />
                  My Account
                </Link>
                <button
                  onClick={() => logout()}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-50"
                  style={{ color: "#EF4444" }}
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </PopoverContent>
            </Popover>
          ) : (
            <button
              onClick={() => openAuthModal("login")}
              className="hidden rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 md:inline-flex"
              style={{ backgroundColor: "#E76F51" }}
            >
              Sign In
            </button>
          )}

          {/* Cart */}
          <Link href="/checkout" className="relative p-2">
            <ShoppingBag size={22} style={{ color: '#1A1A2E' }} />
            {itemCount > 0 && (
              <span
                className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: '#E76F51' }}
              >
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </Link>

          {/* Mobile hamburger */}
          <button
            className="p-2 md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? (
              <X size={24} style={{ color: '#1A1A2E' }} />
            ) : (
              <Menu size={24} style={{ color: '#1A1A2E' }} />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <nav
          className="border-t px-4 pb-4 pt-2 md:hidden"
          style={{ borderColor: '#E5E7EB', backgroundColor: '#FFFFFF' }}
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
              style={{ color: '#1A1A2E' }}
            >
              {link.label}
            </Link>
          ))}
          {isAuthenticated ? (
            <>
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
                style={{ color: "#1A1A2E" }}
              >
                <User size={16} style={{ color: "#6B7280" }} />
                My Account
              </Link>
              <button
                onClick={() => {
                  logout();
                  setMobileOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
                style={{ color: "#EF4444" }}
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                openAuthModal("login");
                setMobileOpen(false);
              }}
              className="mt-2 w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#E76F51" }}
            >
              Sign In
            </button>
          )}
        </nav>
      )}
    </header>
  );
}
