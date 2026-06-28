'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Bars3Icon, ArrowLeftIcon, XMarkIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { ShoppingCartIcon } from '@heroicons/react/24/solid';
import NotificationBell from './NotificationBell';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { useI18n, type Locale } from '../lib/I18nContext';

const copyByLocale: Record<Locale, Record<string, string>> = {
  th: {
    openMenu: 'เปิดเมนู',
    closeMenu: 'ปิดเมนู',
    back: 'ย้อนกลับ',
    close: 'ปิด',
    backToDashboard: 'กลับไปหน้าแดชบอร์ด',
    cart: 'ตะกร้าสินค้า',
    editHouse: 'แก้ไขข้อมูลบ้าน',
  },
  en: {
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    back: 'Go back',
    close: 'Close',
    backToDashboard: 'Back to dashboard',
    cart: 'Shopping cart',
    editHouse: 'Edit house details',
  },
  zh: {
    openMenu: '打开菜单',
    closeMenu: '关闭菜单',
    back: '返回',
    close: '关闭',
    backToDashboard: '返回仪表盘',
    cart: '购物车',
    editHouse: '编辑房屋信息',
  },
}

interface TopNavBarProps {
  onMenuClick?: () => void;
  isLocked?: boolean;
  onLockToggle?: () => void;
  sidebarOpen?: boolean;
}

type NavMode = 'menu' | 'back' | 'close'
interface NavContext { mode: NavMode; backHref?: string }

function getNavContext(pathname: string): NavContext {
  // ── CLOSE (✕) — creation / task flows ──────────────────────────────────────
  if (/\/dashboard\/customer\/houses\/(add|add-quick)/.test(pathname))
    return { mode: 'close', backHref: '/dashboard/customer/houses' }
  if (pathname === '/dashboard/customer/marketplace/checkout')
    return { mode: 'close', backHref: '/dashboard/customer/marketplace/cart' }
  if (/\/dashboard\/customer\/services\/(payment|step1|step2|step3|select|pricing|additional)/.test(pathname))
    return { mode: 'close', backHref: '/dashboard/customer/services' }
  if (/\/dashboard\/admin\/documents\/create-manual/.test(pathname))
    return { mode: 'close', backHref: '/dashboard/admin/documents' }
  if (/\/dashboard\/admin\/documents\/[^/]+\/(create-invoice|create-receipt)/.test(pathname)) {
    const base = pathname.replace(/\/(create-invoice|create-receipt)$/, '')
    return { mode: 'close', backHref: base }
  }
  if (/\/dashboard\/admin\/services\/(add|create|pricing)/.test(pathname))
    return { mode: 'close', backHref: '/dashboard/admin/services' }

  // ── BACK (←) — navigating deeper in hierarchy ──────────────────────────────
  if (/\/dashboard\/customer\/documents\/.+/.test(pathname))
    return { mode: 'back', backHref: '/dashboard/customer/documents' }
  if (/\/dashboard\/customer\/houses\/[^/]+\/edit/.test(pathname)) {
    const houseId = pathname.match(/\/houses\/([^/]+)\/edit/)?.[1]
    return { mode: 'back', backHref: `/dashboard/customer/houses/${houseId}` }
  }
  if (/\/dashboard\/customer\/houses\/.+/.test(pathname))
    return { mode: 'back', backHref: '/dashboard/customer/houses' }
  if (/\/dashboard\/customer\/marketplace\/.+/.test(pathname))
    return { mode: 'back', backHref: '/dashboard/customer/marketplace' }
  if (/\/dashboard\/customer\/orders\/.+/.test(pathname))
    return { mode: 'back', backHref: '/dashboard/customer/services' }
  if (/\/dashboard\/customer\/services\/.+/.test(pathname))
    return { mode: 'back', backHref: '/dashboard/customer/services' }
  if (/\/dashboard\/admin\/documents\/.+/.test(pathname))
    return { mode: 'back', backHref: '/dashboard/admin/documents' }
  if (/\/dashboard\/admin\/orders\/.+/.test(pathname))
    return { mode: 'back', backHref: '/dashboard/admin/orders' }
  if (/\/dashboard\/admin\/services\/.+/.test(pathname))
    return { mode: 'back', backHref: '/dashboard/admin/services' }
  if (/\/dashboard\/admin\/staff\/.+/.test(pathname))
    return { mode: 'back', backHref: '/dashboard/admin/staff' }
  if (/\/dashboard\/staff\/tasks\/.+/.test(pathname))
    return { mode: 'back', backHref: '/dashboard/staff/tasks' }

  return { mode: 'menu' }
}

export default function TopNavBar({ onMenuClick, sidebarOpen, isLocked }: TopNavBarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, profile } = useAuth()
  const { locale } = useI18n()
  const copy = copyByLocale[locale]
  const navCtx = getNavContext(pathname ?? '')
  const [cartCount, setCartCount] = useState(0)

  const showMarketplaceCart =
    profile?.role === 'customer' && pathname?.startsWith('/dashboard/customer/marketplace')
  const houseDetailMatch = pathname?.match(/^\/dashboard\/customer\/houses\/([^/]+)$/)
  const houseDetailEditHref = houseDetailMatch ? `/dashboard/customer/houses/${houseDetailMatch[1]}/edit` : null

  const loadCartCount = useCallback(async () => {
    if (!user?.id || !showMarketplaceCart) {
      setCartCount(0)
      return
    }

    const { data, error } = await supabase
      .from('marketplace_cart_items')
      .select('quantity')
      .eq('customer_id', user.id)

    if (error) {
      setCartCount(0)
      return
    }

    const totalQuantity = (data || []).reduce((sum, row) => sum + Number((row as any).quantity || 0), 0)
    setCartCount(totalQuantity)
  }, [user?.id, showMarketplaceCart])

  useEffect(() => {
    loadCartCount()
  }, [loadCartCount])

  useEffect(() => {
    const onCartUpdated = () => {
      loadCartCount()
    }

    window.addEventListener('marketplaceCartUpdated', onCartUpdated)
    return () => window.removeEventListener('marketplaceCartUpdated', onCartUpdated)
  }, [loadCartCount])

  return (
    <header className="fixed left-0 right-0 top-0 z-[100] w-full">
      <div className="relative flex items-center justify-between bg-[#1A1A1A] px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white shadow-sm">
        <div className="z-10 flex w-24 items-center justify-start">
          {navCtx.mode === 'menu' ? (
            <button
              onClick={onMenuClick}
              className="rounded-lg p-1.5 transition-colors hover:bg-white/10"
              aria-label={sidebarOpen ? copy.closeMenu : copy.openMenu}
            >
              {sidebarOpen ? <XMarkIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
            </button>
          ) : navCtx.mode === 'back' ? (
            <button
              onClick={() => navCtx.backHref ? router.push(navCtx.backHref) : router.back()}
              className="flex items-center gap-1.5 rounded-lg p-1.5 transition-colors hover:bg-white/10"
              aria-label={copy.back}
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={() => navCtx.backHref ? router.push(navCtx.backHref) : router.back()}
              className="rounded-lg p-1.5 transition-colors hover:bg-white/10"
              aria-label={copy.close}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>

        <Link
          href={profile?.role ? `/dashboard/${profile.role}` : '/dashboard'}
          aria-label={copy.backToDashboard}
          className="absolute left-1/2 -translate-x-1/2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D1D5DB] transition-colors hover:text-white"
        >
          XYLEM LANDSCAPE
        </Link>

        <div className="z-10 flex w-24 items-center justify-end gap-1">
          {showMarketplaceCart ? (
            <Link
              href="/dashboard/customer/marketplace/cart"
              className="relative rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              aria-label={copy.cart}
            >
              <ShoppingCartIcon className="h-5 w-5" />
              {cartCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              ) : null}
            </Link>
          ) : null}
          {houseDetailEditHref ? (
            <Link
              href={houseDetailEditHref}
              className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              aria-label={copy.editHouse}
            >
              <Cog6ToothIcon className="h-5 w-5" />
            </Link>
          ) : null}
          <NotificationBell variant="dark" />
        </div>
      </div>
    </header>
  );
}