export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const env = (value?: string) => (value || '').trim()
const DEFAULT_SHOP_SETTINGS_ID = '00000000-0000-0000-0000-000000000001'

const createServiceClient = () => {
  const supabaseUrl = env(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const serviceRoleKey = env(process.env.SUPABASE_SERVICE_ROLE_KEY)
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient<any>(supabaseUrl, serviceRoleKey)
}

const updateShopStatus = async (
  supabase: ReturnType<typeof createServiceClient>,
  status: 'open' | 'closed',
  options: { shopSettingsId?: string | null; branchId?: string | null }
) => {
  const warnings: string[] = []
  const payload = {
    status,
    is_open: status === 'open',
    status_expiry: null,
    updated_at: new Date().toISOString(),
  }

  if (options.shopSettingsId) {
    const { data, error } = await supabase
      .from('pos_shop_settings')
      .update(payload)
      .eq('id', options.shopSettingsId)
      .select('id')

    if (!error && data?.length) return warnings
    if (!error) warnings.push('shop_settings_by_id:no_rows')
    else warnings.push(`shop_settings_by_id:${error.message}`)
  }

  if (options.branchId) {
    const { data, error } = await supabase
      .from('pos_shop_settings')
      .update(payload)
      .eq('branch_id', options.branchId)
      .select('id')

    if (!error && data?.length) return warnings
    if (!error) warnings.push('shop_settings_by_branch:no_rows')
    else warnings.push(`shop_settings_by_branch:${error.message}`)
  }

  const { data, error } = await supabase
    .from('pos_shop_settings')
    .update(payload)
    .eq('id', DEFAULT_SHOP_SETTINGS_ID)
    .select('id')

  if (!error && data?.length) return warnings
  if (error) {
    warnings.push(`shop_settings_default:${error.message}`)
    return warnings
  }

  const { error: insertError } = await supabase
    .from('pos_shop_settings')
    .insert({ id: DEFAULT_SHOP_SETTINGS_ID, ...payload })

  if (insertError) warnings.push(`shop_settings_default_insert:${insertError.message}`)
  return warnings
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const action = body?.action as 'open' | 'close' | undefined
    const staffId = typeof body?.staffId === 'string' ? body.staffId : null
    const shiftId = typeof body?.shiftId === 'string' ? body.shiftId : null
    const branchId = typeof body?.branchId === 'string' ? body.branchId : null
    const shopSettingsId = typeof body?.shopSettingsId === 'string' ? body.shopSettingsId : null

    if (!action || !['open', 'close'].includes(action)) {
      return NextResponse.json({ error: 'Invalid shift action' }, { status: 400 })
    }

    const supabase = createServiceClient()

    if (action === 'open') {
      if (!staffId) {
        return NextResponse.json({ error: 'Missing staffId' }, { status: 400 })
      }

      let existingShift: any = null
      if (branchId) {
        const { data, error } = await supabase
          .from('pos_shifts')
          .select('*')
          .eq('status', 'open')
          .eq('branch_id', branchId)
          .order('opened_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!error) existingShift = data
      }

      if (!existingShift) {
        const { data } = await supabase
          .from('pos_shifts')
          .select('*')
          .eq('status', 'open')
          .eq('staff_id', staffId)
          .order('opened_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        existingShift = data
      }

      if (existingShift) {
        const warnings = await updateShopStatus(supabase, 'open', { shopSettingsId, branchId })
        return NextResponse.json({ ok: true, shift: existingShift, reused: true, warnings })
      }

      const startCash = Number(body?.startCash || 0)
      const insertPayload: any = {
        staff_id: staffId,
        start_cash: Number.isFinite(startCash) ? startCash : 0,
        status: 'open',
      }
      if (branchId) insertPayload.branch_id = branchId

      let { data: shift, error } = await supabase
        .from('pos_shifts')
        .insert(insertPayload)
        .select()
        .single()

      if (error && branchId) {
        const fallbackPayload = { ...insertPayload }
        delete fallbackPayload.branch_id
        const fallback = await supabase
          .from('pos_shifts')
          .insert(fallbackPayload)
          .select()
          .single()
        shift = fallback.data
        error = fallback.error
      }

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      const warnings = await updateShopStatus(supabase, 'open', { shopSettingsId, branchId })
      return NextResponse.json({ ok: true, shift, reused: false, warnings })
    }

    const closePayload = {
      status: 'closed',
      closed_at: new Date().toISOString(),
      actual_cash: Number(body?.actualCash || 0),
      end_cash: Number(body?.actualCash || 0),
    }

    let closedShifts: any[] | null = null
    let closeError: any = null

    if (branchId) {
      const result = await supabase
        .from('pos_shifts')
        .update(closePayload)
        .eq('status', 'open')
        .eq('branch_id', branchId)
        .select()
      closedShifts = result.data
      closeError = result.error
    }

    if ((closeError || !closedShifts?.length) && shiftId) {
      const result = await supabase
        .from('pos_shifts')
        .update(closePayload)
        .eq('id', shiftId)
        .select()
      closedShifts = result.data
      closeError = result.error
    }

    if ((closeError || !closedShifts?.length) && staffId) {
      const result = await supabase
        .from('pos_shifts')
        .update(closePayload)
        .eq('status', 'open')
        .eq('staff_id', staffId)
        .select()
      closedShifts = result.data
      closeError = result.error
    }

    if (closeError) {
      return NextResponse.json({ error: closeError.message }, { status: 500 })
    }

    const warnings = await updateShopStatus(supabase, 'closed', { shopSettingsId, branchId })
    return NextResponse.json({
      ok: true,
      shift: closedShifts?.[0] || null,
      closedShiftCount: closedShifts?.length || 0,
      warnings,
    })
  } catch (error: any) {
    console.error('POS shift API error:', error)
    return NextResponse.json({ error: error.message || 'Shift API error' }, { status: 500 })
  }
}
