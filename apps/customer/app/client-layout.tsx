'use client';

import { useEffect } from 'react';
import SupabaseProvider from './supabase-provider';
import { AuthProvider } from '../lib/AuthContext';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development' || typeof window === 'undefined') {
      return;
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then((registrations) => {
          registrations.forEach((registration) => {
            registration.unregister();
          });
        })
        .catch(() => undefined);
    }

    if ('caches' in window) {
      caches.keys()
        .then((cacheNames) => Promise.all(
          cacheNames
            .filter((name) => name.startsWith('xylem-'))
            .map((name) => caches.delete(name))
        ))
        .catch(() => undefined);
    }
  }, []);

  return (
    <SupabaseProvider>
      <AuthProvider>
        <div className="min-h-screen w-full">
          {children}
        </div>
      </AuthProvider>
    </SupabaseProvider>
  );
}
