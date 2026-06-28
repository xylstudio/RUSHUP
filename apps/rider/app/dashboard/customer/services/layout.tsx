import { ReactNode } from 'react'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

const isServiceBookingEnabled = async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    // Fail open in local/dev environments where env can be intentionally incomplete.
    return true
  }

  try {
    const url = supabaseUrl.replace(/\/$/, '')
    const res = await fetch(
      `${url}/rest/v1/system_settings?key=eq.features&select=value&limit=1`,
      {
        method: 'GET',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
        cache: 'no-store',
      }
    )

    if (!res.ok) return true // fail open

    const rows = await res.json().catch(() => []) as Array<{ value: unknown }>
    const flags = (rows?.[0]?.value || {}) as { service_booking_enabled?: boolean }
    return flags.service_booking_enabled !== false
  } catch {
    // If settings lookup fails, avoid locking users out unexpectedly.
    return true
  }
}

export default async function CustomerServicesLayout({
  children,
}: {
  children: ReactNode
}) {
  const enabled = await isServiceBookingEnabled()

  if (!enabled) {
    redirect('/dashboard/customer?feature=service_booking_disabled')
  }

  return <>{children}</>
}
