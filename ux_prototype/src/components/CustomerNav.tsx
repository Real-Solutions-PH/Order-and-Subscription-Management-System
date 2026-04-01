'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, Menu, X } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export default function CustomerNav() {
  const { itemCount } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { label: 'Menu', href: '/#menu' },
    { label: 'Meal Plans', href: '/meal-plan' },
    { label: 'My Account', href: '/dashboard' },
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
        <div className="flex items-center gap-4">
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
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
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
        </nav>
      )}
    </header>
  );
}
