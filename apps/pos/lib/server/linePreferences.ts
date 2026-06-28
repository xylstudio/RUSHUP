export type LineNotificationCategory = 'new_order' | 'job_assigned' | 'order_status' | 'system' | 'reschedule'

export type LineNotificationPreferences = {
  enabled: boolean
  new_order: boolean
  job_assigned: boolean
  order_status: boolean
  system: boolean
  reschedule: boolean
}

const ROLE_DEFAULTS: Record<string, LineNotificationPreferences> = {
  admin: {
    enabled: true,
    new_order: true,
    job_assigned: false,
    order_status: true,
    system: true,
    reschedule: true,
  },
  staff: {
    enabled: true,
    new_order: false,
    job_assigned: true,
    order_status: true,
    system: true,
    reschedule: true,
  },
  customer: {
    enabled: true,
    new_order: false,
    job_assigned: false,
    order_status: true,
    system: true,
    reschedule: true,
  },
}

const toBoolean = (value: unknown, fallback: boolean) => {
  return typeof value === 'boolean' ? value : fallback
}

export const getDefaultLinePreferencesForRole = (role?: string | null): LineNotificationPreferences => {
  const normalizedRole = String(role || 'customer').toLowerCase()
  return ROLE_DEFAULTS[normalizedRole] || ROLE_DEFAULTS.customer
}

export const resolveLinePreferences = (
  userMetadata: Record<string, unknown> | null | undefined,
  role?: string | null
): LineNotificationPreferences => {
  const defaults = getDefaultLinePreferencesForRole(role)
  const root = (userMetadata || {}) as Record<string, unknown>
  const notificationPreferences =
    root.notification_preferences && typeof root.notification_preferences === 'object'
      ? (root.notification_preferences as Record<string, unknown>)
      : {}
  const line =
    notificationPreferences.line && typeof notificationPreferences.line === 'object'
      ? (notificationPreferences.line as Record<string, unknown>)
      : {}

  return {
    enabled: toBoolean(line.enabled, defaults.enabled),
    new_order: toBoolean(line.new_order, defaults.new_order),
    job_assigned: toBoolean(line.job_assigned, defaults.job_assigned),
    order_status: toBoolean(line.order_status, defaults.order_status),
    system: toBoolean(line.system, defaults.system),
    reschedule: toBoolean(line.reschedule || line.order_status, defaults.reschedule),
  }
}

export const isLineCategoryEnabled = (
  preferences: LineNotificationPreferences,
  category: LineNotificationCategory
) => {
  if (!preferences.enabled) return false
  return preferences[category]
}
