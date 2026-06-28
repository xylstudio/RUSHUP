'use client';
import React, { useEffect, useState, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import ProtectedRoute from '../../../lib/ProtectedRoute'
import TopNavBar from '../../../components/TopNavBar'
import Sidebar from '../../../components/Sidebar'
import CustomerSectionNav from '@/components/customer/CustomerSectionNav'
import CustomerPortalUnderDevelopment from '@/components/customer/CustomerPortalUnderDevelopment'
import XYLLoader from '@/components/loaders/XYLLoader'
import '@/styles/globals.css'
import '@/styles/boutique.css'
import '@/styles/customer-editorial.css'
import { ToastProvider } from '@/components/Toast'
import { SidebarContext } from '../_shared/sidebar-context'
import { useAuth } from '../../../lib/AuthContext'
import { getHouseCount } from '../../../lib/supabaseClient'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { useI18n } from "@/lib/I18nContext";

const SIDEBAR_LOCK_KEY = 'xyl.customer.sidebarLocked'
const SIDEBAR_OPEN_KEY = 'xyl.customer.sidebarOpen'

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
    const { locale } = useI18n();
  const router = useRouter()
  const rawPathname = usePathname()
  const pathname = rawPathname || ''
  const { profile, loading: authLoading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarLocked, setSidebarLocked] = useState(false)
  const [isFirstCheckDone, setIsFirstCheckDone] = useState(false)
  const [customerPortalLocked, setCustomerPortalLocked] = useState(false)
  const [isFeaturesLoading, setIsFeaturesLoading] = useState(true)

  const IMMERSIVE_PREFIXES = [
    '/dashboard/customer/houses',
    '/dashboard/customer/houses/add',
    '/dashboard/customer/reports',
    '/dashboard/customer/marketplace',
    '/dashboard/customer/documents',
    '/dashboard/customer/orders',
    '/dashboard/customer/services',
    '/dashboard/customer/profile',
  ]
  const isImmersivePage = IMMERSIVE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  const isDashboardHome = pathname === '/dashboard/customer'
  const useLegacyChrome = !isImmersivePage && !isDashboardHome && !pathname.startsWith('/dashboard/customer')
  const showBottomNav = !pathname.includes('/houses/add')

  // Load system features (with 8s safety timeout)
  useEffect(() => {
    let mounted = true
    const fetchFeatures = async () => {
      // Safety: force-complete after 8 seconds no matter what
      const safetyTimer = setTimeout(() => {
        if (mounted) setIsFeaturesLoading(false)
      }, 8000)
      try {
        const res = await fetch('/api/system/features')
        if (res.ok && mounted) {
          const data = await res.json()
          if (data.success && data.features) {
            setCustomerPortalLocked(data.features.maintenance_mode)
          }
        }
      } catch (error) {
        console.error('Failed to fetch features:', error)
      } finally {
        clearTimeout(safetyTimer)
        if (mounted) setIsFeaturesLoading(false)
      }
    }
    fetchFeatures()
    return () => { mounted = false }
  }, [])

  // Sidebar initialization
  useEffect(() => {
    try {
      const savedLocked = window.localStorage.getItem(SIDEBAR_LOCK_KEY)
      const savedOpen = window.localStorage.getItem(SIDEBAR_OPEN_KEY)
      const locked = savedLocked === '1'
      const open = savedOpen === '1'
      const isSmallScreen = window.innerWidth < 768
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const shouldForceClosedSidebar = isSmallScreen || isTouchDevice

      setSidebarLocked(locked)
      setSidebarOpen(shouldForceClosedSidebar ? false : locked ? true : open)
    } catch {
      setSidebarLocked(false)
      setSidebarOpen(false)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_LOCK_KEY, sidebarLocked ? '1' : '0')
    window.localStorage.setItem(SIDEBAR_OPEN_KEY, sidebarOpen ? '1' : '0')
  }, [sidebarLocked, sidebarOpen])

  // Stability Overhaul: Onboarding and House Count Synchronization
  useEffect(() => {
    if (isFeaturesLoading || authLoading) return;
    
    let mounted = true;

    const performOnboardingCheck = async () => {
      // 1. If maintenance/locked, we are done
      if (customerPortalLocked) {
        if (mounted) setIsFirstCheckDone(true);
        return;
      }

      // 2. If no profile or not customer, we are done (AuthContext/ProtectedRoute will handle the rest)
      if (!profile || profile.role !== 'customer') {
        if (mounted) setIsFirstCheckDone(true);
        return;
      }

      // 3. Skip check if already on ANY registration page or authenticated deep-link page to prevent loop
      const isOnRegistrationPage = pathname.includes('/houses/add');
      const allowDirectCustomerAccess = [
        /^\/dashboard\/customer\/orders\/[^/]+/,
        /^\/dashboard\/customer\/reports(?:\/.*)?$/,
        /^\/dashboard\/customer\/houses\/[^/]+/,
      ].some((pattern) => pattern.test(pathname))

      if (isOnRegistrationPage || allowDirectCustomerAccess) {
        if (mounted) setIsFirstCheckDone(true);
        return;
      }

      // 4. Resolve house count definitively
      try {
        const { data: houseCount, error } = await getHouseCount(profile.id);
        
        if (!mounted) return;

        if (!error && houseCount === 0) {
          // Force onboarding only if they aren't on dashboard home or add pages
          if (pathname !== '/dashboard/customer') {
            router.replace('/dashboard/customer/houses/add');
            return;
          }
        }
      } catch (err) {
        console.error('[CustomerLayout] House count error:', err);
      } finally {
        if (mounted) setIsFirstCheckDone(true);
      }
    };

    performOnboardingCheck();

    return () => { mounted = false; };
  }, [isFeaturesLoading, authLoading, customerPortalLocked, profile, pathname, router]);

  const handleLockToggle = useCallback(() => {
    const newLockState = !sidebarLocked;
    setSidebarLocked(newLockState);
    if (newLockState && !sidebarOpen) {
      setSidebarOpen(true);
    }
  }, [sidebarLocked, sidebarOpen]);

  // Shield: Don't show anything until first check is done
  if (isFeaturesLoading || authLoading || !isFirstCheckDone) {
    return <XYLLoader tagline={locale === 'en' ? 'กำลังโหลดแดชบอร์ด...' : locale === 'zh' ? 'กำลังโหลดแดชบอร์ด...' : 'กำลังโหลดแดชบอร์ด...'} />;
  }

  if (customerPortalLocked) {
    return <CustomerPortalUnderDevelopment />;
  }

  return (
    <ProtectedRoute allowedRoles={['customer']}>
      <ErrorBoundary name="CustomerDashboard">
        <ToastProvider>
          <SidebarContext.Provider value={{ sidebarLocked, sidebarOpen }}>
            <div className="xyl-shell xyl-page flex min-h-screen w-full flex-col">
              {useLegacyChrome && (
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
                    onAutoShow={() => !sidebarLocked && setSidebarOpen(true)}
                    onAutoHide={() => !sidebarLocked && setSidebarOpen(false)}
                  />
                </>
              )}
              <main 
                className={`flex-1 w-full transition-all duration-300 ease-in-out ${
                  isImmersivePage || isDashboardHome
                    ? 'pt-0 ml-0'
                    : sidebarLocked 
                      ? 'pt-[calc(4rem+env(safe-area-inset-top))] md:ml-[280px] md:w-[calc(100%-280px)] ml-0'
                      : 'pt-[calc(4rem+env(safe-area-inset-top))] ml-0'
                }`}
              >
                <div className="w-full">
                  <div className={isImmersivePage || isDashboardHome ? 'w-full' : 'xyl-page-container'}>
                    {useLegacyChrome ? (
                      <div className="relative min-h-full">
                        <CustomerSectionNav />
                        {children}
                      </div>
                    ) : (
                      children
                    )}
                  </div>
                </div>
              </main>
            </div>
          </SidebarContext.Provider>
        </ToastProvider>
      </ErrorBoundary>
    </ProtectedRoute>
  )
}