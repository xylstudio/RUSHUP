'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import XYLLoader from '@/components/loaders/XYLLoader'

/**
 * Redirects the standalone reports page to the main dashboard's Reports tab.
 * This unifies the customer experience and avoids confusion between two similar views.
 */
export default function CustomerReportsRedirectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'reports')
    
    // Redirect to the main dashboard with the reports tab active
    // Preserves other parameters like reportId or houseId for deep-linking
    router.replace(`/dashboard/customer?${params.toString()}`)
  }, [router, searchParams])

  return <XYLLoader tagline="Redirecting to Botanical Journal..." />
}