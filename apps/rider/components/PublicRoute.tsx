'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/AuthContext';
import XYLLoader from './loaders/XYLLoader';

interface PublicRouteProps {
  children: React.ReactNode;
}

export default function PublicRoute({ children }: PublicRouteProps) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && profile) {
      const nextPath = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('next') || ''
        : '';
      if (nextPath.startsWith('/dashboard') || nextPath.startsWith('/invite')) {
        router.push(nextPath);
        return;
      }

      // Redirect logged-in users to their dashboard
      if (profile.role === 'admin') {
        router.push('/dashboard/admin');
      } else if (profile.role === 'staff') {
        router.push('/dashboard/staff');
      } else if (profile.role === 'customer') {
        router.push('/dashboard/customer');
      }
    }
  }, [user, profile, loading, router]);

  // Show XYLLoader while checking authentication or redirecting
  if (loading || (user && profile)) {
    return <XYLLoader />;
  }

  // Render children for public access
  return <>{children}</>;
}