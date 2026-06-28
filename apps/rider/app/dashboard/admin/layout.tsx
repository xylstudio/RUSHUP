'use client'

import React, { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import ProtectedRoute from '../../../lib/ProtectedRoute'
import TopNavBar from '../../../components/TopNavBar'
import Sidebar from '../../../components/Sidebar'
import { SidebarContext } from '../_shared/sidebar-context'

const SIDEBAR_LOCK_KEY = 'xyl.admin.sidebarLocked'
const SIDEBAR_OPEN_KEY = 'xyl.admin.sidebarOpen'

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

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarLocked, setSidebarLocked] = useState(false)
  const isDocumentBuilderPage = pathname?.startsWith('/dashboard/admin/documents/create-manual') || pathname?.startsWith('/dashboard/admin/house-plans')

  useEffect(() => {
    try {
      const savedLocked = window.localStorage.getItem(SIDEBAR_LOCK_KEY)
      const savedOpen = window.localStorage.getItem(SIDEBAR_OPEN_KEY)
      const locked = savedLocked === '1'
      const open = savedOpen === '1'

      setSidebarLocked(locked)
      setSidebarOpen(locked ? true : open)
    } catch {
      setSidebarLocked(false)
      setSidebarOpen(false)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_LOCK_KEY, sidebarLocked ? '1' : '0')
    window.localStorage.setItem(SIDEBAR_OPEN_KEY, sidebarOpen ? '1' : '0')
  }, [sidebarLocked, sidebarOpen])

  // Notion-style auto show
  const handleAutoShow = () => {
    if (!sidebarLocked) {
      setSidebarOpen(true)
    }
  }

  // Notion-style auto hide
  const handleAutoHide = () => {
    if (!sidebarLocked) {
      setSidebarOpen(false)
    }
  }

  // Toggle lock state
  const handleLockToggle = () => {
    const newLockState = !sidebarLocked
    setSidebarLocked(newLockState)
    
    // ถ้าล็อค และ sidebar ปิดอยู่ ให้เปิด sidebar
    if (newLockState && !sidebarOpen) {
      setSidebarOpen(true)
    }
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <SidebarContext.Provider value={{ sidebarLocked, sidebarOpen }}>
        <div className="xyl-shell xyl-page flex min-h-screen w-full flex-col overflow-x-hidden">
          {!isDocumentBuilderPage && (
            <>
              <TopNavBar 
                onMenuClick={() => setSidebarOpen(!sidebarOpen)} 
                isLocked={sidebarLocked}
                onLockToggle={handleLockToggle}
                sidebarOpen={sidebarOpen}
              />
              <Sidebar 
                isOpen={sidebarOpen} 
                onMenuClick={() => setSidebarOpen(false)}
                isLocked={sidebarLocked}
                onLockToggle={handleLockToggle}
                onAutoShow={handleAutoShow}
                onAutoHide={handleAutoHide}
              />
            </>
          )}
          {/* Main content adjusts left margin when locked */}
          <main 
            className={`flex-1 w-full overflow-x-hidden transition-all duration-300 ease-in-out ${
              !isDocumentBuilderPage && sidebarLocked 
                  ? 'pt-[calc(4rem+env(safe-area-inset-top))] md:ml-[280px] md:w-[calc(100%-280px)] ml-0'
                  : isDocumentBuilderPage ? 'pt-0 ml-0' : 'pt-[calc(4rem+env(safe-area-inset-top))] ml-0'
            }`}
          >
            <div className={isDocumentBuilderPage ? (pathname?.startsWith('/dashboard/admin/documents/create-manual') ? 'w-full p-0 min-h-screen' : 'w-full p-0 h-screen overflow-hidden') : 'xyl-page-inner'}>
              <StyleTag />
              <div className={isDocumentBuilderPage ? 'w-full max-w-none min-h-full' : 'xyl-page-container'}>
                {children}
              </div>
            </div>
          </main>
        </div>
      </SidebarContext.Provider>
    </ProtectedRoute>
  )
}