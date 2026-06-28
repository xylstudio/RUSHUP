'use client'

import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isDashboardRoute = !!pathname && pathname.startsWith('/dashboard')
  const isAuthRoute = !!pathname && pathname.startsWith('/auth')
  const isLiffRoute = !!pathname && pathname.startsWith('/liff')
  const isMenuRoute = !!pathname && pathname.startsWith('/menu')

  // Dashboard, auth, liff, and menu routes render children directly (no page transition)
  if (isDashboardRoute || isAuthRoute || isLiffRoute || isMenuRoute) {
    return <>{children}</>
  }

  // All other routes get page transition animation
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname || 'root'}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
