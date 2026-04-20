"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/context/AuthContext";

interface RequireRoleProps {
  role: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

function LoadingSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#1B4332]" />
    </div>
  );
}

export default function RequireRole({
  role,
  children,
  fallback,
}: RequireRoleProps) {
  const { isAuthenticated, isLoading, roles, openAuthModal } = useAuthContext();
  const router = useRouter();

  const hasRole =
    roles.includes(role) || (role === "admin" && roles.includes("superadmin"));

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/");
      openAuthModal("login");
      return;
    }
    if (!isLoading && isAuthenticated && !hasRole) {
      router.replace("/");
    }
  }, [isLoading, isAuthenticated, hasRole, router, openAuthModal]);

  if (isLoading) {
    return <>{fallback ?? <LoadingSkeleton />}</>;
  }

  if (!isAuthenticated || !hasRole) {
    return null;
  }

  return <>{children}</>;
}
