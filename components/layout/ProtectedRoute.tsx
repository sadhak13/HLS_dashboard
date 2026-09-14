"use client";

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ROLE_HOME_ROUTE, type Role } from '@/constants/roles';

export function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: Role[] }) {
  const { user, profile, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return; // Wait until auth state is determined

    if (!user) {
      router.push('/login');
      return;
    }

    if (profile && !allowedRoles.includes(profile.role)) {
      router.push(ROLE_HOME_ROUTE[profile.role]);
      return;
    }

    if (user?.user_metadata?.must_change_password && pathname !== '/change-password') {
      router.push('/change-password');
    }
  }, [user, profile, isLoading, allowedRoles, router, pathname]);

  // Show spinner while loading or waiting for profile
  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-950">
        <svg className="w-8 h-8 text-green-600 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  // Role mismatch — render nothing while redirect is processing
  if (!profile || !allowedRoles.includes(profile.role)) {
    return null;
  }

  return <>{children}</>;
}
