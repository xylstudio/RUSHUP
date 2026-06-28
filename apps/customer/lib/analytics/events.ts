export type ProductEventName =
  | 'customer_reports_viewed'
  | 'admin_reports_viewed'
  | 'admin_reports_csv_exported'
  | 'work_report_submitted'

export type ProductEventPayload = Record<string, string | number | boolean | null | undefined>

export const trackProductEvent = (eventName: ProductEventName, payload: ProductEventPayload = {}) => {
  const path = typeof window !== 'undefined' ? window.location.pathname : ''
  const event = {
    eventName,
    payload,
    path,
    at: new Date().toISOString(),
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('xylem:product-event', { detail: event }))

    const body = JSON.stringify({
      eventName,
      payload,
      path,
    })

    void fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {
      // best effort
    })
  }

  if (process.env.NODE_ENV !== 'production') {
    console.info('[xylem:event]', event)
  }
}
