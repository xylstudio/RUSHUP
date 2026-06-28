import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRequestId } from '@/lib/server/compliance'
import { resolveRequestUser } from '@/lib/server/requestAuth'

export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SystemFeatures = {
  marketplace_enabled: boolean
  service_booking_enabled: boolean
  new_user_registration: boolean
  maintenance_mode: boolean
}

const DEFAULT_SYSTEM_FEATURES: SystemFeatures = {
  marketplace_enabled: false,
  service_booking_enabled: false,
  new_user_registration: false,
  maintenance_mode: false,
}

type SettingKey = 'company_info' | 'financial_info' | 'features'

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULTS = {
  company_info: {
    name_th: 'บริษัท เอ็กซ์วายแอล แลนด์สเคป จำกัด',
    name_en: 'XYLEM LANDSCAPE CO., LTD.',
    address: '158/13-14 หมู่บ้าน บ้านสวนพรีเมียร์ หมู่ที่ 6 ต.หนองจ๊อม อ.สันทราย จ.เชียงใหม่',
    tax_id: '0505567008779',
    phone: '02-xxx-xxxx',
    email: 'contact@xylem.co.th',
    logo_url: '',
    contract_company_name: 'บริษัท เอ็กซ์วายแอล สตูดิโอ จำกัด',
    contract_company_address: '158/13-14 หมู่บ้านบ้านสวนธาร หมู่ที่ 6 ซอย 1 ถนนเชียงใหม่-เชียงราย ตำบลเชิงดอย อำเภอดอยสะเก็ด จังหวัดเชียงใหม่ 50220',
    contract_company_tax_id: '0505568019024',
    contract_signer_name: 'นางสาวเจนจิรา วงค์โพธิสาร',
    contract_witness_name: 'นายศุภโชค บุรีคำ',
  },
  financial_info: {
    bank_name: 'ธนาคารกสิกรไทย',
    account_no: '180-3-31959-5',
    account_name: 'บจก. เอ็กซ์วายแอล แลนด์สเคป',
    branch: 'สาขาสันทราย',
    promptpay_id: '',
    bank_code: '',
    bank_icon: '',
  },
  features: DEFAULT_SYSTEM_FEATURES,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

const sanitizeFeatures = (value: unknown): SystemFeatures => {
  const source = parseMaybeJsonObject(value)
  return {
    marketplace_enabled: toBoolean(source.marketplace_enabled, DEFAULTS.features.marketplace_enabled),
    service_booking_enabled: toBoolean(source.service_booking_enabled, DEFAULTS.features.service_booking_enabled),
    new_user_registration: toBoolean(source.new_user_registration, DEFAULTS.features.new_user_registration),
    maintenance_mode: toBoolean(source.maintenance_mode, DEFAULTS.features.maintenance_mode),
  }
}

const stableJson = (value: unknown) => {
  try { return JSON.stringify(value) } catch { return '' }
}

const extractBearerToken = (req: NextRequest) => {
  const h = req.headers.get('authorization') || ''
  if (!h.toLowerCase().startsWith('bearer ')) return ''
  return h.slice(7).trim()
}

// ---------------------------------------------------------------------------
// Supabase REST helpers (raw fetch — bypasses JS client + pgBouncer pooling)
// ---------------------------------------------------------------------------

const getSupabaseEnv = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  const sanitizedUrl = url.trim().replace(/\s/g, '').replace(/\/$/, '')
  return { url: sanitizedUrl, key }
}

const restHeaders = (key: string, extra?: Record<string, string>) => ({
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
  ...extra,
})

/** Read a single system_settings row by key via raw HTTP. */
const restReadRow = async (settingKey: SettingKey): Promise<{ value: Record<string, unknown> | null; updated_at: string | null; error: string | null }> => {
  const { url, key } = getSupabaseEnv()
  const endpoint = `${url}/rest/v1/system_settings?key=eq.${encodeURIComponent(settingKey)}&select=key,value,updated_at&limit=1`
  const res = await fetch(endpoint, {
    method: 'GET',
    headers: restHeaders(key, { 'Cache-Control': 'no-store' }),
    cache: 'no-store',
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    return { value: null, updated_at: null, error: `GET ${settingKey} failed (${res.status}): ${text}` }
  }
  const rows = await res.json().catch(() => []) as Array<{ key: string; value: unknown; updated_at: string }>
  if (!rows || rows.length === 0) return { value: null, updated_at: null, error: null }
  return { value: parseMaybeJsonObject(rows[0].value), updated_at: rows[0].updated_at || null, error: null }
}

/** Write (upsert) a system_settings row via raw HTTP. PATCH then POST fallback. */
const restWriteRow = async (settingKey: SettingKey, value: unknown, updatedAt: string): Promise<{ persisted: Record<string, unknown> | null; wroteAt: string; error: string | null }> => {
  const { url, key } = getSupabaseEnv()

  const patchEndpoint = `${url}/rest/v1/system_settings?key=eq.${encodeURIComponent(settingKey)}`
  const patchBody = JSON.stringify({ value, updated_at: updatedAt })

  const patchRes = await fetch(patchEndpoint, {
    method: 'PATCH',
    headers: restHeaders(key, { Prefer: 'return=representation' }),
    body: patchBody,
    cache: 'no-store',
  })

  if (!patchRes.ok) {
    const text = await patchRes.text().catch(() => '')
    return { persisted: null, wroteAt: updatedAt, error: `PATCH ${settingKey} failed (${patchRes.status}): ${text}` }
  }

  const patchRows = await patchRes.json().catch(() => []) as Array<{ value: unknown }>

  if (patchRows && patchRows.length > 0) {
    return { persisted: parseMaybeJsonObject(patchRows[0].value), wroteAt: updatedAt, error: null }
  }

  // PATCH touched 0 rows → INSERT
  const postEndpoint = `${url}/rest/v1/system_settings`
  const postRes = await fetch(postEndpoint, {
    method: 'POST',
    headers: restHeaders(key, { Prefer: 'return=representation' }),
    body: JSON.stringify({ key: settingKey, value, updated_at: updatedAt }),
    cache: 'no-store',
  })

  if (!postRes.ok) {
    const text = await postRes.text().catch(() => '')
    return { persisted: null, wroteAt: updatedAt, error: `POST ${settingKey} failed (${postRes.status}): ${text}` }
  }

  const postRows = await postRes.json().catch(() => []) as Array<{ value: unknown }>
  return {
    persisted: postRows && postRows.length > 0 ? parseMaybeJsonObject(postRows[0].value) : parseMaybeJsonObject(value),
    wroteAt: updatedAt,
    error: null,
  }
}

// ---------------------------------------------------------------------------
// Supabase JS client — used only for auth checks
// ---------------------------------------------------------------------------

const createServiceClient = () => {
  const { url, key } = getSupabaseEnv()
  return createClient(url, key)
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

const ensureAdmin = async (req: NextRequest) => {
  const supabase = createServiceClient()
  let user = null as Awaited<ReturnType<typeof resolveRequestUser>>

  const bearerToken = extractBearerToken(req)
  if (bearerToken) {
    const { data: authData, error: authError } = await supabase.auth.getUser(bearerToken)
    if (!authError && authData?.user) user = authData.user
  }

  if (!user) user = await resolveRequestUser(req)
  if (!user) return { ok: false as const, status: 401, error: 'Unauthorized' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const profileRole = String(profile?.role || '').toLowerCase()
  const metaRole = String((user.user_metadata as Record<string, unknown> | undefined)?.role || '').toLowerCase()
  const appRole = String((user.app_metadata as Record<string, unknown> | undefined)?.role || '').toLowerCase()

  if (profileRole !== 'admin' && metaRole !== 'admin' && appRole !== 'admin') {
    return { ok: false as const, status: 403, error: 'Forbidden' }
  }

  return { ok: true as const, userId: user.id, userEmail: user.email || null }
}

const ensureAuthenticated = async (req: NextRequest) => {
  const user = await resolveRequestUser(req)
  if (!user) return { ok: false as const, status: 401, error: 'Unauthorized' }
  return { ok: true as const, userId: user.id, userEmail: user.email || null }
}

// ---------------------------------------------------------------------------
// Audit (best-effort — raw REST bypasses audit_logs RLS INSERT policy)
// ---------------------------------------------------------------------------

const writeAudit = async (payload: { action: string; details: Record<string, unknown> }) => {
  try {
    const { url, key } = getSupabaseEnv()
    await fetch(`${url}/rest/v1/audit_logs`, {
      method: 'POST',
      headers: restHeaders(key, { Prefer: 'return=minimal' }),
      body: JSON.stringify(payload),
      cache: 'no-store',
    })
  } catch { /* Non-blocking */ }
}

// ---------------------------------------------------------------------------
// Settings resolution
// ---------------------------------------------------------------------------

const resolveSettings = (rows: Array<{ key: string; value: unknown }>) => {
  const map = new Map(rows.map((r) => [r.key, r.value]))
  return {
    companyInfo: { ...DEFAULTS.company_info, ...parseMaybeJsonObject(map.get('company_info')) },
    financialInfo: { ...DEFAULTS.financial_info, ...parseMaybeJsonObject(map.get('financial_info')) },
    features: sanitizeFeatures(map.get('features')),
  }
}

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const requestId = getRequestId(req.headers)

  try {
    const auth = await ensureAuthenticated(req)
    if (!auth.ok) return NextResponse.json({ error: auth.error, requestId }, { status: auth.status })

    const { url, key } = getSupabaseEnv()
    const debugMode = req.nextUrl.searchParams.get('debug') === '1'

    if (debugMode) {
      const rawRes = await fetch(
        `${url}/rest/v1/system_settings?select=key,value,updated_at&order=key.asc`,
        { method: 'GET', headers: restHeaders(key, { 'Cache-Control': 'no-store' }), cache: 'no-store' }
      )
      const rawRows = rawRes.ok ? (await rawRes.json().catch(() => [])) : []

      const logsRes = await fetch(
        `${url}/rest/v1/audit_logs?action=eq.system_settings_save&order=created_at.desc&limit=10&select=created_at,action,details,user_id,user_email`,
        { method: 'GET', headers: restHeaders(key, { 'Cache-Control': 'no-store' }), cache: 'no-store' }
      )
      const logs = logsRes.ok ? (await logsRes.json().catch(() => [])) : []

      return NextResponse.json(
        {
          success: true,
          requestId,
          rawRows,
          recentSaveLogs: logs,
          resolved: resolveSettings(rawRows),
        },
        { headers: { 'Cache-Control': 'no-store, max-age=0' } }
      )
    }

    const [companyRes, financialRes, featuresRes] = await Promise.all([
      restReadRow('company_info'),
      restReadRow('financial_info'),
      restReadRow('features'),
    ])

    const firstError = companyRes.error || financialRes.error || featuresRes.error
    if (firstError) return NextResponse.json({ error: firstError, requestId }, { status: 500 })

    const resolved = resolveSettings([
      { key: 'company_info', value: companyRes.value || {} },
      { key: 'financial_info', value: financialRes.value || {} },
      { key: 'features', value: featuresRes.value || {} },
    ])

    return NextResponse.json(
      { success: true, requestId, ...resolved },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error', requestId }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// PUT
// ---------------------------------------------------------------------------

export async function PUT(req: NextRequest) {
  const requestId = getRequestId(req.headers)

  try {
    const auth = await ensureAdmin(req)
    if (!auth.ok) return NextResponse.json({ error: auth.error, requestId }, { status: auth.status })

    const body = await req.json().catch(() => ({}))
    const now = new Date().toISOString()

    await writeAudit({
      action: 'system_settings_save',
      details: {
        stage: 'attempt',
        request_id: requestId,
        actor: { userId: auth.userId, userEmail: auth.userEmail },
        now,
        hasCompanyInfo: Boolean(body?.companyInfo && typeof body.companyInfo === 'object'),
        hasFinancialInfo: Boolean(body?.financialInfo && typeof body.financialInfo === 'object'),
        hasFeatures: Boolean(body?.features && typeof body.features === 'object'),
      },
    })

    const normalizedCompanyInfo = {
      ...DEFAULTS.company_info,
      ...(body?.companyInfo && typeof body.companyInfo === 'object' ? parseMaybeJsonObject(body.companyInfo) : {}),
    }
    const normalizedFinancialInfo = {
      ...DEFAULTS.financial_info,
      ...(body?.financialInfo && typeof body.financialInfo === 'object' ? parseMaybeJsonObject(body.financialInfo) : {}),
    }
    const normalizedFeatures = sanitizeFeatures(body?.features)

    // Write all relevant keys in parallel via raw REST
    const writePromises: Array<Promise<{ key: SettingKey; persisted: Record<string, unknown> | null; wroteAt: string; error: string | null }>> = []

    if (body?.companyInfo && typeof body.companyInfo === 'object') {
      writePromises.push(restWriteRow('company_info', normalizedCompanyInfo, now).then((r) => ({ key: 'company_info' as SettingKey, ...r })))
    }
    if (body?.financialInfo && typeof body.financialInfo === 'object') {
      writePromises.push(restWriteRow('financial_info', normalizedFinancialInfo, now).then((r) => ({ key: 'financial_info' as SettingKey, ...r })))
    }
    if (body?.features && typeof body.features === 'object') {
      writePromises.push(restWriteRow('features', normalizedFeatures, now).then((r) => ({ key: 'features' as SettingKey, ...r })))
    }

    if (writePromises.length === 0) {
      return NextResponse.json({ error: 'No valid settings payload provided', requestId }, { status: 400 })
    }

    const writeResults = await Promise.all(writePromises)

    for (const result of writeResults) {
      if (result.error) {
        await writeAudit({
          action: 'system_settings_save',
          details: {
            stage: 'write_error',
            request_id: requestId,
            actor: { userId: auth.userId, userEmail: auth.userEmail },
            key: result.key,
            error: result.error,
          },
        })
        return NextResponse.json({ error: `Write failed for ${result.key}: ${result.error}`, requestId }, { status: 500 })
      }
    }

    // Independent read-back to verify (separate HTTP connection, not from cache)
    const featureWritten = writePromises.some((_, i) => writeResults[i].key === 'features')

    const [verifyCompany, verifyFinancial, verifyFeatures] = await Promise.all([
      body?.companyInfo ? restReadRow('company_info') : Promise.resolve(null),
      body?.financialInfo ? restReadRow('financial_info') : Promise.resolve(null),
      body?.features ? restReadRow('features') : Promise.resolve(null),
    ])

    // Critical: verify features read-back
    if (featureWritten && body?.features && typeof body.features === 'object') {
      if (verifyFeatures?.error) {
        await writeAudit({
          action: 'system_settings_save',
          details: {
            stage: 'readback_error',
            request_id: requestId,
            actor: { userId: auth.userId, userEmail: auth.userEmail },
            error: verifyFeatures.error,
          },
        })
        // Readback failed but write may have succeeded — return success with warning
      } else {
        const readBackFeatures = sanitizeFeatures(verifyFeatures?.value)
        if (stableJson(readBackFeatures) !== stableJson(normalizedFeatures)) {
          await writeAudit({
            action: 'system_settings_save',
            details: {
              stage: 'readback_mismatch',
              request_id: requestId,
              actor: { userId: auth.userId, userEmail: auth.userEmail },
              expected: normalizedFeatures,
              readback: readBackFeatures,
              wrote_at: now,
              readback_updated_at: verifyFeatures?.updated_at,
            },
          })

          return NextResponse.json(
            {
              error: 'Write failed: read-back does not match. A DB trigger or cron is reverting features. Check Supabase dashboard for triggers/functions on system_settings.',
              requestId,
              mismatch: {
                features: {
                  expected: normalizedFeatures,
                  readback: readBackFeatures,
                  wrote_at: now,
                  readback_updated_at: verifyFeatures?.updated_at,
                },
              },
            },
            { status: 409, headers: { 'Cache-Control': 'no-store, max-age=0' } }
          )
        }
      }
    }

    const responseFeatures = body?.features ? sanitizeFeatures(verifyFeatures?.value ?? normalizedFeatures) : normalizedFeatures
    const responseCompanyInfo = body?.companyInfo
      ? { ...normalizedCompanyInfo, ...parseMaybeJsonObject(verifyCompany?.value) }
      : normalizedCompanyInfo
    const responseFinancialInfo = body?.financialInfo
      ? { ...normalizedFinancialInfo, ...parseMaybeJsonObject(verifyFinancial?.value) }
      : normalizedFinancialInfo

    await writeAudit({
      action: 'system_settings_save',
      details: {
        stage: 'success',
        request_id: requestId,
        actor: { userId: auth.userId, userEmail: auth.userEmail },
        features_requested: normalizedFeatures,
        features_readback: responseFeatures,
        wrote_at: now,
      },
    })

    return NextResponse.json(
      {
        success: true,
        requestId,
        companyInfo: responseCompanyInfo,
        financialInfo: responseFinancialInfo,
        features: responseFeatures,
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error', requestId }, { status: 500 })
  }
}
