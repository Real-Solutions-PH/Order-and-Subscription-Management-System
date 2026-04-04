'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/context/AuthContext';

interface RequireAuthProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

function LoadingSkeleton() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#1B4332]" />
    </div>
  );
}

export default function RequireAuth({ children, fallback }: RequireAuthProps) {
  const { isAuthenticated, isLoading, openAuthModal } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/');
      openAuthModal('login');
    }
  }, [isLoading, isAuthenticated, router, openAuthModal]);

  if (isLoading) {
    return <>{fallback ?? <LoadingSkeleton />}</>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
