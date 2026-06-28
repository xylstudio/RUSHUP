'use client'

import React from 'react'
import ProtectedRoute from '../../../lib/ProtectedRoute'
import { ToastProvider } from '@/components/Toast'
import StaffBottomNav from '../../../components/StaffBottomNav'

// SidebarContext is provided from a shared module; no named exports from layout.
const StyleTag = () => (
  <style>{`
    @import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Pridi:wght@300;400;500;600&display=swap");
    * { border-radius: 0 !important; }
    body {
       font-family: 'Plus Jakarta Sans', sans-serif;
       -webkit-font-smoothing: antialiased;
    }
    .font-serif-thai { font-family: 'Pridi', serif; }
  `}</style>
)

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute allowedRoles={['staff', 'admin']}>
      <ToastProvider>
          <div className="xyl-shell xyl-page flex min-h-screen w-full flex-col overflow-x-hidden">
            <main className="flex-1 w-full overflow-x-hidden transition-all duration-300 ease-in-out">
              <div className="xyl-page-inner pb-24">
                <StyleTag />
                <div className="xyl-page-container">
                  {children}
                </div>
              </div>
            </main>
            <StaffBottomNav />
          </div>
      </ToastProvider>
    </ProtectedRoute>
  )
}