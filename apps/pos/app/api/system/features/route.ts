import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

type SystemFeatures = {
  marketplace_enabled: boolean
  service_booking_enabled: boolean
  new_user_registration: boolean
  maintenance_mode: boolean
}

const toBoolean = (value: unknown, fallback: boolean) => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const n = value.trim().toLowerCase()
    if (n === 'true' || n === '1' || n === 'yes' || n === 'on') return true
    if (n === 'false' || n === '0' || n === 'no' || n === 'off') return false
  }
  return fallback
}

const parseMaybeJsonObject = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object') return value as Record<string, unknown>
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>
    } catch { /* ignore */ }
  }
  return {}
}

const DEFAULT_SYSTEM_FEATURES: SystemFeatures = {
  marketplace_enabled: false,
  service_booking_enabled: false,
  new_user_registration: true,
  maintenance_mode: false,
}

const sanitizeFeatures = (value: unknown): SystemFeatures => {
  const source = parseMaybeJsonObject(value)
  return {
    marketplace_enabled: toBoolean(source.marketplace_enabled, DEFAULT_SYSTEM_FEATURES.marketplace_enabled),
    service_booking_enabled: toBoolean(source.service_booking_enabled, DEFAULT_SYSTEM_FEATURES.service_booking_enabled),
    new_user_registration: toBoolean(source.new_user_registration, DEFAULT_SYSTEM_FEATURES.new_user_registration),
    maintenance_mode: toBoolean(source.maintenance_mode, DEFAULT_SYSTEM_FEATURES.maintenance_mode),
  }
}

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }

    const url = supabaseUrl.trim().replace(/\s/g, '').replace(/\/$/, '')
    const endpoint = `${url}/rest/v1/system_settings?key=eq.features&select=value,updated_at&limit=1`

    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      console.warn(`[FeaturesAPI] DB read failed (${res.status}), returning defaults.`);
      return NextResponse.json({ 
        success: true, 
        features: DEFAULT_SYSTEM_FEATURES, 
        source: 'fallback', 
        warning: `DB read failed (${res.status})` 
      }, { headers: { 'Cache-Control': 'no-store' } })
    }

    const rows = await res.json().catch(() => []) as Array<{ value: unknown; updated_at: string }>
    const normalizedFeatures = sanitizeFeatures(rows?.[0]?.value)

    return NextResponse.json(
      { success: true, features: normalizedFeatures, source: 'system_settings' },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  } catch (error: any) {
    console.error('[FeaturesAPI] Fatal error, returning defaults:', error);
    return NextResponse.json({ 
      success: true, 
      features: DEFAULT_SYSTEM_FEATURES, 
      source: 'fatal_fallback', 
      error: error?.message || 'unknown' 
    }, { headers: { 'Cache-Control': 'no-store' } })
  }
}

export async function PUT(_req: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed. Use PUT /api/system/settings for feature updates.' },
    { status: 405, headers: { Allow: 'GET', 'Cache-Control': 'no-store, max-age=0' } }
  )
}
