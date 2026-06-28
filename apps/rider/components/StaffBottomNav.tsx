'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, ClipboardList, TrendingUp, Users, User, MonitorSmartphone, ShieldCheck } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/lib/AuthContext'

export default function StaffBottomNav() {
  const rawPathname = usePathname()
  const pathname = rawPathname || ''
  const { profile } = useAuth()

  // Define tabs based on role
  const isCafe = profile?.staff_type === 'cafe'

  const tabs = isCafe ? [
    { id: 'home', href: '/dashboard/staff', label: 'หน้าแรก', icon: Home },
    { id: 'pos', href: '/dashboard/pos', label: 'POS', icon: MonitorSmartphone },
    { id: 'profile', href: '/dashboard/staff/profile', label: 'โปรไฟล์', icon: User },
  ] : [
    { id: 'home', href: '/dashboard/staff', label: 'หน้าแรก', icon: Home },
    { id: 'tasks', href: '/dashboard/staff/tasks', label: 'งานของฉัน', icon: ClipboardList },
    { id: 'reports', href: '/dashboard/staff/reports', label: 'รายงาน', icon: TrendingUp },
    { id: 'customers', href: '/dashboard/staff/customers', label: 'ลูกค้า', icon: Users },
    { id: 'profile', href: '/dashboard/staff/profile', label: 'โปรไฟล์', icon: User },
  ]

  const isActive = (tab: typeof tabs[0]) => {
    if (tab.href === '/dashboard/staff') {
      return pathname === '/dashboard/staff'
    }
    return pathname.startsWith(tab.href)
  }

  const springConfig = { type: 'spring' as const, stiffness: 500, damping: 28, mass: 0.8 }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] bg-white border-t-2 border-[#111111] px-4 pb-[calc(env(safe-area-inset-bottom,0px)+10px)] pt-2">
      <div className="relative mx-auto flex max-w-[600px] items-center justify-between">
        {tabs.map((tab) => {
          const active = isActive(tab)
          const Icon = tab.icon

          return (
            <Link
              key={tab.id}
              href={tab.href}
              scroll={false}
              className="relative flex items-center justify-center py-1 outline-none no-tap-highlight flex-1"
            >
              <AnimatePresence>
                {active && (
                  <motion.div
                  layoutId="activeStaffPill"
                    className="absolute inset-x-[-4px] inset-y-[-2px] bg-[#111111] rounded-none z-0"
                    transition={springConfig}
                  />
                )}
              </AnimatePresence>
              
              <motion.div
                className={`relative flex items-center px-2 sm:px-4 py-2.5 rounded-none whitespace-nowrap transition-all z-10`}
              >
                <div className={`w-[22px] h-[22px] flex items-center justify-center shrink-0 ${active ? 'text-white' : 'text-[#A3A3A3]'}`}>
                   <Icon size={20} strokeWidth={active ? 2 : 1.5} />
                </div>
                
                <AnimatePresence initial={false}>
                  {active && (
                    <motion.span
                      initial={{ width: 0, opacity: 0, x: -4, marginLeft: 0 }}
                      animate={{ width: 'auto', opacity: 1, x: 0, marginLeft: 8 }}
                      exit={{ width: 0, opacity: 0, x: -4, marginLeft: 0 }}
                      transition={springConfig}
                      className="text-[10px] font-bold uppercase tracking-[0.2em] text-white overflow-hidden hidden sm:block"
                    >
                      {tab.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
