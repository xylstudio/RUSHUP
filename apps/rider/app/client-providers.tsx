'use client';

import React from 'react';
import SupabaseProvider from './supabase-provider';
import { AuthProvider } from '../lib/AuthContext';
import { I18nProvider } from '../lib/I18nContext';
import { ToastProvider } from '@/components/Toast';
import { QueryProvider } from '../lib/query-client';

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SupabaseProvider>
      <AuthProvider>
        <QueryProvider>
          <I18nProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </I18nProvider>
        </QueryProvider>
      </AuthProvider>
    </SupabaseProvider>
  );
}
