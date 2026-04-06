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

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/");
      openAuthModal("login");
      return;
    }
    if (!isLoading && isAuthenticated && !roles.includes(role)) {
      router.replace("/");
    }
  }, [isLoading, isAuthenticated, roles, role, router, openAuthModal]);

  if (isLoading) {
    return <>{fallback ?? <LoadingSkeleton />}</>;
  }

  if (!isAuthenticated || !roles.includes(role)) {
    return null;
  }

  return <>{children}</>;
}
