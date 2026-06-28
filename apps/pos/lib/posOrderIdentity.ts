export type POSOrderType = 'dine_in' | 'takeaway' | 'delivery'

export type POSOrderIdentity = {
  orderNumber: string
  queueNumber: number
}

const isMissingQueueColumnError = (error: any) => {
  const message = String(error?.message || error || '')
  return /queue_number/i.test(message) && /(does not exist|column|schema cache)/i.test(message)
}

export const getPOSOrderPrefix = (orderType?: string | null) => {
  switch (orderType) {
    case 'dine_in':
      return 'DIN'
    case 'delivery':
      return 'DEL'
    case 'takeaway':
    default:
      return 'TAK'
  }
}

const normalizeQueueNumber = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : null
}

const fallbackOrderNumber = (prefix: string) => {
  const now = new Date()
  const datePart = [
    String(now.getFullYear()).slice(-2),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('')
  return `${prefix}#${datePart}-${String(Date.now()).slice(-4)}`
}

export const reservePOSOrderIdentity = async (
  supabase: any,
  options: {
    orderType?: string | null
    branchId?: string | null
    shiftId?: string | null
    existingOrderId?: string | null
  }
): Promise<POSOrderIdentity> => {
  const prefix = getPOSOrderPrefix(options.orderType)
  let existingOrderNumber: string | null = null

  if (options.existingOrderId) {
    let existingOrder: any = null

    const existingOrderResult = await supabase
      .from('pos_orders')
      .select('id, order_number, queue_number, shift_id, branch_id, created_at')
      .eq('id', options.existingOrderId)
      .maybeSingle()

    if (existingOrderResult.error) {
      if (!isMissingQueueColumnError(existingOrderResult.error)) {
        throw existingOrderResult.error
      }

      const fallbackExistingOrderResult = await supabase
        .from('pos_orders')
        .select('id, order_number, shift_id, branch_id, created_at')
        .eq('id', options.existingOrderId)
        .maybeSingle()

      if (fallbackExistingOrderResult.error) {
        throw fallbackExistingOrderResult.error
      }

      existingOrder = fallbackExistingOrderResult.data
    } else {
      existingOrder = existingOrderResult.data
    }

    if (existingOrder?.order_number) {
      existingOrderNumber = existingOrder.order_number
      const existingQueue = normalizeQueueNumber(existingOrder.queue_number)
      if (existingQueue) {
        return {
          orderNumber: existingOrderNumber,
          queueNumber: existingQueue,
        }
      }
    }
  }

  let orderNumber = existingOrderNumber || fallbackOrderNumber(prefix)
  if (!existingOrderNumber) {
    try {
      const { data } = await supabase.rpc('generate_unique_order_number', { prefix })
      if (data) orderNumber = data
    } catch {
      orderNumber = fallbackOrderNumber(prefix)
    }
  }

  let queueQuery = supabase
    .from('pos_orders')
    .select('queue_number')
    .not('queue_number', 'is', null)
    .neq('status', 'cancelled')
    .order('queue_number', { ascending: false })
    .limit(1)

  if (options.shiftId) {
    queueQuery = queueQuery.eq('shift_id', options.shiftId)
  } else if (options.branchId) {
    queueQuery = queueQuery.eq('branch_id', options.branchId)
  }

  if (options.existingOrderId) {
    queueQuery = queueQuery.neq('id', options.existingOrderId)
  }

  const latestQueueResult = await queueQuery.maybeSingle()
  if (latestQueueResult.error && !isMissingQueueColumnError(latestQueueResult.error)) {
    throw latestQueueResult.error
  }

  const latestQueue = normalizeQueueNumber(latestQueueResult.data?.queue_number) || 0
  const queueNumber = latestQueue + 1

  return { orderNumber, queueNumber }
}
