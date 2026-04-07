"use client";

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { useAuth } from "@/hooks/useAuth";
import { getAccessToken } from "@/lib/api-client";
import { parseJwt } from "@/lib/jwt";
import type { UserResponse } from "@/lib/api-client";

type AuthTab = "login" | "register";

interface AuthContextType {
  user: UserResponse | null;
  roles: string[];
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;

  login: ReturnType<typeof useAuth>["login"];
  isLoggingIn: boolean;
  register: ReturnType<typeof useAuth>["register"];
  isRegistering: boolean;
  logout: ReturnType<typeof useAuth>["logout"];
  updateProfile: ReturnType<typeof useAuth>["updateProfile"];
  isUpdatingProfile: boolean;

  isAuthModalOpen: boolean;
  authModalTab: AuthTab;
  openAuthModal: (tab?: AuthTab) => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<AuthTab>("login");

  const { roles, permissions } = useMemo(() => {
    const token = getAccessToken();
    if (!token) return { roles: [] as string[], permissions: [] as string[] };
    const payload = parseJwt(token);
    return {
      roles: payload?.roles ?? [],
      permissions: payload?.permissions ?? [],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.user]);

  const isAdmin = roles.includes("admin") || auth.user?.is_superuser === true;

  const openAuthModal = useCallback((tab: AuthTab = "login") => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
  }, []);

  // Close the modal automatically when the user becomes authenticated
  useEffect(() => {
    if (auth.isAuthenticated && isAuthModalOpen) {
      setAuthModalOpen(false);
    }
  }, [auth.isAuthenticated, isAuthModalOpen]);

  const value: AuthContextType = {
    user: auth.user,
    roles,
    permissions,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    isAdmin,
    login: auth.login,
    isLoggingIn: auth.isLoggingIn,
    register: auth.register,
    isRegistering: auth.isRegistering,
    logout: auth.logout,
    updateProfile: auth.updateProfile,
    isUpdatingProfile: auth.isUpdatingProfile,
    isAuthModalOpen,
    authModalTab,
    openAuthModal,
    closeAuthModal,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context)
    throw new Error("useAuthContext must be used within AuthProvider");
  return context;
}
