'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type Locale = 'th' | 'en' | 'zh'
type LocalePreferenceMode = 'system' | 'manual'

type Dict = Record<string, string>

type Dictionaries = Record<Locale, Dict>

import { th } from './locales/th'
import { en } from './locales/en'
import { zh } from './locales/zh'

const dictionaries: Dictionaries = {
  th,
  en,
  zh
}

type I18nContextValue = {
  locale: Locale
  setLocale: (l: Locale) => void
  resetLocaleToSystem: () => void
  systemLocale: Locale
  preferenceMode: LocalePreferenceMode
  t: (key: string) => string
  copy: Dict
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined)

const LOCALE_STORAGE_KEY = 'xylem.locale'
const LOCALE_MODE_STORAGE_KEY = 'xylem.locale.mode'
const SUPPORTED_LOCALES: Locale[] = ['th', 'en', 'zh']

const isSupportedLocale = (value: string | null | undefined): value is Locale => {
  return Boolean(value && SUPPORTED_LOCALES.includes(value as Locale))
}

const normalizeLocale = (value: string | null | undefined): Locale | null => {
  if (!value) return null

  const lowered = value.toLowerCase()
  if (lowered.startsWith('th')) return 'th'
  if (lowered.startsWith('en')) return 'en'
  if (lowered.startsWith('zh')) return 'zh'
  return null
}

const detectSystemLocale = (): Locale => {
  if (typeof window === 'undefined') return 'th'

  const candidates = Array.isArray(window.navigator.languages) && window.navigator.languages.length > 0
    ? window.navigator.languages
    : [window.navigator.language]

  for (const candidate of candidates) {
    const normalized = normalizeLocale(candidate)
    if (normalized) return normalized
  }

  return 'th'
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('th')
  const [systemLocale, setSystemLocale] = useState<Locale>('th')
  const [preferenceMode, setPreferenceMode] = useState<LocalePreferenceMode>('system')

  useEffect(() => {
    if (typeof window === 'undefined') return

    const detected = detectSystemLocale()
    setSystemLocale(detected)

    const savedMode = localStorage.getItem(LOCALE_MODE_STORAGE_KEY)
    const savedLocale = localStorage.getItem(LOCALE_STORAGE_KEY)

    if (savedMode === 'manual' && isSupportedLocale(savedLocale)) {
      setPreferenceMode('manual')
      setLocaleState(savedLocale)
      return
    }

    setPreferenceMode('system')
    setLocaleState(detected)

    const handleLanguageChange = () => {
      const nextDetected = detectSystemLocale()
      setSystemLocale(nextDetected)

      const currentMode = localStorage.getItem(LOCALE_MODE_STORAGE_KEY)
      if (currentMode !== 'manual') {
        setPreferenceMode('system')
        setLocaleState(nextDetected)
      }
    }

    window.addEventListener('languagechange', handleLanguageChange)
    return () => window.removeEventListener('languagechange', handleLanguageChange)
  }, [])

  const setLocale = (l: Locale) => {
    setLocaleState(l)
    setPreferenceMode('manual')
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, l)
      localStorage.setItem(LOCALE_MODE_STORAGE_KEY, 'manual')
    } catch {}
  }

  const resetLocaleToSystem = () => {
    const detected = detectSystemLocale()
    setSystemLocale(detected)
    setLocaleState(detected)
    setPreferenceMode('system')
    try {
      localStorage.removeItem(LOCALE_STORAGE_KEY)
      localStorage.setItem(LOCALE_MODE_STORAGE_KEY, 'system')
    } catch {}
  }

  const dict = dictionaries[locale]
  const t = useMemo(() => (key: string) => dict[key] ?? dictionaries['th'][key] ?? key, [dict])

  const value = useMemo(() => ({ locale, setLocale, resetLocaleToSystem, systemLocale, preferenceMode, t, copy: dict }), [locale, preferenceMode, systemLocale, t, dict])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
