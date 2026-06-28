export const dynamic = 'force-dynamic'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { reservePOSOrderIdentity } from '@/lib/posOrderIdentity'

const isMissingQueueColumnError = (error: any) => {
  const message = String(error?.message || error || '')
  return /queue_number/i.test(message) && /(does not exist|column|schema cache)/i.test(message)
}

const normalizeModifiers = (modifiers: any[] = []) =>
  [...modifiers]
    .map((mod: any) => ({
      id: mod?.id || null,
      name: String(mod?.name || ''),
      value: String(mod?.value || ''),
      price: Number(mod?.price_adjustment || mod?.price || 0),
    }))
    .sort((a, b) => `${a.id || ''}${a.name}${a.value}${a.price}`.localeCompare(`${b.id || ''}${b.name}${b.value}${b.price}`))

const buildPersistedModifiers = (item: any) => {
  const note = String(item?.note || '').trim()
  const baseModifiers = Array.isArray(item?.selected_modifiers) ? item.selected_modifiers : []
  if (!note) return baseModifiers
  return [
    ...baseModifiers.filter((modifier: any) => String(modifier?.name || '') !== 'หมายเหตุ'),
    { name: 'หมายเหตุ', value: note, is_note: true },
  ]
}

const buildItemFingerprint = (items: any[] = []) =>
  [...items]
    .map((item: any) => ({
      item_id: String(item?.id || item?.item_id || ''),
      quantity: Number(item?.quantity || 0),
      unit_price: Number(item?.sale_price || item?.unit_price || 0),
      selected_modifiers: normalizeModifiers(buildPersistedModifiers({
        ...item,
        selected_modifiers: item?.selected_modifiers || (item?.sweetness ? [{ name: 'Sweetness', value: item.sweetness }] : []),
      })),
    }))
    .sort((a, b) => `${a.item_id}:${a.unit_price}`.localeCompare(`${b.item_id}:${b.unit_price}`))

const sameItemFingerprint = (left: any[], right: any[]) => JSON.stringify(buildItemFingerprint(left)) === JSON.stringify(buildItemFingerprint(right))

export async function POST(req: Request) {
  try {
    const { 
      items, 
      orderType, 
      deliveryAddress, 
      latitude,
      longitude,
      deliveryFee: requestedDeliveryFee,
      pickupTime,
      lineUserId, 
      customerName, 
      customerImage, 
      phoneNumber, 
      notes,
      branchId,
    } = await req.json()

    const deliveryLatitude = typeof latitude === 'number' ? latitude : null
    const deliveryLongitude = typeof longitude === 'number' ? longitude : null
    const orderComment = typeof notes === 'string' ? notes.trim() : null
    const pickupTimeText = typeof pickupTime === 'string' ? pickupTime.trim() : ''
    
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {}
          },
        },
      }
    )

    let settingsQuery = supabase
      .from('pos_shop_settings')
      .select('status, is_open, status_expiry, branch_id')
      .limit(1)

    if (branchId) {
      settingsQuery = settingsQuery.eq('branch_id', branchId)
    }

    const { data: settingsRows } = await settingsQuery
    const currentSettings = settingsRows?.[0]

    let shiftQuery = supabase
      .from('pos_shifts')
      .select('id')
      .eq('status', 'open')
      .limit(1)

    if (branchId) {
      shiftQuery = shiftQuery.eq('branch_id', branchId)
    }

    const { data: activeShifts } = await shiftQuery
    const activeShift = activeShifts?.[0] || null
    const hasActiveShift = !!activeShifts?.length

    const now = new Date()
    let isAcceptingOrders = hasActiveShift
    if (currentSettings?.is_open === false) {
      isAcceptingOrders = false
    } else if (currentSettings?.status === 'paused' || currentSettings?.status === 'closed') {
      isAcceptingOrders = currentSettings.status_expiry
        ? now >= new Date(currentSettings.status_expiry)
        : false
    }

    if (!isAcceptingOrders) {
      return NextResponse.json(
        { error: 'ขออภัย ขณะนี้ร้านปิดให้บริการ ไม่สามารถสั่งซื้อได้ในขณะนี้' },
        { status: 409 }
      )
    }

    // 1. Calculate Grand Total
    if (orderType === 'delivery' && requestedDeliveryFee === -1) {
      return NextResponse.json({ error: 'Out of delivery service area' }, { status: 400 });
    }
    if (orderType === 'takeaway' && !pickupTimeText) {
      return NextResponse.json({ error: 'กรุณาระบุเวลาที่จะมารับออเดอร์' }, { status: 400 })
    }
    const deliveryFee = orderType === 'delivery' ? (requestedDeliveryFee ?? 50) : 0;
    const subtotal = items.reduce((acc: number, item: any) => {
      const modsPrice = item.selected_modifiers?.reduce((macc: number, m: any) => macc + (m.price_adjustment || m.price || 0), 0) || 0;
      return acc + ((item.sale_price + modsPrice) * item.quantity);
    }, 0);
    const totalAmount = subtotal + deliveryFee;

    // LIFF delivery/takeaway is temporarily COD-only so the order can
    // enter the POS queue immediately without waiting on online payments.
    const paymentMethod = 'cod'
    const paymentResponse: any = { success: true }
    const paymentIntentId = null
    const initialStatus = 'pending'
    const combinedCommentParts = []
    if (orderType === 'takeaway' && pickupTimeText) combinedCommentParts.push(`เวลารับ: ${pickupTimeText}`)
    if (orderComment) combinedCommentParts.push(orderComment)
    const combinedComment = combinedCommentParts.length > 0 ? combinedCommentParts.join('\n') : null

    // De-dupe accidental double-taps / repeated LIFF submissions in a short window.
    const duplicateCutoff = new Date(Date.now() - 60_000).toISOString()
    let duplicateQuery = supabase
      .from('pos_orders')
      .select('id, order_number, created_at, total_amount, delivery_address, reference_name, customer_name, line_user_id, pos_order_items(item_id, quantity, unit_price, selected_modifiers)')
      .eq('order_source', 'liff')
      .eq('order_type', orderType)
      .eq('payment_method', paymentMethod)
      .in('status', ['pending', 'accepted', 'preparing', 'shipping'])
      .gte('created_at', duplicateCutoff)
      .order('created_at', { ascending: false })
      .limit(8)

    if (branchId) duplicateQuery = duplicateQuery.eq('branch_id', branchId)
    if (lineUserId) duplicateQuery = duplicateQuery.eq('line_user_id', lineUserId)
    else if (phoneNumber) duplicateQuery = duplicateQuery.eq('reference_name', phoneNumber)

    const { data: duplicateCandidates } = await duplicateQuery
    const trimmedAddress = String(deliveryAddress || '').trim()
    const duplicateOrder = (duplicateCandidates || []).find((candidate: any) => {
      const sameTotal = Math.abs(Number(candidate?.total_amount || 0) - totalAmount) < 0.01
      const samePhone = String(candidate?.reference_name || '') === String(phoneNumber || '')
      const sameAddress = String(candidate?.delivery_address || '').trim() === trimmedAddress
      const sameUser = lineUserId ? String(candidate?.line_user_id || '') === String(lineUserId) : true
      const sameName = String(candidate?.customer_name || '') === String(customerName || '')
      const sameItems = sameItemFingerprint(items, candidate?.pos_order_items || [])
      return sameTotal && samePhone && sameAddress && sameUser && sameName && sameItems
    })

    if (duplicateOrder) {
      return NextResponse.json({
        ...paymentResponse,
        orderId: duplicateOrder.id,
        orderNumber: duplicateOrder.order_number,
        paymentMethod,
        deduped: true,
      })
    }

    // 3. GENERATE ONE SHARED IDENTITY: order_number is the internal bill,
    // queue_number is the kitchen/customer queue for the active shift.
    const identity = await reservePOSOrderIdentity(supabase as any, {
      orderType,
      branchId,
      shiftId: activeShift?.id || null,
    })

    // 4. CREATE THE ORDER RECORD
    const orderInsertPayload: any = {
      order_number: identity.orderNumber,
      queue_number: identity.queueNumber,
      shift_id: activeShift?.id || null,
      payment_intent_id: paymentIntentId,
      line_user_id: lineUserId,
      customer_name: customerName,
      customer_image: customerImage,
      order_type: orderType,
      delivery_address: deliveryAddress,
      delivery_latitude: deliveryLatitude,
      delivery_longitude: deliveryLongitude,
      delivery_fee: deliveryFee,
      status: initialStatus,
      order_source: 'liff',
      total_amount: totalAmount,
      net_total: totalAmount,
      payment_method: paymentMethod,
      reference_name: phoneNumber,
      comment: combinedComment,
      branch_id: branchId,
    }

    let order: any = null
    const orderInsertResult = await supabase
      .from('pos_orders')
      .insert(orderInsertPayload)
      .select()
      .single()

    if (orderInsertResult.error) {
      if (!isMissingQueueColumnError(orderInsertResult.error)) {
        throw orderInsertResult.error
      }

      const fallbackInsertPayload = { ...orderInsertPayload }
      delete fallbackInsertPayload.queue_number

      const fallbackInsertResult = await supabase
        .from('pos_orders')
        .insert(fallbackInsertPayload)
        .select()
        .single()

      if (fallbackInsertResult.error) {
        throw fallbackInsertResult.error
      }

      order = fallbackInsertResult.data
    } else {
      order = orderInsertResult.data
    }

    // 5. INSERT ORDER ITEMS
    const itemIds = items.map((i: any) => i.id || i.item_id);
    const { data: dbItems } = await supabase.from('pos_menu_items').select('id, cost_price').in('id', itemIds);

    const orderItems = items.map((item: any) => {
      const dbItem = dbItems?.find((d: any) => d.id === (item.id || item.item_id));
      const modsPrice = item.selected_modifiers?.reduce((macc: number, m: any) => macc + (m.price_adjustment || m.price || 0), 0) || 0;
      return {
        order_id: order.id,
        item_id: item.id || item.item_id,
        quantity: item.quantity,
        unit_price: Number(item.sale_price || item.unit_price || 0),
        cost_price: dbItem?.cost_price || 0,
        subtotal: (Number(item.sale_price || item.unit_price || 0) + modsPrice) * item.quantity,
        selected_modifiers: buildPersistedModifiers({
          ...item,
          selected_modifiers: item.selected_modifiers || (item.sweetness ? [{ name: 'Sweetness', value: item.sweetness }] : []),
        }),
      };
    })

    const { error: itemsError } = await supabase.from('pos_order_items').insert(orderItems)
    if (itemsError) throw itemsError

    return NextResponse.json({ 
      ...paymentResponse,
      orderId: order.id, 
      orderNumber: order.order_number,
      paymentMethod,
    })

  } catch (err: any) {
    console.error('Checkout API Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
