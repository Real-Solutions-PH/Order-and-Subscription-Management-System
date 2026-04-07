"use client";

import React, { useState, useEffect } from "react";
import { Loader2, Mail, Lock, User, Phone } from "lucide-react";
import Modal from "@/components/Modal";
import { useAuthContext } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { ApiError } from "@/lib/api-client";

type Tab = "login" | "register";

export default function AuthModal() {
  const {
    isAuthModalOpen,
    authModalTab,
    closeAuthModal,
    login,
    register,
    isLoggingIn,
    isRegistering,
  } = useAuthContext();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>(authModalTab);
  const [error, setError] = useState("");

  // Login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register fields
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");

  useEffect(() => {
    setActiveTab(authModalTab);
  }, [authModalTab]);

  // Clear errors when switching tabs
  useEffect(() => {
    setError("");
  }, [activeTab]);

  function resetForms() {
    setLoginEmail("");
    setLoginPassword("");
    setRegFirstName("");
    setRegLastName("");
    setRegEmail("");
    setRegPhone("");
    setRegPassword("");
    setRegConfirm("");
    setError("");
  }

  function handleClose() {
    resetForms();
    closeAuthModal();
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await login({ email: loginEmail, password: loginPassword, tenant_slug: "default" });
      showToast("Welcome back!", "success");
      resetForms();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.detail
          : "Login failed. Please try again.",
      );
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (regPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (regPassword !== regConfirm) {
      setError("Passwords do not match.");
      return;
    }

    try {
      await register({
        email: regEmail,
        password: regPassword,
        first_name: regFirstName,
        last_name: regLastName,
        phone: regPhone || undefined,
        tenant_slug: "default",
      });
      showToast("Account created successfully!", "success");
      resetForms();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.detail
          : "Registration failed. Please try again.",
      );
    }
  }

  const isPending = isLoggingIn || isRegistering;

  const inputClass =
    "w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]";

  return (
    <Modal
      isOpen={isAuthModalOpen}
      onClose={handleClose}
      title={activeTab === "login" ? "Welcome Back" : "Create Account"}
      size="sm"
    >
      {/* Tab Toggle */}
      <div className="mb-6 flex rounded-xl bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => setActiveTab("login")}
          className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
            activeTab === "login"
              ? "bg-[#1B4332] text-white shadow-sm"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("register")}
          className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
            activeTab === "register"
              ? "bg-[#1B4332] text-white shadow-sm"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          Create Account
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Login Form */}
      {activeTab === "login" && (
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Email
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className={`${inputClass} pl-9`}
                style={{ borderColor: "#D1D5DB" }}
                placeholder="you@example.com"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className={`${inputClass} pl-9`}
                style={{ borderColor: "#D1D5DB" }}
                placeholder="Enter your password"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#E76F51" }}
          >
            {isLoggingIn ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
          <p className="text-center text-sm text-gray-500">
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={() => setActiveTab("register")}
              className="font-semibold text-[#1B4332] hover:underline"
            >
              Create one
            </button>
          </p>
        </form>
      )}

      {/* Register Form */}
      {activeTab === "register" && (
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                First Name
              </label>
              <div className="relative">
                <User
                  size={16}
                  className="absolute left-3 top-3 text-gray-400"
                />
                <input
                  type="text"
                  required
                  value={regFirstName}
                  onChange={(e) => setRegFirstName(e.target.value)}
                  className={`${inputClass} pl-9`}
                  style={{ borderColor: "#D1D5DB" }}
                  placeholder="John"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Last Name
              </label>
              <input
                type="text"
                required
                value={regLastName}
                onChange={(e) => setRegLastName(e.target.value)}
                className={inputClass}
                style={{ borderColor: "#D1D5DB" }}
                placeholder="Doe"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Email
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className={`${inputClass} pl-9`}
                style={{ borderColor: "#D1D5DB" }}
                placeholder="you@example.com"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Phone <span className="text-gray-400">(optional)</span>
            </label>
            <div className="relative">
              <Phone
                size={16}
                className="absolute left-3 top-3 text-gray-400"
              />
              <input
                type="tel"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                className={`${inputClass} pl-9`}
                style={{ borderColor: "#D1D5DB" }}
                placeholder="+63 917 123 4567"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="password"
                required
                minLength={8}
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className={`${inputClass} pl-9`}
                style={{ borderColor: "#D1D5DB" }}
                placeholder="Min. 8 characters"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Confirm Password
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="password"
                required
                value={regConfirm}
                onChange={(e) => setRegConfirm(e.target.value)}
                className={`${inputClass} pl-9`}
                style={{ borderColor: "#D1D5DB" }}
                placeholder="Re-enter your password"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#E76F51" }}
          >
            {isRegistering ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </button>
          <p className="text-center text-sm text-gray-500">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => setActiveTab("login")}
              className="font-semibold text-[#1B4332] hover:underline"
            >
              Sign in
            </button>
          </p>
        </form>
      )}
    </Modal>
  );
}
