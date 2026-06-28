'use client';
import Link from 'next/link'
import { useState } from 'react'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import I18nLanguageSwitcher from './I18nLanguageSwitcher'
import { useI18n } from "@/lib/I18nContext";

export default function ProjectHeader() {
    const { locale } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false)
  const primaryLinks = [
    { href: '/#services', label: 'Services' },
    { href: '/service-areas', label: 'Service Areas' },
    { href: '/workshops', label: 'Workshops' },
    { href: '/contact', label: 'Contact' },
  ]
  const trustLinks = [
    { href: '/privacy', label: 'Privacy' },
    { href: '/terms', label: 'Terms' },
    { href: '/accessibility', label: 'Accessibility' },
  ]

  return (
    <>
      <header data-project-header className="fixed left-0 right-0 top-0 z-50">
        <div className="flex items-center justify-between border-b border-[#232323] bg-[#111111]/95 px-4 py-3 text-white backdrop-blur-md md:px-6">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="rounded-lg p-1.5 transition-colors hover:bg-white/10 md:hidden"
            aria-label={locale === 'en' ? 'Open menu' : locale === 'zh' ? '打开菜单' : 'เปิดเมนู'}
          >
            <Bars3Icon className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-10">
            <Link href="/" className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#E5E7EB] transition-colors hover:text-white">
              XYLEM LANDSCAPE
            </Link>
            <nav className="hidden items-center gap-6 text-[11px] font-semibold text-[#D1D5DB] md:flex">
              {primaryLinks.map((link) => (
                <Link key={link.href} href={link.href} className="transition-colors hover:text-white">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:block">
              <I18nLanguageSwitcher />
            </div>
            <Link href="/login" className="hidden rounded-full border border-white/15 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-white/10 md:inline-flex">
              Portal Login
            </Link>
          </div>
        </div>
      </header>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setMenuOpen(false)} />
          <aside className="fixed left-0 top-0 z-[60] h-full w-72 border-r border-[#E5E5DF] bg-white p-4 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm font-semibold tracking-[0.14em] text-[#1A1A1A]">XYLEM LANDSCAPE</p>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="rounded-full p-1.5 text-[#70706B] hover:bg-[#F5F5F2]"
                aria-label={locale === 'en' ? 'Close menu' : locale === 'zh' ? '关闭菜单' : 'ปิดเมนู'}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4">
              <I18nLanguageSwitcher />
            </div>

            <nav className="space-y-1 text-sm">
              {primaryLinks.map((link) => (
                <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2 text-[#1A1A1A] hover:bg-[#F7F7F2]">
                  {link.label}
                </Link>
              ))}
              <Link href="/login" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2 text-[#1A1A1A] hover:bg-[#F7F7F2]">Portal Login</Link>
              <Link href="/register" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2 text-[#1A1A1A] hover:bg-[#F7F7F2]">Create Account</Link>
            </nav>

            <div className="mt-6 border-t border-[#E5E5DF] pt-4">
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#A3A3A3]">Trust</p>
              <nav className="space-y-1 text-sm">
                {trustLinks.map((link) => (
                  <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2 text-[#666666] hover:bg-[#F7F7F2] hover:text-[#1A1A1A]">
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          </aside>
        </>
      )}
    </>
  )
}
