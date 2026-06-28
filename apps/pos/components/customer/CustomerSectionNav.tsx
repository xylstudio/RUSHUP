'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FileText, Home, LayoutGrid, Leaf, ShoppingBag, Sprout, UserRound, Wrench } from 'lucide-react'

const navItems = [
  { href: '/dashboard/customer', label: 'Overview', icon: LayoutGrid },
  { href: '/dashboard/customer/houses', label: 'Houses', icon: Home },
  { href: '/dashboard/customer/services', label: 'Services', icon: Sprout },
  { href: '/dashboard/customer/orders', label: 'Orders', icon: Wrench },
  { href: '/dashboard/customer/reports', label: 'Reports', icon: Leaf },
  { href: '/dashboard/customer/documents', label: 'Documents', icon: FileText },
  { href: '/dashboard/customer/marketplace', label: 'Marketplace', icon: ShoppingBag },
  { href: '/dashboard/customer/profile', label: 'Profile', icon: UserRound },
]

const isItemActive = (pathname: string, href: string) => {
  if (href === '/dashboard/customer') return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function CustomerSectionNav() {
  const pathname = usePathname() || ''

  return (
    <div className="sticky top-[4.6rem] z-30 mb-8">
      <div className="overflow-x-auto scrollbar-hide">
        <nav className="inline-flex min-w-full gap-2 rounded-none border border-white/70 bg-white/78 p-2 shadow-[0_18px_38px_rgba(26,54,38,0.08)] backdrop-blur-xl">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isItemActive(pathname, item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex shrink-0 items-center gap-2 rounded-none px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] transition-all ${
                  active
                    ? 'bg-[#193425] text-white shadow-[0_12px_24px_rgba(26,54,38,0.16)]'
                    : 'bg-white/70 text-[#66716B] hover:bg-[#F4F6F1] hover:text-[#193425]'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}