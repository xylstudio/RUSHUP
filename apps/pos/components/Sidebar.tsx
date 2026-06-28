'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../lib/AuthContext'
import {
  LockClosedIcon,
  LockOpenIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'
import { DEFAULT_SYSTEM_FEATURES, getSystemFeatures, type SystemFeatures } from '../lib/supabaseClient'
import { useI18n, type Locale } from '../lib/I18nContext'

interface SidebarProps {
  isOpen: boolean
  onMenuClick: () => void
  isLocked?: boolean
  onLockToggle?: () => void
  onAutoShow?: () => void
  onAutoHide?: () => void
}

interface MenuItem {
  name: string
  href: string
  current: boolean
  hidden?: boolean
}

interface MenuSection {
  title?: string
  items: MenuItem[]
}

const copyByLocale: Record<Locale, Record<string, string>> = {
  th: {
    dashboard: 'แดชบอร์ด',
    profile: 'โปรไฟล์',
    customerServices: 'บริการ & คำสั่งซื้อ',
    documents: 'เอกสาร',
    reports: 'รายงาน',
    houses: 'บ้านของฉัน',
    myTasks: 'งานของฉัน',
    measurements: 'งานวัดพื้นที่',
    customers: 'ลูกค้า',
    orders: 'คำสั่งงาน',
    createOrder: 'สร้างออเดอร์ให้ลูกค้า',
    createReport: 'ลงรายงานแบบพนักงาน',
    feedback: 'คะแนนและปัญหาลูกค้า',
    pricingDocs: 'เอกสารราคา',
    manageServices: 'จัดการบริการ',
    manageMarketplace: 'จัดการตลาดสินค้า',
    manageItemLibrary: 'คลังรายการใบเสนอราคา',
    addService: 'เพิ่มบริการใหม่',
    assignments: 'การมอบหมายงาน',
    measurementRequests: 'คำขอวัดพื้นที่',
    users: 'จัดการผู้ใช้',
    branches: 'จัดการสาขา',
    settings: 'ตั้งค่าระบบ',
    deliveryManager: 'จัดการการส่งอาหาร',
    closeSidebar: 'ปิดแถบด้านข้าง',
    unlockSidebar: 'ปลดล็อกแถบด้านข้าง',
    lockSidebar: 'ล็อกแถบด้านข้าง',
    unknownUser: 'ผู้ใช้',
    viewProfile: 'ดูโปรไฟล์',
    signOut: 'ออกจากระบบ',
    housePlans: 'จัดการโซนบ้าน',
    pos: 'เครื่องขายหน้าร้าน (POS)',
    restaurantReports: 'รายงานบริหารร้านอาหาร',
    manageRecipes: 'สูตรอาหารและต้นทุน',
    inventory: 'คลังวัตถุดิบและพัสดุ',
    manageMenu: 'จัดการเมนูอาหาร & สูตร',
    catRestaurant: 'XYL STUDIO',
    catSystem: 'System Core',
    catEstate: 'Estate & Design',
    catDocuments: 'Orders & Docs',
    posSettings: 'ตั้งค่าการขาย & สาขา',
    staffAttendance: 'การลงเวลาและเงินเดือน',
    staffVerification: 'ตรวจสอบพนักงานใหม่',
    promotions: 'โปรโมชั่น',
  },
  en: {
    dashboard: 'Dashboard',
    profile: 'Profile',
    customerServices: 'Services & Orders',
    documents: 'Documents',
    reports: 'Reports',
    houses: 'My Houses',
    myTasks: 'My Tasks',
    measurements: 'Measurements',
    customers: 'Customers',
    orders: 'Orders',
    createOrder: 'Create Customer Order',
    createReport: 'Create Staff-style Report',
    feedback: 'Customer Feedback',
    pricingDocs: 'Pricing Documents',
    manageServices: 'Manage Services',
    manageMarketplace: 'Manage Marketplace',
    manageItemLibrary: 'Quotation Item Library',
    addService: 'Add Service',
    assignments: 'Job Assignments',
    measurementRequests: 'Measurement Requests',
    users: 'Manage Users',
    branches: 'Manage Branches',
    settings: 'System Settings',
    deliveryManager: 'Delivery Manager',
    closeSidebar: 'Close sidebar',
    unlockSidebar: 'Unlock sidebar',
    lockSidebar: 'Lock sidebar',
    unknownUser: 'User',
    viewProfile: 'View Profile',
    signOut: 'Sign Out',
    housePlans: 'Manage House Zones',
    pos: 'Point of Sale (POS)',
    restaurantReports: 'Restaurant Reports',
    manageRecipes: 'Manage Recipes & Costs',
    inventory: 'Inventory & Supplies',
    manageMenu: 'Menu & Recipe Manager',
    catRestaurant: 'XYL STUDIO',
    catSystem: 'System Core',
    catEstate: 'Estate & Design',
    catDocuments: 'Orders & Docs',
    posSettings: 'POS & Branch Settings',
    staffAttendance: 'Staff Attendance & Payroll',
    staffVerification: 'Staff Verification',
    promotions: 'Promotions',
  },
  zh: {
    dashboard: '仪表盘',
    profile: '个人资料',
    customerServices: '服务与订单',
    documents: '文档',
    reports: '报告',
    houses: '我的房产',
    myTasks: '我的任务',
    measurements: '测量任务',
    customers: '客户',
    orders: '工单',
    createOrder: '为客户创建订单',
    createReport: '创建员工式报告',
    feedback: '客户反馈',
    pricingDocs: '报价文件',
    manageServices: '管理服务',
    manageMarketplace: '管理商城',
    manageItemLibrary: '报价项目库',
    addService: '新增服务',
    assignments: '任务分配',
    measurementRequests: '测量请求',
    users: '管理用户',
    branches: '管理分支',
    settings: '系统设置',
    deliveryManager: '配送管理',
    closeSidebar: '关闭侧边栏',
    unlockSidebar: '解锁侧边栏',
    lockSidebar: '锁定侧边栏',
    unknownUser: '用户',
    viewProfile: '查看资料',
    signOut: '退出登录',
    housePlans: '管理房屋区域',
    pos: '销售点 (POS)',
    restaurantReports: '餐厅管理报告',
    manageRecipes: '管理食谱与成本',
    inventory: '库存与进货',
    manageMenu: '菜单与食谱管理',
    catRestaurant: 'XYL STUDIO',
    catSystem: '系统核心',
    catEstate: '地产与设计',
    catDocuments: '订单与文档',
    posSettings: 'POS与分支设置',
    staffVerification: '员工核查',
    promotions: '促销',
  },
}

export default function Sidebar({ isOpen, onMenuClick, isLocked, onLockToggle, onAutoShow, onAutoHide }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { profile } = useAuth()
  const { locale } = useI18n()
  const copy = copyByLocale[locale]
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const [showBackdrop, setShowBackdrop] = useState(true)
  const [features, setFeatures] = useState<SystemFeatures>(DEFAULT_SYSTEM_FEATURES)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (profile?.role !== 'customer') return

    let mounted = true
    const loadFeatures = async () => {
      const { data } = await getSystemFeatures()
      if (!mounted) return
      setFeatures(data)
    }

    const handleRefresh = () => {
      void loadFeatures()
    }

    const handleVisibility = () => {
      if (!document.hidden) void loadFeatures()
    }

    void loadFeatures()
    window.addEventListener('focus', handleRefresh)
    window.addEventListener('xylem:features-updated', handleRefresh as EventListener)
    window.addEventListener('storage', handleRefresh)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      mounted = false
      window.removeEventListener('focus', handleRefresh)
      window.removeEventListener('xylem:features-updated', handleRefresh as EventListener)
      window.removeEventListener('storage', handleRefresh)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [profile?.role])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const isMobile = window.innerWidth < 768
    if (isMobile) return

    const handleMouseMove = (e: MouseEvent) => {
      if (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)) return

      if (e.clientX <= 20 && !isOpen && !isLocked) {
        onAutoShow?.()
      }

      if (!isLocked && isOpen) {
        const inSidebarZone = e.clientX <= 300
        if (!inSidebarZone) {
          if (!hoverTimeoutRef.current) {
            hoverTimeoutRef.current = setTimeout(() => {
              onAutoHide?.()
              hoverTimeoutRef.current = null
            }, 300)
          }
        } else if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current)
          hoverTimeoutRef.current = null
        }
      }
    }

    document.addEventListener('mousemove', handleMouseMove)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
        hoverTimeoutRef.current = null
      }
    }
  }, [isLocked, isOpen, onAutoHide, onAutoShow])

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)')

    const update = () => setShowBackdrop(!mq.matches)
    update()

    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', update)
      return () => mq.removeEventListener('change', update)
    }

    mq.addListener(update)
    return () => mq.removeListener(update)
  }, [])

  const handleSignOut = async () => {
    try {
      const { signOut } = await import('../lib/supabaseClient')
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
      router.push('/login')
    }
  }

  const getMenuItems = (): MenuSection[] => {
    if (!profile) return []

    const dashboardItem = {
      name: copy.dashboard,
      href: `/dashboard/${profile.role}`,
      current: pathname === `/dashboard/${profile.role}`,
    }

    const profileItem = {
      name: copy.profile,
      href: `/dashboard/${profile.role}/profile`,
      current: pathname === `/dashboard/${profile.role}/profile`,
    }

    if (profile.role === 'customer') {
      return [{
        items: [
          dashboardItem,
          profileItem,
          ...(features.service_booking_enabled ? [{
            name: copy.customerServices,
            href: '/dashboard/customer/services',
            current: pathname.startsWith('/dashboard/customer/services'),
          }] : []),
          ...(features.marketplace_enabled ? [{
            name: copy.marketplace || 'Marketplace',
            href: '/dashboard/customer/marketplace',
            current: pathname.startsWith('/dashboard/customer/marketplace'),
          }] : []),
          {
            name: copy.documents,
            href: '/dashboard/customer/documents',
            current: pathname.startsWith('/dashboard/customer/documents'),
          },
          {
            name: copy.reports,
            href: '/dashboard/customer/reports',
            current: pathname.startsWith('/dashboard/customer/reports'),
          },
          {
            name: copy.houses,
            href: '/dashboard/customer/houses',
            current: pathname.startsWith('/dashboard/customer/houses'),
          },
        ]
      }]
    }

    if (profile.role === 'staff') {
      return [{
        items: [
          dashboardItem,
          profileItem,
          {
            name: copy.reports,
            href: '/dashboard/staff/reports',
            current: pathname.startsWith('/dashboard/staff/reports'),
            hidden: profile.staff_type === 'cafe'
          },
          {
            name: copy.myTasks,
            href: '/dashboard/staff/tasks',
            current: pathname.startsWith('/dashboard/staff/tasks'),
            hidden: profile.staff_type === 'cafe'
          },
          {
            name: copy.measurements,
            href: '/dashboard/staff/measurements',
            current: pathname.startsWith('/dashboard/staff/measurements'),
            hidden: profile.staff_type === 'cafe'
          },
          {
            name: copy.pos,
            href: '/dashboard/pos',
            current: pathname === '/dashboard/pos',
            hidden: profile.staff_type !== 'cafe'
          },
          {
            name: copy.customers,
            href: '/dashboard/staff/customers',
            current: pathname.startsWith('/dashboard/staff/customers'),
            hidden: (profile as any).staff_type === 'cafe'
          } as MenuItem,
        ].filter(i => !(i as MenuItem).hidden) as MenuItem[]
      }]
    }

    if (profile.role === 'admin') {
      return [
        {
          title: copy.catSystem,
          items: [
            dashboardItem,
            profileItem,
            {
              name: copy.users,
              href: '/dashboard/admin/users',
              current: pathname.startsWith('/dashboard/admin/users'),
            },
            {
              name: copy.branches,
              href: '/dashboard/admin/branches',
              current: pathname.startsWith('/dashboard/admin/branches'),
            },
            {
              name: copy.staffAttendance || 'Attendance',
              href: '/dashboard/admin/staff/attendance',
              current: pathname.startsWith('/dashboard/admin/staff/attendance'),
            },
            {
              name: copy.staffVerification || 'Staff Verification',
              href: '/dashboard/admin/staff/verification',
              current: pathname.startsWith('/dashboard/admin/staff/verification'),
            },
            {
              name: copy.settings,
              href: '/dashboard/admin/settings',
              current: pathname.startsWith('/dashboard/admin/settings'),
            },
            {
              name: copy.customers,
              href: '/dashboard/admin/customers',
              current: pathname.startsWith('/dashboard/admin/customers'),
            },
          ]
        },
        {
          title: copy.catRestaurant,
          items: [
            {
              name: copy.pos,
              href: '/dashboard/pos',
              current: pathname === '/dashboard/pos',
            },
            {
              name: (copy as any).posSettings || 'POS Settings',
              href: '/dashboard/admin/pos-settings',
              current: pathname.startsWith('/dashboard/admin/pos-settings'),
            },
            {
              name: copy.promotions || 'Promotions',
              href: '/dashboard/admin/promotions',
              current: pathname.startsWith('/dashboard/admin/promotions'),
            },
          ]
        },
        {
          title: copy.catEstate,
          items: [
            {
              name: copy.housePlans,
              href: '/dashboard/admin/house-plans',
              current: pathname.startsWith('/dashboard/admin/house-plans'),
            },
            {
              name: copy.manageServices,
              href: '/dashboard/admin/services',
              current: pathname.startsWith('/dashboard/admin/services'),
            },
            {
              name: copy.manageMarketplace,
              href: '/dashboard/admin/marketplace',
              current: pathname.startsWith('/dashboard/admin/marketplace'),
            },
            {
              name: copy.manageItemLibrary,
              href: '/dashboard/admin/item-library',
              current: pathname.startsWith('/dashboard/admin/item-library'),
            },
            {
              name: copy.assignments,
              href: '/dashboard/admin/job-assignment',
              current: pathname.startsWith('/dashboard/admin/job-assignment'),
            },
            {
              name: copy.measurementRequests,
              href: '/dashboard/admin/measurements',
              current: pathname.startsWith('/dashboard/admin/measurements'),
            },
          ]
        },
        {
          title: copy.catDocuments,
          items: [
            {
              name: copy.orders,
              href: '/dashboard/admin/orders',
              current: pathname.startsWith('/dashboard/admin/orders'),
            },
            {
              name: copy.createOrder,
              href: '/dashboard/admin/orders/create',
              current: pathname === '/dashboard/admin/orders/create',
            },
            {
              name: copy.reports,
              href: '/dashboard/admin/reports',
              current: pathname.startsWith('/dashboard/admin/reports'),
            },
            {
              name: copy.createReport,
              href: '/dashboard/admin/reports/create',
              current: pathname === '/dashboard/admin/reports/create',
            },
            {
              name: copy.feedback,
              href: '/dashboard/admin/customer-feedback',
              current: pathname.startsWith('/dashboard/admin/customer-feedback'),
            },
            {
              name: copy.pricingDocs,
              href: '/dashboard/admin/documents',
              current: pathname.startsWith('/dashboard/admin/documents'),
            },
          ]
        }
      ]
    }

    return [{ items: [dashboardItem, profileItem] }]
  }

  const sections = getMenuItems()
  let globalIndex = 0

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`fixed inset-0 z-[50] bg-black/10 ${showBackdrop && !isLocked ? '' : 'hidden'}`}
            onClick={onMenuClick}
            aria-label={copy.closeSidebar}
          />

          <motion.aside
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ duration: 0.32, ease: 'easeOut' }}
            className={`fixed left-0 top-[56px] z-[90] flex h-[calc(100%-56px)] w-[280px] flex-col border-r border-[#E5E5DF] bg-[#FAFAF8] shadow-sm group`}
          >
            <div className="border-b border-[#E5E5DF] px-6 py-4">
              <div className="hidden md:flex items-center justify-end mb-4">
                <button
                  onClick={onLockToggle}
                  className="inline-flex items-center justify-center rounded-none p-2 text-[#A3A3A3] hover:bg-white hover:text-[#111111] transition-colors"
                  title={isLocked ? copy.unlockSidebar : copy.lockSidebar}
                >
                  {isLocked ? (
                    <LockClosedIcon className="h-4 w-4" />
                  ) : (
                    <LockOpenIcon className="h-4 w-4" />
                  )}
                </button>
              </div>

              {profile && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setProfileDropdownOpen((prev) => !prev)}
                    className="flex w-full items-center justify-between group/profile pt-2 pb-2"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="flex h-8 w-8 items-center justify-center rounded-none bg-[#111111] text-xs font-medium text-white ring-2 ring-transparent group-hover/profile:ring-[#E5E5E5] transition-all">
                        {profile.display_name?.charAt(0) || 'U'}
                      </div>
                      <div className="overflow-hidden text-left">
                        <p className="truncate text-xs font-bold uppercase tracking-wider text-[#111111] group-hover/profile:text-[#666666] transition-colors">
                            {profile.display_name || copy.unknownUser}
                        </p>
                        <p className="truncate text-[10px] text-[#A3A3A3] font-light font-mono">{profile.email}</p>
                      </div>
                    </div>
                    <ChevronDownIcon className="h-3 w-3 text-[#A3A3A3] group-hover/profile:text-[#111111] transition-colors" />
                  </button>

                  {profileDropdownOpen && (
                    <div className="absolute top-full left-0 w-full mt-2 overflow-hidden rounded-none border border-[#E5E5E5] bg-white shadow-xl z-50">
                      <Link
                        href={`/dashboard/${profile.role}/profile`}
                        onClick={() => {
                          setProfileDropdownOpen(false)
                          if (!isLocked || window.innerWidth < 768) onMenuClick()
                        }}
                        className="flex items-center px-4 py-3 text-xs text-[#111111] hover:bg-[#FAFAFA] transition-colors uppercase tracking-wider"
                      >
                        {copy.viewProfile}
                      </Link>
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false)
                          handleSignOut()
                        }}
                        className="flex w-full items-center border-t border-[#F5F5F5] px-4 py-3 text-xs uppercase tracking-wider xyl-btn-danger rounded-none"
                      >
                        <ArrowRightOnRectangleIcon className="mr-3 h-4 w-4" />
                        {copy.signOut}
                      </button>
                    </div>
                  )}
                  
                  <div className="w-full h-[1px] bg-[#E5E5DF] mt-4"></div>
                </div>
              )}
            </div>

            <nav className="flex-1 overflow-y-auto px-6 py-6">
              <div className="space-y-10">
              {sections.map((section, sIndex) => (
                <div key={section.title || sIndex} className="space-y-4">
                  {section.title && (
                    <div className="flex items-center gap-3 mb-6">
                      <div className="h-[1px] w-4 bg-[#E5E5DF]"></div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D4D4D4]">
                        {section.title}
                      </span>
                    </div>
                  )}
                  <div className="space-y-3">
                    {section.items.map((item) => {
                      const itemNumber = String(++globalIndex).padStart(2, '0');
                      const isActive = item.current;

                      return (
                        <motion.div
                          key={item.name}
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: globalIndex * 0.02 }}
                        >
                          <Link
                            href={item.href}
                            onClick={() => {
                              if (!isLocked || window.innerWidth < 768) onMenuClick()
                            }}
                            className="group flex items-center gap-3 w-full text-left transition-all duration-300 py-1"
                          >
                               <div className="w-4 flex items-center justify-center">
                                  <span className={`h-[1px] bg-[#111111] transition-all duration-500 ${isActive ? 'w-4 opacity-100' : 'w-0 opacity-0 group-hover:w-2 group-hover:opacity-30'}`}></span>
                               </div>
                               
                               <span className={`text-xs font-mono transition-colors duration-300 ${isActive ? 'text-[#111111] font-bold' : 'text-[#D4D4D4] group-hover:text-[#A3A3A3]'}`}>
                                  {itemNumber}.
                               </span>

                               <span className={`text-xs uppercase tracking-wider transition-colors duration-300 ${isActive ? 'text-[#111111] font-bold' : 'text-[#A3A3A3] group-hover:text-[#666666]'}`}>
                                  {item.name}
                               </span>
                          </Link>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              ))}
              </div>
            </nav>

            <div className="border-t border-[#E5E5E5] px-6 py-4 bg-[#FAFAFA]">
              <p className="text-center text-[8px] uppercase tracking-[0.3em] text-[#D4D4D4]">XYL STUDIO</p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
