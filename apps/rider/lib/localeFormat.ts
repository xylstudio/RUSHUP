import type { Locale } from '@/lib/I18nContext'

export const resolveLocaleTag = (locale: Locale = 'th') => {
  switch (locale) {
    case 'en':
      return 'en-US'
    case 'zh':
      return 'zh-CN'
    case 'th':
    default:
      return 'th-TH'
  }
}

export const formatDateByLocale = (
  value: string | Date | null | undefined,
  locale: Locale = 'th',
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' }
) => {
  if (!value) return '-'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString(resolveLocaleTag(locale), options)
}

export const formatDateTimeByLocale = (
  value: string | Date | null | undefined,
  locale: Locale = 'th',
  options: Intl.DateTimeFormatOptions = { dateStyle: 'short', timeStyle: 'short' }
) => {
  if (!value) return '-'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString(resolveLocaleTag(locale), options)
}

export const formatTimeByLocale = (
  timeString: string | null | undefined,
  locale: Locale = 'th',
  options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
) => {
  if (!timeString) return '-'
  const date = new Date(`1970-01-01T${timeString}`)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleTimeString(resolveLocaleTag(locale), options)
}

export const formatCurrencyByLocale = (
  amount: number | null | undefined,
  locale: Locale = 'th',
  currency = 'THB'
) => {
  const safeAmount = typeof amount === 'number' ? amount : 0
  return new Intl.NumberFormat(resolveLocaleTag(locale), {
    style: 'currency',
    currency,
  }).format(safeAmount)
}

export const formatNumberByLocale = (value: number | null | undefined, locale: Locale = 'th') => {
  const safeValue = typeof value === 'number' ? value : 0
  return new Intl.NumberFormat(resolveLocaleTag(locale)).format(safeValue)
}